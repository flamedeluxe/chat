const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Route handler for POST /api/messages
app.post('/api/messages', (req, res) => {
    try {
        console.log('Received POST request:', req.body);
        
        if (!req.body.userId) {
            console.error('No userId provided in message');
            return res.status(400).json({ error: 'userId is required' });
        }

        const message = {
            id: req.body.id,
            userId: req.body.userId, // Сохраняем оригинальный userId
            content: req.body.content,
            type: req.body.type,
            timestamp: req.body.timestamp,
            files: req.body.files || [],
            isConsultant: req.body.isConsultant || false // Сохраняем флаг isConsultant из запроса
        };

        // Отправляем сообщение только конкретному пользователю
        const targetUserId = req.body.userId;
        console.log(`Looking for client with userId: ${targetUserId}`);
        
        let sentCount = 0;
        global.wss.clients.forEach(client => {
            try {
                console.log(`Checking client: ${client.userId} (state: ${client.readyState})`);
                
                if (client.readyState === 1 && client.userId === targetUserId) { // WebSocket.OPEN
                    console.log(`Sending message to client: ${client.userId}`);
                    client.send(JSON.stringify({
                        type: 'new_message',
                        message: message
                    }));
                    sentCount++;
                    console.log(`Message sent successfully to ${client.userId}`);
                }
            } catch (error) {
                console.error(`Error processing client ${client.userId}:`, error);
            }
        });
        console.log(`Message sent to ${sentCount} matching clients`);

        res.json({ success: true });
    } catch (error) {
        console.error('Error handling message:', error);
        res.status(400).json({ error: error.message });
    }
});

// Export app instance
module.exports = app; 