(function() {
    document.addEventListener('DOMContentLoaded', function() {
        // Add Font Awesome and Tailwind CSS
        const fontAwesome = document.createElement('link');
        fontAwesome.rel = 'stylesheet';
        fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
        document.head.appendChild(fontAwesome);

        const tailwind = document.createElement('script');
        tailwind.src = 'https://cdn.tailwindcss.com';
        document.head.appendChild(tailwind);

        // Определяем URL для WebSocket в зависимости от окружения
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}`;
        
        // Generate unique user ID
        const userId = 'user_' + Math.random().toString(36).substr(2, 9);
        
        // Create widget HTML
        const widgetHTML = `
            <div id="chat-widget" class="chat-widget">
                <div class="chat-widget-header">
                    <span class="chat-widget-title">Онлайн-консультант</span>
                    <button class="chat-widget-toggle">×</button>
                </div>
                <div class="chat-widget-messages"></div>
                <div class="chat-widget-input">
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
                        Запись... <span class="recording-time">00:00</span>
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
                        <textarea placeholder="Введите сообщение..."></textarea>
                        <button class="chat-widget-send">Отправить</button>
                    </div>
                </div>
            </div>
            <button class="chat-widget-button">
                <span class="chat-widget-button-icon">💬</span>
            </button>
        `;

        // Create and inject styles
        const styles = document.createElement('style');
        styles.textContent = `
            .chat-widget {
                position: fixed;
                bottom: 100px;
                right: 20px;
                width: 350px;
                height: 500px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.15);
                display: flex;
                flex-direction: column;
                z-index: 1000;
                display: none;
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

            .chat-widget-title {
                font-weight: bold;
            }

            .chat-widget-toggle {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
            }

            .chat-widget-messages {
                flex: 1;
                padding: 15px;
                overflow-y: auto;
            }

            .chat-widget-input {
                padding: 15px;
                border-top: 1px solid #eee;
                display: flex;
                flex-direction: column;
                gap: 10px;
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

            .chat-widget-input-container {
                display: flex;
                gap: 10px;
            }

            .chat-widget-input textarea {
                flex: 1;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                resize: none;
                height: 40px;
            }

            .chat-widget-send {
                padding: 8px 15px;
                background: #4f46e5;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }

            .chat-widget-button {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                border-radius: 30px;
                background: #4f46e5;
                color: white;
                border: none;
                cursor: pointer;
                box-shadow: 0 5px 20px rgba(0,0,0,0.15);
                z-index: 1000;
            }

            .chat-widget-button-icon {
                font-size: 24px;
            }

            .message {
                margin-bottom: 10px;
                max-width: 80%;
                padding: 8px 12px;
                border-radius: 15px;
                word-wrap: break-word;
            }

            .message.user {
                background: #e3f2fd;
                color: #1e3a8a;
                margin-left: auto;
                border-bottom-right-radius: 5px;
            }

            .message.system {
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

        // Inject HTML and styles
        document.head.appendChild(styles);
        const container = document.createElement('div');
        container.innerHTML = widgetHTML;
        document.body.appendChild(container);

        // Get DOM elements
        const widget = document.querySelector('.chat-widget');
        const button = document.querySelector('.chat-widget-button');
        const toggle = document.querySelector('.chat-widget-toggle');
        const messagesContainer = document.querySelector('.chat-widget-messages');
        const textarea = document.querySelector('.chat-widget-input textarea');
        const sendButton = document.querySelector('.chat-widget-send');
        const fileButton = document.querySelector('#chat-widget-file');
        const fileInput = fileButton.querySelector('input[type="file"]');
        const voiceButton = document.querySelector('#chat-widget-voice');
        const stopRecordingButton = document.querySelector('#chat-widget-stop-recording');
        const recordingIndicator = document.querySelector('.recording-indicator');
        const filePreview = document.querySelector('.file-preview');
        const fileNameElement = filePreview.querySelector('.file-name');
        const removeFileButton = document.querySelector('#chat-widget-remove-file');

        let isRecording = false;
        let mediaRecorder = null;
        let audioChunks = [];
        let selectedFiles = [];

        // Initialize WebSocket connection
        const ws = new WebSocket(`${wsUrl}?userId=${userId}`);

        ws.onopen = () => {
            console.log('WebSocket connected');
            // Update connection status
            const statusElement = document.getElementById('connection-status');
            if (statusElement) {
                statusElement.textContent = '✅ Подключено';
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            // Update connection status
            const statusElement = document.getElementById('connection-status');
            if (statusElement) {
                statusElement.textContent = '❌ Отключено';
            }
        };

        // Toggle widget visibility
        button.addEventListener('click', () => {
            widget.style.display = 'flex';
            button.style.display = 'none';
        });

        toggle.addEventListener('click', () => {
            widget.style.display = 'none';
            button.style.display = 'block';
        });

        // File upload handling
        fileButton.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileSelect);
        removeFileButton.addEventListener('click', () => {
            selectedFiles = [];
            updateFilePreview();
        });

        // Voice recording handling
        voiceButton.addEventListener('click', startRecording);
        stopRecordingButton.addEventListener('click', stopRecording);

        // Send message function
        function sendMessage() {
            const content = textarea.value.trim();
            if (!content && selectedFiles.length === 0) return;

            // Create message object
            const message = {
                id: Date.now().toString(),
                userId,
                content,
                type: 'text',
                files: [],
                timestamp: new Date().toISOString()
            };

            // Add message to chat immediately
            addMessage(message, false);

            // Clear input
            textarea.value = '';

            // Send to server
            fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(message)
            });
        }

        // Add message to chat
        function addMessage(message, isSystem = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${isSystem ? 'system' : 'user'}`;
            
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
            
            messageDiv.innerHTML = content;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // File handling functions
        function handleFileSelect(event) {
            const files = Array.from(event.target.files);
            files.forEach(file => {
                selectedFiles.push({
                    type: file.type,
                    name: file.name,
                    data: file,
                    url: URL.createObjectURL(file)
                });
            });
            updateFilePreview();
            event.target.value = '';
        }

        function updateFilePreview() {
            if (selectedFiles.length > 0) {
                const fileNames = selectedFiles.map(f => f.name).join(', ');
                fileNameElement.textContent = fileNames;
                filePreview.classList.add('active');
            } else {
                filePreview.classList.remove('active');
            }
        }

        // Voice recording functions
        async function startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };
                
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    selectedFiles.push({
                        type: 'audio/wav',
                        name: 'Голосовое сообщение.wav',
                        data: audioBlob,
                        url: URL.createObjectURL(audioBlob)
                    });
                    updateFilePreview();
                    isRecording = false;
                    updateRecordingUI();
                };
                
                mediaRecorder.start();
                isRecording = true;
                updateRecordingUI();
                startRecordingTimer();
            } catch (error) {
                console.error('Error accessing microphone:', error);
                alert('Не удалось получить доступ к микрофону. Проверьте разрешения.');
            }
        }

        function stopRecording() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
        }

        function updateRecordingUI() {
            recordingIndicator.classList.toggle('active', isRecording);
        }

        function startRecordingTimer() {
            if (!isRecording) return;
            
            let seconds = 0;
            const timerElement = recordingIndicator.querySelector('.recording-time');
            
            const updateTimer = () => {
                if (!isRecording) return;
                seconds++;
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
                setTimeout(updateTimer, 1000);
            };
            
            updateTimer();
        }

        // Event listeners
        sendButton.addEventListener('click', sendMessage);
        textarea.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // WebSocket message handler
        ws.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'new_message') {
                addMessage(data.message, true);
            }
        });
    });
})(); 