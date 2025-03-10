(function() {
    document.addEventListener('DOMContentLoaded', function() {
        // Add Font Awesome
        const fontAwesome = document.createElement('link');
        fontAwesome.rel = 'stylesheet';
        fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
        document.head.appendChild(fontAwesome);

        // Определяем URL для WebSocket в зависимости от окружения
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}`;
        
        // Generate unique user ID
        const userId = 'user_' + Math.random().toString(36).substr(2, 9);
        
        // Create widget HTML
        const widgetHTML = `
            <div id="chat-widget" class="cw-widget">
                <div class="cw-header">
                    <span class="cw-title">Онлайн-консультант</span>
                    <button class="cw-toggle">×</button>
                </div>
                <div class="cw-messages"></div>
                <div class="cw-input">
                    <div class="cw-tools">
                        <button class="cw-tool-btn" id="chat-widget-file">
                            <i class="fas fa-paperclip"></i>
                            <input type="file" hidden multiple>
                        </button>
                        <button class="cw-tool-btn" id="chat-widget-voice">
                            <i class="fas fa-microphone"></i>
                        </button>
                    </div>
                    <div class="cw-recording-indicator">
                        Запись... <span class="cw-recording-time">00:00</span>
                        <button class="cw-tool-btn" id="chat-widget-stop-recording">
                            <i class="fas fa-stop"></i>
                        </button>
                    </div>
                    <div class="cw-file-preview">
                        <span class="cw-file-name"></span>
                        <button class="cw-tool-btn" id="chat-widget-remove-file">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="cw-input-container">
                        <textarea placeholder="Введите сообщение..."></textarea>
                        <button class="cw-send">Отправить</button>
                    </div>
                </div>
            </div>
            <button class="cw-button">
                <span class="cw-button-icon">
                    <i class="fas fa-comments"></i>
                </span>
            </button>
        `;

        // Create and inject styles
        const styles = document.createElement('style');
        styles.textContent = `
            .cw-widget {
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
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }

            .cw-header {
                padding: 15px;
                background: #4f46e5;
                color: white;
                border-radius: 10px 10px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .cw-title {
                font-weight: 600;
                font-size: 16px;
            }

            .cw-toggle {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }

            .cw-messages {
                flex: 1;
                padding: 15px;
                overflow-y: auto;
                background: #f9fafb;
            }

            .cw-input {
                padding: 15px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                flex-direction: column;
                gap: 10px;
                background: white;
            }

            .cw-tools {
                display: flex;
                gap: 10px;
            }

            .cw-tool-btn {
                padding: 8px;
                background: none;
                border: none;
                cursor: pointer;
                color: #6b7280;
                border-radius: 4px;
                transition: background-color 0.2s;
            }

            .cw-tool-btn:hover {
                background-color: #f3f4f6;
            }

            .cw-input-container {
                display: flex;
                gap: 10px;
            }

            .cw-input textarea {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                resize: none;
                height: 40px;
                font-size: 14px;
                line-height: 1.5;
                transition: border-color 0.2s;
            }

            .cw-input textarea:focus {
                outline: none;
                border-color: #4f46e5;
            }

            .cw-send {
                padding: 8px 16px;
                background: #4f46e5;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: background-color 0.2s;
            }

            .cw-send:hover {
                background: #4338ca;
            }

            .cw-button {
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
                transition: transform 0.2s, background-color 0.2s;
            }

            .cw-button:hover {
                transform: scale(1.05);
                background: #4338ca;
            }

            .cw-button-icon {
                font-size: 24px;
            }

            .cw-message {
                margin-bottom: 10px;
                max-width: 80%;
                padding: 8px 12px;
                border-radius: 15px;
                word-wrap: break-word;
                font-size: 14px;
                line-height: 1.5;
            }

            .cw-message.user {
                background: #e3f2fd;
                color: #1e3a8a;
                margin-left: auto;
                border-bottom-right-radius: 5px;
            }

            .cw-message.system {
                background: #f3f4f6;
                color: #1f2937;
                margin-right: auto;
                border-bottom-left-radius: 5px;
            }

            .cw-message-timestamp {
                font-size: 12px;
                color: #6b7280;
                margin-top: 4px;
            }

            .cw-recording-indicator {
                display: none;
                color: #ef4444;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                padding: 8px;
                background: #fee2e2;
                border-radius: 6px;
            }

            .cw-recording-indicator.active {
                display: flex;
            }

            .cw-file-preview {
                display: none;
                align-items: center;
                gap: 8px;
                padding: 8px;
                background: #f3f4f6;
                border-radius: 6px;
                font-size: 14px;
            }

            .cw-file-preview.active {
                display: flex;
            }

            .cw-audio-message {
                margin-top: 8px;
            }

            .cw-audio-message audio {
                width: 100%;
                max-width: 200px;
                height: 36px;
                border-radius: 4px;
            }

            .cw-file-message {
                margin-top: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
            }

            .cw-file-message a {
                color: #4f46e5;
                text-decoration: none;
                transition: color 0.2s;
            }

            .cw-file-message a:hover {
                color: #4338ca;
                text-decoration: underline;
            }
        `;

        // Inject HTML and styles
        document.head.appendChild(styles);
        const container = document.createElement('div');
        container.innerHTML = widgetHTML;
        document.body.appendChild(container);

        // Get DOM elements
        const widget = document.querySelector('.cw-widget');
        const button = document.querySelector('.cw-button');
        const toggle = document.querySelector('.cw-toggle');
        const messagesContainer = document.querySelector('.cw-messages');
        const textarea = document.querySelector('.cw-input textarea');
        const sendButton = document.querySelector('.cw-send');
        const fileButton = document.querySelector('#chat-widget-file');
        const fileInput = fileButton.querySelector('input[type="file"]');
        const voiceButton = document.querySelector('#chat-widget-voice');
        const stopRecordingButton = document.querySelector('#chat-widget-stop-recording');
        const recordingIndicator = document.querySelector('.cw-recording-indicator');
        const filePreview = document.querySelector('.cw-file-preview');
        const fileNameElement = filePreview.querySelector('.cw-file-name');
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
        async function sendMessage() {
            const content = textarea.value.trim();
            if (!content && selectedFiles.length === 0) return;

            try {
                // Upload files first if any
                let uploadedFiles = [];
                if (selectedFiles.length > 0) {
                    // Отправляем файлы напрямую через API
                    const uploadResponse = await fetch('/api/upload', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            files: selectedFiles.map(file => ({
                                name: file.name,
                                type: file.type,
                                data: file.data
                            }))
                        })
                    });

                    if (!uploadResponse.ok) {
                        throw new Error('Failed to upload files');
                    }

                    uploadedFiles = await uploadResponse.json();
                }

                // Create message object
                const message = {
                    id: Date.now().toString(),
                    userId: userId,
                    content,
                    type: 'text',
                    files: uploadedFiles,
                    timestamp: new Date().toISOString(),
                    isConsultant: false  // Явно указываем, что это сообщение от пользователя
                };

                // Clear input and files
                textarea.value = '';
                selectedFiles = [];
                updateFilePreview();

                // Send to server
                const response = await fetch('/api/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(message)
                });

                if (!response.ok) {
                    throw new Error('Failed to send message');
                }

            } catch (error) {
                console.error('Error sending message:', error);
                alert('Не удалось отправить сообщение. Пожалуйста, попробуйте снова.');
            }
        }

        // Add message to chat
        function addMessage(message, isSystem = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `cw-message ${isSystem ? 'system' : 'user'}`;
            
            let content = message.content;
            
            if (message.files && message.files.length > 0) {
                message.files.forEach(file => {
                    if (file.isAudio) {
                        content += `
                            <div class="cw-audio-message">
                                <audio controls src="${file.data}"></audio>
                            </div>
                        `;
                    } else {
                        content += `
                            <div class="cw-file-message">
                                <i class="fas fa-file"></i>
                                <a href="${file.data}" target="_blank">${file.name}</a>
                            </div>
                        `;
                    }
                });
            }
            
            const timestamp = new Date(message.timestamp).toLocaleTimeString();
            content += `<div class="cw-message-timestamp">${timestamp}</div>`;
            
            messageDiv.innerHTML = content;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // File handling functions
        function handleFileSelect(event) {
            const files = Array.from(event.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onloadend = () => {
                    selectedFiles.push({
                        type: file.type,
                        name: file.name,
                        data: reader.result, // base64 строка
                        isAudio: false
                    });
                    updateFilePreview();
                };
            });
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
                
                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    
                    // Конвертируем аудио в base64
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = () => {
                        selectedFiles.push({
                            type: 'audio/wav',
                            name: 'Голосовое сообщение.wav',
                            data: reader.result, // base64 строка
                            isAudio: true // флаг для определения аудио файла
                        });
                        updateFilePreview();
                        isRecording = false;
                        updateRecordingUI();
                    };
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
            const timerElement = recordingIndicator.querySelector('.cw-recording-time');
            
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
            console.log('Received WebSocket message:', data);
            
            if (data.type === 'new_message') {
                const message = data.message;
                console.log('Processing message:', message);
                console.log('Message isConsultant flag:', message.isConsultant);
                
                // Если сообщение от консультанта (isConsultant: true) - показываем как системное
                // Если от пользователя (isConsultant: false) - показываем как пользовательское
                addMessage(message, message.isConsultant === true);
            }
        });

        // Add new styles
        const additionalStyles = document.createElement('style');
        additionalStyles.textContent = `
            .cw-file-error {
                color: #ef4444;
                margin-left: 8px;
                cursor: pointer;
            }

            .cw-file-sending {
                color: #6b7280;
                margin-left: 8px;
            }

            .cw-file-message, .cw-audio-message {
                position: relative;
                display: flex;
                align-items: center;
            }
        `;
        document.head.appendChild(additionalStyles);
    });
})(); 