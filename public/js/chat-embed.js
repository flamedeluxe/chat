(function() {
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
                <textarea placeholder="Введите сообщение..."></textarea>
                <button class="chat-widget-send">Отправить</button>
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
            width: 300px;
            height: 400px;
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
            background: #2196F3;
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
            background: #2196F3;
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
            background: #2196F3;
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
            background: #E3F2FD;
            margin-left: auto;
            border-bottom-right-radius: 5px;
        }

        .message.system {
            background: #F5F5F5;
            margin-right: auto;
            border-bottom-left-radius: 5px;
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

    // Initialize WebSocket connection
    const ws = new WebSocket(`wss://${window.location.host}?userId=${userId}`);

    ws.onopen = () => {
        console.log('WebSocket connected');
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
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

    // Send message function
    function sendMessage() {
        const content = textarea.value.trim();
        if (!content) return;

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
        messageDiv.textContent = message.content;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
})(); 