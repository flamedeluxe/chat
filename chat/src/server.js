const app = require('./app');
const { WebSocketServer } = require('ws');
const http = require('http');

const port = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
global.wss = new WebSocketServer({ server });

// WebSocket connection handler
global.wss.on('connection', (ws, req) => {
    try {
        console.log('New WebSocket connection request:', req.url);
        
        // Получаем userId из URL запроса
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const userId = urlParams.get('userId');
        
        if (!userId) {
            console.error('No userId provided in WebSocket connection');
            ws.close();
            return;
        }
        
        console.log(`Client connected with userId: ${userId}`);

        // Сохраняем userId в объекте соединения
        ws.userId = userId;

        ws.on('close', () => {
            console.log(`Client disconnected: ${userId}`);
        });

        ws.on('error', (error) => {
            console.error(`WebSocket error for client ${userId}:`, error);
        });
    } catch (error) {
        console.error('Error in WebSocket connection handler:', error);
        ws.close();
    }
});

// Start server
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 