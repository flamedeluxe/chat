const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs').promises;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Определяем базовый путь
const basePath = process.env.BASE_PATH || '';

// Статические файлы с учетом базового пути
app.use(basePath, express.static('public'));
app.use(basePath + '/uploads', express.static('uploads'));

// Load responses
let responses = {};
fs.readFile('responses.json', 'utf8')
    .then(data => {
        responses = JSON.parse(data);
    })
    .catch(err => {
        console.error('Error loading responses:', err);
        // Fallback responses if file not found
        responses = {
            default: ["Спасибо за ваше сообщение! Мы обработаем его в ближайшее время."]
        };
    });

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/' + new Date().toISOString().split('T')[0];
        fs.mkdir(dir, { recursive: true })
            .then(() => cb(null, dir))
            .catch(err => cb(err));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// In-memory storage for messages
const messagesByClient = new Map(); // userId -> array of messages
const clients = new Map(); // userId -> WebSocket

// Find appropriate response based on message content
function findResponse(messageText) {
    console.log('Processing message text:', messageText);
    
    // Normalize message
    const normalizedMessage = messageText.toString().trim().toLowerCase();
    console.log('Normalized message:', normalizedMessage);
    
    // Check each category
    for (const [category, data] of Object.entries(responses)) {
        if (category === 'default') continue;
        
        if (!data.patterns || !Array.isArray(data.patterns)) {
            console.log(`Invalid patterns for category ${category}`);
            continue;
        }
        
        // Check if any pattern matches
        const matches = data.patterns.some(pattern => 
            normalizedMessage.includes(pattern.toLowerCase())
        );
        
        if (matches) {
            console.log(`Found match in category: ${category}`);
            const response = data.responses[Math.floor(Math.random() * data.responses.length)];
            console.log('Selected response:', response);
            return response;
        }
    }
    
    // If no matches found, return default response
    console.log('No matches found, using default response');
    return responses.default[Math.floor(Math.random() * responses.default.length)];
}

// Automatic response function
async function generateAutoResponse(message) {
    // Добавим задержку для имитации "обдумывания" ответа
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const responseText = findResponse(message.content || message);
    
    return {
        content: responseText,
        type: 'text',
        isAutoReply: true
    };
}

// REST API endpoints
app.post(basePath + '/api/messages', async (req, res) => {
    try {
        // Log incoming request
        console.log('Received message request:', req.body);
        
        const { userId, content, type } = req.body;
        
        // Validate required fields
        if (!userId || !content) {
            console.error('Missing required fields:', { userId, content });
            return res.status(400).json({ error: 'Missing required fields: userId and content are required' });
        }

        const message = {
            id: Date.now().toString(),
            userId,
            content,
            type: type || 'text',
            timestamp: new Date().toISOString(),
            files: req.body.files || []
        };
        
        console.log('Created message object:', message);

        // Store message in client's history
        if (!messagesByClient.has(userId)) {
            messagesByClient.set(userId, []);
        }
        messagesByClient.get(userId).push(message);

        try {
            // Generate and send auto-response
            const autoResponse = await generateAutoResponse(message.content);
            console.log('Generated auto-response:', autoResponse);

            const responseMessage = {
                id: Date.now().toString() + '_auto',
                userId: 'system',
                ...autoResponse,
                timestamp: new Date().toISOString(),
                files: []
            };

            messagesByClient.get(userId).push(responseMessage);

            // Send auto-response to client via WebSocket
            const clientWs = clients.get(userId);
            if (clientWs && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                    type: 'new_message',
                    message: responseMessage
                }));
            }

            res.status(201).json(message);
        } catch (autoResponseError) {
            console.error('Error generating auto-response:', autoResponseError);
            // Still return success for the original message even if auto-response fails
            res.status(201).json(message);
        }
    } catch (error) {
        console.error('Error processing message:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to process message',
            details: error.message 
        });
    }
});

app.post(basePath + '/api/upload', upload.array('files'), async (req, res) => {
    try {
        const files = req.files.map(file => ({
            id: Date.now().toString(),
            name: file.originalname,
            type: file.mimetype,
            url: `/uploads/${file.filename}`,
            size: file.size
        }));

        res.status(201).json(files);
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});

app.get(basePath + '/api/messages/:userId', (req, res) => {
    const { userId } = req.params;
    const { limit = 50, before } = req.query;
    
    let userMessages = messagesByClient.get(userId) || [];
    
    if (before) {
        userMessages = userMessages.filter(msg => new Date(msg.timestamp) < new Date(before));
    }
    
    userMessages = userMessages.slice(-limit);
    
    res.json(userMessages);
});

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const params = new URLSearchParams(url.search);
    const userId = params.get('userId');
    
    ws.userId = userId;
    clients.set(userId, ws);
    console.log('Client connected:', userId);

    // Handle client disconnection
    ws.on('close', () => {
        clients.delete(ws.userId);
        console.log('Client disconnected:', ws.userId);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} with base path: ${basePath}`);
}); 