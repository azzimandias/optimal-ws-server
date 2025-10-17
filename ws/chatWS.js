// app.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
const express = require('express');
const http = require('http');
const {WebSocketServer} = require('ws');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5003;

app.use(express.json());

// Middleware логирования
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
    next();
});

// Веб-интерфейс логов
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>WS Server</title></head>
<body>
<h2>📡 WebSocket Server</h2>
<div>Port: ${PORT}</div>
<div id="status">Status: <span id="statusText">Connecting...</span></div>
<script>
const statusText = document.getElementById('statusText');
try {
  const ws = new WebSocket('ws://' + location.host);
  ws.onopen = () => statusText.textContent = 'Connected ✅';
  ws.onclose = () => statusText.textContent = 'Disconnected ❌';
  ws.onerror = () => statusText.textContent = 'Error ❌';
} catch(e) {
  statusText.textContent = 'Failed to connect';
}
</script>
</body>
</html>`);
});

// Создаём единый HTTP сервер
const server = http.createServer(app);

// Создаём ЕДИНСТВЕННЫЙ WebSocket сервер
const wss = new WebSocketServer({
    server,
    // Добавляем проверку origin если нужно
    // verifyClient: (info) => { /* проверка origin */ return true; }
});

// Общая метрика подключённых клиентов
let connectedClients = 0;

// ОБРАБОТЧИК ЕДИНОГО WebSocket СЕРВЕРА
wss.on('connection', (ws, req) => {
    connectedClients++;
    const clientId = Math.random().toString(36).substr(2, 9);
    console.log(`[WS] Client ${clientId} connected, total: ${connectedClients}`);

    // Инициализируем свойства соединения
    ws.clientId = clientId;
    ws.isAlive = true;
    ws.subscriptions = new Set(); // для подписок на чаты

    // Heartbeat
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    // ОБРАБОТКА СООБЩЕНИЙ ОТ КЛИЕНТА
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log(`[WS ${clientId}] Received:`, message);

            // РОУТИНГ СООБЩЕНИЙ ПО ТИПАМ
            await handleWebSocketMessage(ws, message, req);

        } catch (err) {
            console.error(`[WS ${clientId}] Parse error:`, err.message);
            sendError(ws, 'Invalid JSON format');
        }
    });

    ws.on('close', () => {
        connectedClients--;
        console.log(`[WS ${clientId}] disconnected, total: ${connectedClients}`);
    });

    ws.on('error', (err) => {
        console.error(`[WS ${clientId}] error:`, err.message);
    });

    // Отправляем приветственное сообщение
    ws.send(JSON.stringify({
        type: 'connection_established',
        clientId,
        message: 'Connected to WebSocket server'
    }));
});

// Heartbeat интервал
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log(`[WS ${ws.clientId}] Terminating dead connection`);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(interval);
});

// ФУНКЦИЯ ОБРАБОТКИ СООБЩЕНИЙ
async function handleWebSocketMessage(ws, message, req) {
    const {type, chatId, text, ...restProps} = message;

    switch (type) {
        case 'subscribe':
            // Подписка на чат
            ws.subscriptions.add(chatId);
            console.log(`[WS ${ws.clientId}] Subscribed to chat: ${chatId}`);
            ws.send(JSON.stringify({
                type: 'subscribed',
                chatId,
                message: `Subscribed to chat ${chatId}`
            }));
            break;

        case 'unsubscribe':
            // Отписка от чата
            ws.subscriptions.delete(chatId);
            console.log(`[WS ${ws.clientId}] Unsubscribed from chat: ${chatId}`);
            break;

        case 'chat_message':
            // Обработка сообщения чата
            await handleChatMessage(ws, message);
            break;

        case 'get_history':
            // Получение истории сообщений
            await handleGetHistory(ws, message);
            break;

        case 'mark_as_read':
            // Отметка сообщения как прочитанного
            await handleMarkAsRead(ws, message);
            break;

        case 'test':
            // Тестовое сообщение
            ws.send(JSON.stringify({
                type: 'test_response',
                message: 'Test received successfully',
                yourMessage: message
            }));
            break;

        default:
            console.log(`[WS ${ws.clientId}] Unknown message type: ${type}`);
            sendError(ws, `Unknown message type: ${type}`);
    }
}

// ОБРАБОТКА СООБЩЕНИЙ ЧАТА
async function handleChatMessage(ws, message) {
    const {chatId, text, files = []} = message;

    if (!chatId || !text) {
        return sendError(ws, 'chatId and text are required');
    }

    console.log(`[CHAT] Message in chat ${chatId}: ${text}`);

    // TODO: Здесь позже добавим вызов Laravel API для сохранения сообщения

    // Создаём объект сообщения для рассылки
    const chatMessage = {
        type: 'new_message',
        message: {
            id: Date.now(), // временный ID, потом заменим на ID из Laravel
            chat_id: parseInt(chatId),
            from: {id: 46, name: 'Александр', surname: 'Кошелев'}, // TODO: брать из аутентификации
            to: {id: parseInt(chatId)}, // TODO: уточнить логику
            text,
            files,
            status: false,
            created_at: Math.floor(Date.now() / 1000),
            updated_at: Math.floor(Date.now() / 1000)
        }
    };

    // Рассылаем всем подписанным на этот чат клиентам
    wss.clients.forEach((client) => {
        if (
            client.readyState === client.OPEN &&
            client.subscriptions &&
            client.subscriptions.has(chatId)
        ) {
            client.send(JSON.stringify(chatMessage));
        }
    });

    // Подтверждение отправителю
    ws.send(JSON.stringify({
        type: 'message_sent',
        message: 'Message delivered to chat'
    }));
}

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function sendError(ws, message) {
    ws.send(JSON.stringify({
        type: 'error',
        message
    }));
}

async function handleGetHistory(ws, message) {
    // TODO: Реализовать получение истории из Laravel
    ws.send(JSON.stringify({
        type: 'history',
        messages: [] // пока пустой массив
    }));
}

async function handleMarkAsRead(ws, message) {
    // TODO: Реализовать отметку прочитанного в Laravel
    ws.send(JSON.stringify({
        type: 'marked_as_read',
        sms_id: message.sms_id
    }));
}

// Запуск сервера
server.listen(PORT, () => {
    console.log(`✅ Unified HTTP + WS server started on port ${PORT}`);
    console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
});