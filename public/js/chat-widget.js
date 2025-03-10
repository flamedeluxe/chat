class ChatWidget {
    constructor(options = {}) {
        this.options = {
            websocketUrl: options.websocketUrl || 'ws://' + window.location.host,
            apiUrl: options.apiUrl || window.location.origin,
            position: options.position || 'bottom-right',
            theme: options.theme || 'light',
            userId: options.userId || 'user_' + Math.random().toString(36).substr(2, 9),
            roomId: options.roomId || 'default',
            ...options
        };
        
        this.isOpen = false;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.ws = null;
        this.selectedFiles = [];
        this.eventListeners = new Map();
        
        this.init();
    }

    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        const listeners = this.eventListeners.get(event) || [];
        listeners.forEach(callback => callback(data));
    }

    async init() {
        // Create and inject styles
        this.injectStyles();
        
        // Create and inject HTML
        this.createWidget();
        
        // Initialize WebSocket
        this.initializeWebSocket();
        
        // Initialize event listeners
        this.initializeEventListeners();

        // Load existing messages
        await this.loadMessages();
    }

    injectStyles() {
        const styles = `
            .chat-widget-container {
                position: fixed;
                ${this.options.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
                ${this.options.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
                z-index: 9999;
                display: flex;
                flex-direction: column;
                font-family: Arial, sans-serif;
            }

            .chat-widget-button {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background-color: #4f46e5;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                align-self: flex-end;
            }

            .chat-widget-window {
                display: none;
                width: 350px;
                height: 500px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                margin-bottom: 10px;
                flex-direction: column;
            }

            .chat-widget-window.open {
                display: flex;
            }

            .chat-widget-header {
                padding: 15px;
                background: #4f46e5;
                color: white;
                border-radius: 10px 10px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .chat-widget-messages {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
            }

            .chat-widget-input-area {
                padding: 15px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .chat-widget-input-container {
                display: flex;
                gap: 10px;
            }

            .chat-widget-input {
                flex: 1;
                padding: 8px;
                border: 1px solid #e5e7eb;
                border-radius: 5px;
                outline: none;
            }

            .chat-widget-send-btn {
                padding: 8px 15px;
                background: #4f46e5;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            }

            .chat-widget-tools {
                display: flex;
                gap: 10px;
            }

            .chat-widget-tool-btn {
                padding: 8px;
                background: none;
                border: none;
                cursor: pointer;
                color: #6b7280;
            }

            .message-bubble {
                max-width: 70%;
                padding: 10px;
                margin: 5px 0;
                border-radius: 10px;
                word-break: break-word;
            }

            .message-bubble.sent {
                background: #e3f2fd;
                color: #1e3a8a;
                margin-left: auto;
                border-bottom-right-radius: 5px;
            }

            .message-bubble.received {
                background: #f3f4f6;
                color: #1f2937;
                margin-right: auto;
                border-bottom-left-radius: 5px;
            }

            .message-timestamp {
                font-size: 0.75rem;
                color: #6b7280;
                margin-top: 4px;
            }

            .recording-indicator {
                display: none;
                color: #ef4444;
                align-items: center;
                gap: 5px;
            }

            .recording-indicator.active {
                display: flex;
            }

            .file-preview {
                display: none;
                align-items: center;
                gap: 5px;
                padding: 5px;
                background: #f3f4f6;
                border-radius: 5px;
            }

            .file-preview.active {
                display: flex;
            }

            .audio-message {
                margin-top: 8px;
            }

            .audio-message audio {
                width: 100%;
                max-width: 200px;
            }

            .file-message {
                margin-top: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .file-message a {
                color: #4f46e5;
                text-decoration: none;
            }

            .file-message a:hover {
                text-decoration: underline;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    createWidget() {
        const container = document.createElement('div');
        container.className = 'chat-widget-container';
        
        container.innerHTML = `
            <div class="chat-widget-window">
                <div class="chat-widget-header">
                    <span>Support Chat</span>
                    <span id="chat-widget-status">Connecting...</span>
                </div>
                <div class="chat-widget-messages"></div>
                <div class="chat-widget-input-area">
                    <div class="chat-widget-tools">
                        <button class="chat-widget-tool-btn" id="chat-widget-file">
                            <i class="fas fa-paperclip"></i>
                            <input type="file" hidden multiple>
                        </button>
                        <button class="chat-widget-tool-btn" id="chat-widget-voice">
                            <i class="fas fa-microphone"></i>
                        </button>
                    </div>
                    <div class="recording-indicator">
                        Recording... <span class="recording-time">00:00</span>
                        <button class="chat-widget-tool-btn" id="chat-widget-stop-recording">
                            <i class="fas fa-stop"></i>
                        </button>
                    </div>
                    <div class="file-preview">
                        <span class="file-name"></span>
                        <button class="chat-widget-tool-btn" id="chat-widget-remove-file">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="chat-widget-input-container">
                        <input type="text" class="chat-widget-input" placeholder="Type your message...">
                        <button class="chat-widget-send-btn">Send</button>
                    </div>
                </div>
            </div>
            <div class="chat-widget-button">
                <i class="fas fa-comments"></i>
            </div>
        `;

        document.body.appendChild(container);
        this.container = container;
    }

    initializeWebSocket() {
        const wsUrl = `${this.options.websocketUrl}?userId=${this.options.userId}&roomId=${this.options.roomId}`;
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            this.updateStatus('Connected');
            this.emit('connected');
        };
        
        this.ws.onclose = () => {
            this.updateStatus('Disconnected');
            this.emit('disconnected');
            setTimeout(() => this.initializeWebSocket(), 5000);
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'new_message') {
                this.addMessage(data.message);
                this.emit('message', data.message);
            }
        };
    }

    initializeEventListeners() {
        // Toggle chat window
        this.container.querySelector('.chat-widget-button').addEventListener('click', () => {
            this.toggleChat();
        });

        // Send message
        const sendBtn = this.container.querySelector('.chat-widget-send-btn');
        const input = this.container.querySelector('.chat-widget-input');
        
        sendBtn.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // File upload
        const fileBtn = this.container.querySelector('#chat-widget-file');
        const fileInput = fileBtn.querySelector('input[type="file"]');
        
        fileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Voice recording
        const voiceBtn = this.container.querySelector('#chat-widget-voice');
        const stopRecordingBtn = this.container.querySelector('#chat-widget-stop-recording');
        
        voiceBtn.addEventListener('click', () => this.startRecording());
        stopRecordingBtn.addEventListener('click', () => this.stopRecording());

        // Remove file
        this.container.querySelector('#chat-widget-remove-file').addEventListener('click', () => {
            this.selectedFiles = [];
            this.updateFilePreview();
        });
    }

    toggleChat() {
        const window = this.container.querySelector('.chat-widget-window');
        this.isOpen = !this.isOpen;
        window.classList.toggle('open', this.isOpen);
    }

    updateStatus(status) {
        const statusElement = this.container.querySelector('#chat-widget-status');
        statusElement.textContent = status;
    }

    async sendMessage() {
        const input = this.container.querySelector('.chat-widget-input');
        const text = input.value.trim();

        if (text || this.selectedFiles.length > 0) {
            try {
                // Upload files first if any
                let uploadedFiles = [];
                if (this.selectedFiles.length > 0) {
                    uploadedFiles = await this.uploadFiles(this.selectedFiles);
                }

                // Create message
                const messageData = {
                    id: Date.now().toString(),
                    userId: this.options.userId,
                    content: text,
                    type: 'text',
                    files: uploadedFiles,
                    timestamp: new Date().toISOString()
                };

                // Показываем сообщение пользователя сразу
                this.addMessage(messageData, false);
                
                // Очищаем ввод сразу после отображения
                input.value = '';
                this.selectedFiles = [];
                this.updateFilePreview();

                // Send to API
                const response = await fetch(`${this.options.apiUrl}/api/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(messageData)
                });

                if (!response.ok) {
                    throw new Error('Failed to send message');
                }

            } catch (error) {
                console.error('Error sending message:', error);
                alert('Failed to send message. Please try again.');
            }
        }
    }

    async uploadFiles(files) {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file.data);
        });

        try {
            const response = await fetch(`${this.options.apiUrl}/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload files');
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading files:', error);
            throw error;
        }
    }

    async loadMessages() {
        try {
            const response = await fetch(`${this.options.apiUrl}/api/messages/${this.options.roomId}`);
            const messages = await response.json();
            
            const messagesContainer = this.container.querySelector('.chat-widget-messages');
            messagesContainer.innerHTML = '';
            
            messages.forEach(message => {
                this.addMessage(message, true);
            });
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    addMessage(message, isSystem = false) {
        const messagesContainer = this.container.querySelector('.chat-widget-messages');
        const messageElement = document.createElement('div');
        messageElement.className = `message-bubble ${isSystem ? 'received' : 'sent'}`;
        
        let content = message.content;
        
        if (message.files && message.files.length > 0) {
            message.files.forEach(file => {
                if (file.type.startsWith('audio/')) {
                    content += `
                        <div class="audio-message">
                            <audio controls src="${file.url}"></audio>
                        </div>
                    `;
                } else {
                    content += `
                        <div class="file-message">
                            <i class="fas fa-file"></i>
                            <a href="${file.url}" target="_blank">${file.name}</a>
                        </div>
                    `;
                }
            });
        }
        
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        content += `<div class="message-timestamp">${timestamp}</div>`;
        
        messageElement.innerHTML = content;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                this.selectedFiles.push({
                    type: 'audio/wav',
                    name: 'Voice Message.wav',
                    data: audioBlob,
                    url: URL.createObjectURL(audioBlob)
                });
                this.updateFilePreview();
                this.isRecording = false;
                this.updateRecordingUI();
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateRecordingUI();
            this.startRecordingTimer();
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }

    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        files.forEach(file => {
            this.selectedFiles.push({
                type: file.type,
                name: file.name,
                data: file,
                url: URL.createObjectURL(file)
            });
        });
        this.updateFilePreview();
        event.target.value = '';
    }

    updateFilePreview() {
        const preview = this.container.querySelector('.file-preview');
        const fileNameElement = preview.querySelector('.file-name');
        
        if (this.selectedFiles.length > 0) {
            const fileNames = this.selectedFiles.map(f => f.name).join(', ');
            fileNameElement.textContent = fileNames;
            preview.classList.add('active');
        } else {
            preview.classList.remove('active');
        }
    }

    updateRecordingUI() {
        const indicator = this.container.querySelector('.recording-indicator');
        indicator.classList.toggle('active', this.isRecording);
    }

    startRecordingTimer() {
        if (!this.isRecording) return;
        
        let seconds = 0;
        const timerElement = this.container.querySelector('.recording-time');
        
        const updateTimer = () => {
            if (!this.isRecording) return;
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            setTimeout(updateTimer, 1000);
        };
        
        updateTimer();
    }
}

// Expose the widget to the global scope
window.ChatWidget = ChatWidget; 