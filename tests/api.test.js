const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { Message } = require('../src/models');
const fs = require('fs');
const path = require('path');

describe('Chat API Tests', () => {
    const testUserId = 'user_3djpktt5a';
    const testMessage = {
        id: 'test_message_1',
        userId: testUserId,
        content: 'Тестовое сообщение',
        type: 'text',
        files: [],
        timestamp: new Date().toISOString()
    };

    beforeAll(async () => {
        // Подключаемся к тестовой базе данных
        await mongoose.connect('mongodb://localhost:27017/chat_test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    });

    afterAll(async () => {
        // Закрываем соединение с базой данных
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        // Очищаем базу данных перед каждым тестом
        await Message.deleteMany({});
    }, 10000); // Увеличиваем таймаут до 10 секунд

    describe('POST /api/messages', () => {
        it('should create a new message', async () => {
            const response = await request(app)
                .post('/api/messages')
                .send(testMessage)
                .expect(200);

            expect(response.body).toHaveProperty('id', testMessage.id);
            expect(response.body).toHaveProperty('userId', testUserId);
            expect(response.body).toHaveProperty('content', testMessage.content);
        }, 10000);

        it('should return 400 for invalid message data', async () => {
            const invalidMessage = {
                // Отсутствует обязательное поле content
                userId: testUserId,
                type: 'text'
            };

            await request(app)
                .post('/api/messages')
                .send(invalidMessage)
                .expect(400);
        }, 10000);
    });

    describe('GET /api/messages', () => {
        it('should return all messages', async () => {
            // Создаем тестовое сообщение
            await Message.create(testMessage);

            const response = await request(app)
                .get('/api/messages')
                .expect(200);

            expect(Array.isArray(response.body)).toBeTruthy();
            expect(response.body.length).toBe(1);
            expect(response.body[0]).toHaveProperty('id', testMessage.id);
        }, 10000);
    });

    describe('GET /api/messages/:userId', () => {
        it('should return messages for specific user', async () => {
            // Создаем тестовое сообщение
            await Message.create(testMessage);

            const response = await request(app)
                .get(`/api/messages/${testUserId}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBeTruthy();
            expect(response.body.length).toBe(1);
            expect(response.body[0]).toHaveProperty('userId', testUserId);
        }, 10000);

        it('should return empty array for non-existent user', async () => {
            const response = await request(app)
                .get('/api/messages/non_existent_user')
                .expect(200);

            expect(Array.isArray(response.body)).toBeTruthy();
            expect(response.body.length).toBe(0);
        }, 10000);
    });

    describe('POST /api/upload', () => {
        it('should upload a file', async () => {
            // Создаем тестовый файл
            const testFilePath = path.join(__dirname, 'test-file.txt');
            fs.writeFileSync(testFilePath, 'Test file content');

            const response = await request(app)
                .post('/api/upload')
                .attach('files', testFilePath)
                .expect(200);

            expect(Array.isArray(response.body)).toBeTruthy();
            expect(response.body.length).toBe(1);
            expect(response.body[0]).toHaveProperty('url');
            expect(response.body[0]).toHaveProperty('name', 'test-file.txt');

            // Удаляем тестовый файл
            fs.unlinkSync(testFilePath);
        }, 10000);

        it('should handle multiple file uploads', async () => {
            // Создаем тестовые файлы
            const testFile1 = path.join(__dirname, 'test-file-1.txt');
            const testFile2 = path.join(__dirname, 'test-file-2.txt');
            fs.writeFileSync(testFile1, 'Test file 1 content');
            fs.writeFileSync(testFile2, 'Test file 2 content');

            const response = await request(app)
                .post('/api/upload')
                .attach('files', testFile1)
                .attach('files', testFile2)
                .expect(200);

            expect(Array.isArray(response.body)).toBeTruthy();
            expect(response.body.length).toBe(2);
            expect(response.body[0]).toHaveProperty('url');
            expect(response.body[1]).toHaveProperty('url');

            // Удаляем тестовые файлы
            fs.unlinkSync(testFile1);
            fs.unlinkSync(testFile2);
        }, 10000);

        it('should return 400 for invalid file upload', async () => {
            await request(app)
                .post('/api/upload')
                .attach('files', Buffer.from('test'), {
                    filename: 'test.txt',
                    contentType: 'text/plain'
                })
                .expect(400);
        }, 10000);
    });

    describe('WebSocket Connection', () => {
        it('should connect with valid userId', (done) => {
            const WebSocket = require('ws');
            const ws = new WebSocket(`ws://localhost:3000?userId=${testUserId}`);

            ws.on('open', () => {
                expect(ws.readyState).toBe(WebSocket.OPEN);
                ws.close();
                done();
            });

            ws.on('error', (error) => {
                done(error);
            });
        }, 10000);

        it('should receive messages', (done) => {
            const WebSocket = require('ws');
            const ws = new WebSocket(`ws://localhost:3000?userId=${testUserId}`);

            ws.on('open', () => {
                // Отправляем тестовое сообщение через API
                request(app)
                    .post('/api/messages')
                    .send(testMessage)
                    .end((err) => {
                        if (err) done(err);
                    });
            });

            ws.on('message', (data) => {
                const message = JSON.parse(data);
                expect(message.type).toBe('new_message');
                expect(message.message).toHaveProperty('id', testMessage.id);
                ws.close();
                done();
            });

            ws.on('error', (error) => {
                done(error);
            });
        }, 10000);
    });
}); 