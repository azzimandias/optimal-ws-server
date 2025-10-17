// const express = require('express');
// const http = require('http');
// const { WebSocketServer } = require('ws');
// require('dotenv').config();
// const cors = require('cors');
// const { Server } = require('socket.io');
// const app = express();
// const PORT = process.env.PORT || 5003;

// const clientTokens = new Map();

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cors());
//Middleware логирования HTTP-запросов
// app.use((req, res, next) => {
//   console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
//   next();
// });

//Health check endpoint
// app.post('/health', (req, res) => {
//   res.json({
//     status: 'ok',
//     port: PORT,
//     timestamp: new Date().toISOString(),
//     service: 'BFF WebSocket Server',
//   });
// });

// const allowedOrigins = [
//   'http://192.168.1.16',
//   'http://192.168.1.14',
//   'http://localhost:8000',
//   'http://127.0.0.1:8000',
// ];

// const io = new Server(httpServer, {
//   cors: {
//     origin: allowedOrigins,
//     methods: ['GET', 'POST'],
//     credentials: true,
//   },
//   transports: ['websocket', 'polling'],
//   allowEIO3: true,
// });

//API Routes
// const apiRoutes = [
//   '/api/sms/new-sms',
//   '/api/send-new-sort-lists-count',
//   '/api/send-new-personal-lists-count',
//   '/api/send-new-personal-tags',
// ];

//Функция для получения CSRF токена из Laravel
// async function getCsrfToken() {
//   try {
//     const laravelBaseUrl = process.env.LARAVEL_URL || 'http://192.168.1.16';
//     const response = await fetch(laravelBaseUrl);
//     const html = await response.text();

//     // Ищем CSRF токен в meta тегах
//     const csrfTokenMatch = html.match(
//       /<meta name="csrf-token" content="([^"]*)"/
//     );
//     if (csrfTokenMatch && csrfTokenMatch[1]) {
//       console.log('[CSRF] ✅ Токен получен из Laravel');
//       return csrfTokenMatch[1];
//     }

//     console.log('[CSRF] ❌ Токен не найден в HTML');
//     return 'test_token_fallback';
//   } catch (error) {
//     console.error('[CSRF] 🚨 Ошибка получения токена:', error.message);
//     return 'test_token_fallback';
//   }
// }

//Тестовый endpoint для получения SMS (useSms)
// app.post('/test-sms-get', async (req, res) => {
//   console.log('🔔 Тестовый запрос к Laravel API для получения SMS');

//   try {
//     const WebSocket = require('ws');
//     const csrfToken = await getCsrfToken();
//     const ws = new WebSocket(`ws://localhost:${PORT}?csrf_token=${csrfToken}`);

//     let responseSent = false;

//     const timeout = setTimeout(() => {
//       if (!responseSent) {
//         responseSent = true;
//         res.status(408).json({
//           error: 'Timeout: No response from WebSocket within 10 seconds',
//           request: {
//             endpoint: '/api/sms',
//             method: 'POST',
//           },
//         });
//         ws.close();
//       }
//     }, 10000);

//     ws.on('open', function () {
//       console.log('✅ WebSocket подключен для тестового запроса получения SMS');

//       // ТОЧНЫЙ формат как в useSms
//       const testMessage = {
//         type: 'laravel_request',
//         // requestId: Date.now(),
//         endpoint: '/api/sms',
//         method: 'POST',
//         data: {
//           data: { search: '' },
//           _token: csrfToken,
//         },
//       };

//       ws.send(JSON.stringify(testMessage));
//       console.log('📨 Отправлен тестовый запрос получения SMS:', {
//         endpoint: testMessage.endpoint,
//         method: testMessage.method,
//         hasToken: !!testMessage.data._token,
//       });
//     });

//     ws.on('message', function (data) {
//       try {
//         const response = JSON.parse(data);
//         console.log('📩 Получен ответ:', response.type);

//         if (response.type === 'laravel_response' && !responseSent) {
//           responseSent = true;
//           clearTimeout(timeout);

//           res.json({
//             status: 'success',
//             message: 'Запрос на получение SMS отправлен и получен ответ',
//             request: {
//               endpoint: '/api/sms',
//               method: 'POST',
//             },
//             response: response,
//           });

//           ws.close();
//         }
//       } catch (e) {
//         console.error('Ошибка парсинга ответа:', e);
//         if (!responseSent) {
//           responseSent = true;
//           clearTimeout(timeout);
//           res.status(500).json({ error: 'Parse error: ' + e.message });
//         }
//       }
//     });

//     ws.on('error', function (err) {
//       console.error('❌ WebSocket error:', err);
//       if (!responseSent) {
//         responseSent = true;
//         clearTimeout(timeout);
//         res
//           .status(500)
//           .json({ error: 'WebSocket connection failed: ' + err.message });
//       }
//     });

//     ws.on('close', function () {
//       console.log('🔌 WebSocket соединение закрыто');
//     });
//   } catch (error) {
//     console.error('🚨 Ошибка при создании WebSocket:', error);
//     res
//       .status(500)
//       .json({ error: 'Failed to create WebSocket: ' + error.message });
//   }
// });

//Тестовый endpoint для отправки SMS (useSendSms)
//app.post('/test-sms-send', async (req, res) => {
//  console.log('🔔 Тестовый запрос к Laravel API для отправки SMS');

//  try {
//    const WebSocket = require('ws');
//    const csrfToken = await getCsrfToken();
//    const ws = new WebSocket(`ws://localhost:${PORT}?csrf_token=${csrfToken}`);

//    let responseSent = false;

//    const timeout = setTimeout(() => {
//      if (!responseSent) {
//        responseSent = true;
//        res.status(408).json({
//          error: 'Timeout: No response from WebSocket within 10 seconds',
//          request: {
//            endpoint: '/api/sms/create/sms',
//            method: 'POST',
//          },
//        });
//        ws.close();
//      }
//    }, 10000);

//    ws.on('message', function (data) {
//      try {
//        const response = JSON.parse(data);
//        console.log('📩 Получен ответ:', response.type);

//        if (response.type === 'laravel_response' && !responseSent) {
//          responseSent = true;
//          clearTimeout(timeout);

//          ws.close();
//        }
//      } catch (e) {
//        console.error('Ошибка парсинга ответа:', e);
//        if (!responseSent) {
//          responseSent = true;
//          clearTimeout(timeout);
//          res.status(500).json({ error: 'Parse error: ' + e.message });
//        }
//      }
//    });

//    ws.on('error', function (err) {
//      console.error('❌ WebSocket error:', err);
//      if (!responseSent) {
//        responseSent = true;
//        clearTimeout(timeout);
//        res
//          .status(500)
//          .json({ error: 'WebSocket connection failed: ' + err.message });
//      }
//    });

//    ws.on('close', function () {
//      console.log('🔌 WebSocket соединение закрыто');
//    });
//  } catch (error) {
//    console.error('🚨 Ошибка при создании WebSocket:', error);
//    res
//      .status(500)
//      .json({ error: 'Failed to create WebSocket: ' + error.message });
//  }
//});

//Веб-интерфейс статуса с тестовыми кнопками
// app.post('/', (req, res) => {
//   res.send(`<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8">
//   <title>BFF WebSocket Server</title>
//   <style>
//     body { font-family: Arial, sans-serif; margin: 20px; }
//     .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
//     .connected { background: #d4edda; color: #155724; }
//     .disconnected { background: #f8d7da; color: #721c24; }
//     .message { padding: 5px; border-bottom: 1px solid #eee; font-family: monospace; }
//     .test-section {
//       margin: 20px 0;
//       padding: 15px;
//       background: #f8f9fa;
//       border-radius: 5px;
//       border: 1px solid #dee2e6;
//     }
//     .test-button {
//       padding: 10px 15px;
//       background: #1890ff;
//       color: white;
//       border: none;
//       border-radius: 4px;
//       cursor: pointer;
//       margin: 5px;
//     }
//     .test-button:hover { background: #40a9ff; }
//     .test-button:disabled {
//       background: #ccc;
//       cursor: not-allowed;
//     }
//     .test-button.get { background: #52c41a; }
//     .test-button.get:hover { background: #73d13d; }
//     .test-button.send { background: #fa8c16; }
//     .test-button.send:hover { background: #faad14; }
//     .result {
//       margin-top: 10px;
//       padding: 10px;
//       border-radius: 4px;
//       font-family: monospace;
//       font-size: 12px;
//       white-space: pre-wrap;
//     }
//     .success { background: #f6ffed; border: 1px solid #b7eb8f; }
//     .error { background: #fff2f0; border: 1px solid #ffccc7; }
//     .loading { background: #e6f7ff; border: 1px solid #91d5ff; }
//     .button-group {
//       display: flex;
//       gap: 10px;
//       flex-wrap: wrap;
//     }
//     .token-info {
//       background: #fff7e6;
//       border: 1px solid #ffd591;
//       padding: 8px;
//       border-radius: 4px;
//       margin: 10px 0;
//       font-size: 12px;
//     }
//   </style>
// </head>
// <body>
//   <h2>📡 BFF WebSocket Server</h2>
//   <div>Port: ${PORT}</div>
//   <div>Status: <span id="status" class="status">Checking...</span></div>

//   <div class="test-section">
//     <h3>🧪 Тест Laravel API</h3>
//     <p>Тестирование эндпоинтов используемых фронтендом:</p>

//     <div class="token-info">
//       <strong>CSRF Token:</strong> <span id="csrf-token">Получение...</span>
//     </div>

//     <div class="button-group">
//       <button class="test-button get" onclick="testSmsGet()">📨 Получить SMS (/api/sms)</button>
//       <button class="test-button send" onclick="testSmsSend()">✉️ Отправить SMS (/api/sms/create/sms)</button>
//     </div>

//     <div id="test-result"></div>
//   </div>

//   <h3>Live Messages:</h3>
//   <div id="messages" style="max-height: 400px; overflow-y: auto; border: 1px solid #ccc; padding: 10px;"></div>

//   <script>
//     const statusEl = document.getElementById('status');
//     const messagesEl = document.getElementById('messages');
//     const testResultEl = document.getElementById('test-result');
//     const csrfTokenEl = document.getElementById('csrf-token');

//     function addMessage(msg, type = 'info') {
//       const div = document.createElement('div');
//       div.className = 'message';
//       div.innerHTML = '<strong>[' + new Date().toLocaleTimeString() + ']</strong> ' + msg;

//       if (type === 'error') div.style.color = 'red';
//       if (type === 'success') div.style.color = 'green';

//       messagesEl.prepend(div);
//     }

//     // Функция для получения CSRF токена
//     async function fetchCsrfToken() {
//       try {
//         const response = await fetch('/get-csrf-token');
//         const data = await response.json();
//         if (data.token) {
//           csrfTokenEl.textContent = data.token.substring(0, 20) + '...';
//           csrfTokenEl.title = data.token;
//         } else {
//           csrfTokenEl.textContent = 'Не получен';
//         }
//       } catch (error) {
//         csrfTokenEl.textContent = 'Ошибка получения';
//       }
//     }

//     async function testSmsGet() {
//       const button = event.target;
//       const originalText = button.textContent;

//       button.disabled = true;
//       button.textContent = '🔄 Получение...';
//       testResultEl.innerHTML = '🔄 Отправка запроса для получения SMS...';
//       testResultEl.className = 'result loading';

//       try {
//         const response = await fetch('/test-sms-get', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             'Accept': 'application/json'
//           }
//         });

//         const data = await response.json();

//         if (response.ok) {
//           testResultEl.innerHTML = \`
//             <strong>✅ Успешно!</strong>
//             <div><strong>Статус:</strong> \${data.status}</div>
//             <div><strong>Сообщение:</strong> \${data.message}</div>
//             <div><strong>Ответ от Laravel:</strong></div>
//             <pre>\${JSON.stringify(data.response, null, 2)}</pre>
//           \`;
//           testResultEl.className = 'result success';
//         } else {
//           testResultEl.innerHTML = \`
//             <strong>❌ Ошибка:</strong> \${data.error}
//             \${data.request ? '<div><strong>Запрос:</strong> ' + JSON.stringify(data.request) + '</div>' : ''}
//           \`;
//           testResultEl.className = 'result error';
//         }
//       } catch (error) {
//         testResultEl.innerHTML = \`
//           <strong>🚨 Ошибка сети:</strong> \${error.message}
//         \`;
//         testResultEl.className = 'result error';
//       } finally {
//         button.disabled = false;
//         button.textContent = originalText;
//       }
//     }

//     async function testSmsSend() {
//       const button = event.target;
//       const originalText = button.textContent;

//       button.disabled = true;
//       button.textContent = '🔄 Отправка...';
//       testResultEl.innerHTML = '🔄 Отправка запроса для отправки SMS...';
//       testResultEl.className = 'result loading';

//       try {
//         const response = await fetch('/test-sms-send', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             'Accept': 'application/json'
//           }
//         });

//         const data = await response.json();

//         if (response.ok) {
//           testResultEl.innerHTML = \`
//             <strong>✅ Успешно!</strong>
//             <div><strong>Статус:</strong> \${data.status}</div>
//             <div><strong>Сообщение:</strong> \${data.message}</div>
//             <div><strong>Ответ от Laravel:</strong></div>
//             <pre>\${JSON.stringify(data.response, null, 2)}</pre>
//           \`;
//           testResultEl.className = 'result success';
//         } else {
//           testResultEl.innerHTML = \`
//             <strong>❌ Ошибка:</strong> \${data.error}
//             \${data.request ? '<div><strong>Запрос:</strong> ' + JSON.stringify(data.request) + '</div>' : ''}
//           \`;
//           testResultEl.className = 'result error';
//         }
//       } catch (error) {
//         testResultEl.innerHTML = \`
//           <strong>🚨 Ошибка сети:</strong> \${error.message}
//         \`;
//         testResultEl.className = 'result error';
//       } finally {
//         button.disabled = false;
//         button.textContent = originalText;
//       }
//     }

//     try {
//       const ws = new WebSocket('ws://' + window.location.host);

//       ws.onopen = function() {
//         statusEl.textContent = 'Connected ✅';
//         statusEl.className = 'status connected';
//         addMessage('WebSocket connected successfully', 'success');

//         // Получаем CSRF токен
//         fetchCsrfToken();

//         // Отправляем тестовое сообщение
//         setTimeout(function() {
//           ws.send(JSON.stringify({
//             type: 'test',
//             message: 'Hello from web interface',
//             timestamp: Date.now()
//           }));
//         }, 1000);
//       };

//       ws.onclose = function() {
//         statusEl.textContent = 'Disconnected ❌';
//         statusEl.className = 'status disconnected';
//         addMessage('WebSocket disconnected', 'error');
//       };

//       ws.onerror = function(err) {
//         statusEl.textContent = 'Connection Error ❌';
//         statusEl.className = 'status disconnected';
//         addMessage('WebSocket error: ' + err.type, 'error');
//       };

//       ws.onmessage = function(event) {
//         try {
//           const data = JSON.parse(event.data);
//           addMessage('Received: ' + JSON.stringify(data));
//         } catch (e) {
//           addMessage('Received: ' + event.data);
//         }
//       };

//     } catch(e) {
//       statusEl.textContent = 'Failed to connect: ' + e.message;
//       statusEl.className = 'status disconnected';
//     }
//   </script>
// </body>
// </html>`);
// });

//Endpoint для получения CSRF токена
// app.post('/get-csrf-token', async (req, res) => {
//   try {
//     const token = await getCsrfToken();
//     res.json({ token });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

//Создаём единый HTTP сервер
// const server = http.createServer(app);

//Создаём единый WebSocket сервер на том же HTTP сервере
// const wss = new WebSocketServer({
//   server,
//   verifyClient: function (info, callback) {
//     console.log(
//       '[WS] 🔄 Connection attempt from: ' + (info.origin || 'unknown')
//     );
//     callback(true);
//   },
// });

//Общая метрика подключённых клиентов
// let connectedClients = 0;

//Основной обработчик WebSocket соединений
// wss.on('connection', function (ws, req) {
//   const clientId = Math.random().toString(36).substr(2, 9);
//   const clientIP = req.socket.remoteAddress;
//   // Извлекаем токен из URL
//   const url = new URL(req.url, 'http://localhost');
//   const csrfToken = url.searchParams.get('csrf_token');

//   // Сохраняем токен для этого клиента
//   if (csrfToken) {
//     clientTokens.set(clientId, csrfToken);
//     console.log('[WS] 🔐 Client ' + clientId + ' provided CSRF token');
//   } else {
//     console.log('[WS] ⚠️ Client ' + clientId + ' connected without CSRF token');
//   }

//   connectedClients++;
//   console.log(
//     '[WS] ✅ Client ' +
//       clientId +
//       ' connected from ' +
//       clientIP +
//       ', total: ' +
//       connectedClients
//   );

//   // Инициализируем свойства соединения
//   ws.clientId = clientId;
//   ws.isAlive = true;
//   ws.subscriptions = new Set();

//   // Heartbeat
//   ws.on('pong', function () {
//     ws.isAlive = true;
//   });

//   // Отправляем приветственное сообщение
//   ws.send(
//     JSON.stringify({
//       type: 'connection_established',
//       clientId: clientId,
//       message: 'Connected to BFF WebSocket server',
//       timestamp: Date.now(),
//     })
//   );

//   // ОБРАБОТКА СООБЩЕНИЙ ОТ КЛИЕНТА
//   ws.on('message', function (data) {
//     try {
//       const message = JSON.parse(data.toString());
//       console.log('[WS ' + clientId + '] 📨 Received:', message);

//       // РОУТИНГ СООБЩЕНИЙ ПО ТИПАМ
//       handleWebSocketMessage(ws, message);
//     } catch (err) {
//       console.error('[WS ' + clientId + '] 🚨 Parse error:', err.message);
//       sendError(ws, 'Invalid JSON format');
//     }
//   });

//   ws.on('close', function (code, reason) {
//     // Удаляем токен клиента при отключении
//     clientTokens.delete(ws.clientId);

//     connectedClients--;
//     console.log(
//       '[WS ' +
//         ws.clientId +
//         '] ❌ Disconnected: ' +
//         code +
//         ' ' +
//         (reason || '') +
//         ', total: ' +
//         connectedClients
//     );
//   });

//   ws.on('error', function (err) {
//     console.error('[WS ' + ws.clientId + '] 🚨 Error:', err.message);
//   });
// });

//Heartbeat интервал
// const interval = setInterval(function () {
//   wss.clients.forEach(function (ws) {
//     if (ws.isAlive === false) {
//       console.log('[WS ' + ws.clientId + '] 💀 Terminating dead connection');
//       return ws.terminate();
//     }
//     ws.isAlive = false;
//     ws.ping();
//   });
// }, 30000);

// wss.on('close', function () {
//   clearInterval(interval);
// });

//ФУНКЦИЯ ОБРАБОТКИ СООБЩЕНИЙ
// function handleWebSocketMessage(ws, message) {
//   // Поддержка как 'type', так и 'action' полей
//   const messageType = message.type || message.action;
//   const chatId = message.chatId;
//   const text = message.text;

//   if (!messageType) {
//     console.log(
//       '[WS ' + ws.clientId + '] 🚨 No type/action field in message:',
//       message
//     );
//     return sendError(ws, 'Message must contain "type" or "action" field');
//   }

//   console.log('[WS ' + ws.clientId + '] Processing type: ' + messageType);

//   switch (messageType) {
//     case 'subscribe':
//       // Подписка на чат
//       ws.subscriptions.add(chatId.toString());
//       console.log('[WS ' + ws.clientId + '] 📝 Subscribed to chat: ' + chatId);
//       ws.send(
//         JSON.stringify({
//           type: 'subscribed',
//           chatId: chatId,
//           message: 'Subscribed to chat ' + chatId,
//           timestamp: Date.now(),
//         })
//       );
//       break;

//     case 'unsubscribe':
//       // Отписка от чата
//       ws.subscriptions.delete(chatId.toString());
//       console.log(
//         '[WS ' + ws.clientId + '] 📝 Unsubscribed from chat: ' + chatId
//       );
//       break;

//     case 'chat_message':
//       // Обработка сообщения чата
//       handleChatMessage(ws, message);
//       break;

//     case 'test':
//       // Тестовое сообщение
//       console.log('[WS ' + ws.clientId + '] 🧪 Test message received');
//       ws.send(
//         JSON.stringify({
//           type: 'test_response',
//           message: 'Test received successfully!',
//           yourMessage: message,
//           timestamp: Date.now(),
//           server: 'BFF Express.js',
//         })
//       );
//       break;

//     case 'ping':
//       // Ping/Pong
//       ws.send(
//         JSON.stringify({
//           type: 'pong',
//           timestamp: Date.now(),
//         })
//       );
//       break;

//     case 'laravel_request':
//       // Запрос к Laravel API
//       handleLaravelRequest(ws, message);
//       break;

//     default:
//       console.log(
//         '[WS ' + ws.clientId + '] ❓ Unknown message type: ' + messageType
//       );
//       sendError(ws, 'Unknown message type: ' + messageType);
//   }
// }

//ОБРАБОТКА ЗАПРОСОВ К LARAVEL API
// async function handleLaravelRequest(ws, message) {
//   const { requestId, endpoint, method = 'POST', data = null } = message;

//   if (!requestId || !endpoint) {
//     return sendError(
//       ws,
//       'requestId and endpoint are required for laravel_request'
//     );
//   }

//   console.log('[LARAVEL] 🔄 Request to: ' + endpoint + ' (' + method + ')');

//   // URL к Laravel - используем правильный хост
//   const laravelBaseUrl = process.env.LARAVEL_URL || 'http://192.168.1.16';
//   const url = laravelBaseUrl + endpoint;

//   // Получаем токен клиента или получаем свежий
//   let clientToken = clientTokens.get(ws.clientId);
//   if (!clientToken) {
//     console.log(
//       '[LARAVEL] 🔄 Получение свежего CSRF токена для клиента: ' + ws.clientId
//     );
//     clientToken = await getCsrfToken();
//     clientTokens.set(ws.clientId, clientToken);
//   }

//   const headers = {
//     'Content-Type': 'application/json',
//     Accept: 'application/json',
//     'X-Requested-With': 'XMLHttpRequest',
//     'X-CSRF-TOKEN': clientToken,
//     Origin: laravelBaseUrl,
//   };

//   const options = {
//     method: method,
//     headers: headers,
//     credentials: 'include',
//   };

//   // ТОЧНО повторяем формат данных из хуков
//   if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
//     options.body = JSON.stringify(data);
//   }

//   // Логируем детали запроса для отладки
//   console.log('[LARAVEL] Request details:', {
//     url: url,
//     method: method,
//     headers: {
//       ...headers,
//       'X-CSRF-TOKEN': headers['X-CSRF-TOKEN']
//         ? '***' + headers['X-CSRF-TOKEN'].slice(-10)
//         : 'missing',
//     },
//     body: options.body ? JSON.parse(options.body) : null,
//   });

//   // Выполняем запрос к Laravel
//   try {
//     const response = await fetch(url, options);
//     let responseData;

//     try {
//       responseData = await response.json();
//     } catch (e) {
//       responseData = {
//         error: 'Invalid JSON response',
//         raw: await response.text(),
//       };
//     }

//     console.log(
//       '[LARAVEL] ✅ Response from ' + endpoint + ': ' + response.status
//     );

//     // Отправляем ответ обратно клиенту
//     ws.send(
//       JSON.stringify({
//         type: 'laravel_response',
//         requestId: requestId,
//         success: response.ok,
//         status: response.status,
//         data: responseData,
//         endpoint: endpoint,
//       })
//     );
//   } catch (error) {
//     console.error('[LARAVEL] 🚨 Request failed: ' + endpoint, error);

//     ws.send(
//       JSON.stringify({
//         type: 'laravel_response',
//         requestId: requestId,
//         success: false,
//         error: error.message,
//         endpoint: endpoint,
//       })
//     );
//   }
// }

//ОБРАБОТКА СООБЩЕНИЙ ЧАТА
// function handleChatMessage(ws, message) {
//   const chatId = message.chatId;
//   const text = message.text;
//   const files = message.files || [];

//   if (!chatId || !text) {
//     return sendError(ws, 'chatId and text are required');
//   }

//   console.log('[CHAT] 💬 Message in chat ' + chatId + ': ' + text);

//   // Создаём объект сообщения
//   const chatMessage = {
//     type: 'new_message',
//     message: {
//       id: Date.now(),
//       chat_id: parseInt(chatId),
//       from: { id: 46, name: 'Александр', surname: 'Кошелев' },
//       to: { id: parseInt(chatId) },
//       text: text,
//       files: files,
//       status: false,
//       created_at: Math.floor(Date.now() / 1000),
//       updated_at: Math.floor(Date.now() / 1000),
//     },
//     timestamp: Date.now(),
//   };

//   // Рассылаем всем подписанным клиентам
//   let deliveredTo = 0;
//   wss.clients.forEach(function (client) {
//     if (
//       client.readyState === client.OPEN &&
//       client.subscriptions &&
//       client.subscriptions.has(chatId.toString())
//     ) {
//       client.send(JSON.stringify(chatMessage));
//       deliveredTo++;
//     }
//   });

//   console.log(
//     '[CHAT] 📤 Message delivered to ' +
//       deliveredTo +
//       ' clients in chat ' +
//       chatId
//   );

//   // Подтверждение отправителю
//   ws.send(
//     JSON.stringify({
//       type: 'message_sent',
//       message: 'Message delivered to ' + deliveredTo + ' clients',
//       chatId: chatId,
//       timestamp: Date.now(),
//     })
//   );
// }

//ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// function sendError(ws, message) {
//   ws.send(
//     JSON.stringify({
//       type: 'error',
//       message: message,
//       timestamp: Date.now(),
//     })
//   );
// }

//Запуск сервера
// server.listen(PORT, '0.0.0.0', function () {
//   console.log('✅ BFF WebSocket Server started!');
//   console.log('📍 Port: ' + PORT);
//   console.log('📍 WebSocket: ws://192.168.1.16:' + PORT);
//   console.log('📍 HTTP Health: http://192.168.1.16:' + PORT + '/health');
//   console.log('📍 Web Interface: http://192.168.1.16:' + PORT + '/');
//   console.log('🌐 Listening on all interfaces (0.0.0.0)');
// });

//Graceful shutdown
// process.on('SIGINT', function () {
//   console.log('\n🛑 Shutting down BFF server gracefully...');
//   wss.clients.forEach(function (client) {
//     client.send(
//       JSON.stringify({
//         type: 'server_shutdown',
//         message: 'Server is restarting',
//       })
//     );
//     client.close();
//   });

//   server.close(function () {
//     console.log('✅ BFF server stopped');
//     process.exit(0);
//   });
// });

// apiRoutes.forEach((route) => {
//   app.post(route, (req, res) => {
//     try {
//       const { action, listId, list, task, taskId, tag, room, message, uuid } =
//         req.body;

//       // Route-specific logic
//       if (route === '/api/updates-on-list') {
//         if (action === 'update_task') {
//           io.to(room).emit('taskUpdated', { task, uuid });
//         } else if (action === 'create_task') {
//           io.to(room).emit('taskCreated', { task, uuid });
//         } else if (action === 'delete_task') {
//           io.to(room).emit('taskDeleted', { taskId, uuid });
//         } else if (action === 'update_list') {
//           io.to(room).emit('listUpdated', { list, uuid });
//         } else if (action === 'create_tag_task') {
//           io.to(room).emit('createdTagTask', { tag, taskId, uuid });
//         } else if (action === 'add_tag_task') {
//           io.to(room).emit('addTagTask', { tag, taskId, uuid });
//         } else if (action === 'delete_tag_task') {
//           io.to(room).emit('deleteTagTask', { tag, taskId, uuid });
//         } else if (action === 'delete_tag') {
//           io.to(room).emit('deleteTag', { tag, uuid });
//         } else if (action === 'update_tag') {
//           io.to(room).emit('updateTag', { tag, taskId, uuid });
//         }
//       } else {
//         if (!room || !message) {
//           return res.status(400).json({ error: 'Invalid request data' });
//         }
//         const eventName = route.split('/').pop().replace(/-/g, '_');
//         //console.log("room: " + room)
//         //console.log("eventName: " + eventName)
//         //console.log(message)
//         io.to(room).emit(eventName, { message, uuid });
//       }

//       res.json({ status: 'ok' });
//     } catch (error) {
//       console.error('Error:', error);
//       res.status(500).json({ error: 'Internal server error' });
//     }
//   });
// });

// app.post('/', (req, res) => {
//   res.send('Hello from Express!');
// });
// ////////////////////////
// ////////////DREW+++
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
//const express = require('express');
//const { createServer } = require('http');
//const { Server } = require('socket.io');
//const cors = require('cors');
//const fs = require('fs');
//const https = require('https');
//require('dotenv').config();

//const app = express();

//app.use(express.json());
//app.use(express.urlencoded({ extended: true }));
//app.use(cors());

//const isProduction = process.env.NODE_ENV === 'production';
//const PORT = process.env.PORT;

//let httpServer;
//httpServer = createServer(app);

//const allowedOrigins = [
//  'http://192.168.1.16',
//  'http://192.168.1.14',
//  'http://localhost:8000',
//  'http://127.0.0.1:8000',
//];

//const io = new Server(httpServer, {
//  cors: {
//    origin: allowedOrigins,
//    methods: ['GET', 'POST'],
//    credentials: true,
//  },
//  transports: ['websocket', 'polling'],
//  allowEIO3: true,
//});

//io.on('connection', (socket) => {
//  console.log('User connected:', socket.id);

//  socket.on('subscribe', (room) => {
//    socket.join(room);
//    console.log(`User ${socket.id} joined room ${room}`);
//  });

//  socket.on('disconnect', () => {
//    console.log('User disconnected:', socket.id);
//  });

//  socket.on('subscribeToList', (listId) => {
//    socket.join(`list_${listId}`);
//    console.log(`User ${socket.id} subscribed to list ${listId}`);
//  });

//  socket.on('unsubscribeFromList', (listId) => {
//    socket.leave(`list_${listId}`);
//  });

//  socket.on('connect_error', (err) => {
//    console.log(err.message, err.description, err.context);
//  });
//});

//// API Routes
//const apiRoutes = ['/api/sms/new-sms'];

//apiRoutes.forEach((route) => {
//  app.post(route, (req, res) => {
//    try {
//      const { action, listId, list, task, taskId, tag, room, message, uuid } =
//        req.body;

//      // Route-specific logic
//      if (route === '/api/updates-on-list') {
//        if (action === 'update_task') {
//          io.to(room).emit('taskUpdated', { task, uuid });
//        } else if (action === 'create_task') {
//          io.to(room).emit('taskCreated', { task, uuid });
//        } else if (action === 'delete_task') {
//          io.to(room).emit('taskDeleted', { taskId, uuid });
//        } else if (action === 'update_list') {
//          io.to(room).emit('listUpdated', { list, uuid });
//        } else if (action === 'create_tag_task') {
//          io.to(room).emit('createdTagTask', { tag, taskId, uuid });
//        } else if (action === 'add_tag_task') {
//          io.to(room).emit('addTagTask', { tag, taskId, uuid });
//        } else if (action === 'delete_tag_task') {
//          io.to(room).emit('deleteTagTask', { tag, taskId, uuid });
//        } else if (action === 'delete_tag') {
//          io.to(room).emit('deleteTag', { tag, uuid });
//        } else if (action === 'update_tag') {
//          io.to(room).emit('updateTag', { tag, taskId, uuid });
//        }
//      } else {
//        if (!room || !message) {
//          return res.status(400).json({ error: 'DREW DREW' });
//        }
//        const eventName = route.split('/').pop().replace(/-/g, '_');
//        //console.log("room: " + room)
//        //console.log("eventName: " + eventName)
//        //console.log(message)
//        io.to(room).emit(eventName, { message, uuid });
//      }

//      res.json({ status: 'ok' });
//    } catch (error) {
//      console.error('Error:', error);
//      res.status(500).json({ error: 'Internal server error' });
//    }
//  });
//});

//app.post('/', (req, res) => {
//  res.send('Hello from Express!');
//});

//httpServer.listen(PORT, () => {
//  console.log(
//    `Socket.io server running in ${
//      isProduction ? 'PRODUCTION' : 'DEVELOPMENT'
//    } mode on port ${PORT}`
//  );
//  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
//});
// ////////////////////////
// ////////////DREW---
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
// ////////////
//    async function testSmsGet() {
//      const button = event.target;
//      const originalText = button.textContent;

//      button.disabled = true;
//      button.textContent = '🔄 Получение...';
//      testResultEl.innerHTML = '🔄 Отправка запроса для получения SMS...';
//      testResultEl.className = 'result loading';

//      try {
//        const response = await fetch('/test-sms-get', {
//          method: 'POST',
//          headers: {
//            'Content-Type': 'application/json',
//            'Accept': 'application/json'
//          }
//        });

//        const data = await response.json();

//        if (response.ok) {
//          testResultEl.innerHTML = \`
//            <strong>✅ Успешно!</strong>
//            <div><strong>Статус:</strong> \${data.status}</div>
//            <div><strong>Сообщение:</strong> \${data.message}</div>
//            <div><strong>Ответ от Laravel:</strong></div>
//            <pre>\${JSON.stringify(data.response, null, 2)}</pre>
//          \`;
//          testResultEl.className = 'result success';
//        } else {
//          testResultEl.innerHTML = \`
//            <strong>❌ Ошибка:</strong> \${data.error}
//            \${data.request ? '<div><strong>Запрос:</strong> ' + JSON.stringify(data.request) + '</div>' : ''}
//          \`;
//          testResultEl.className = 'result error';
//        }
//      } catch (error) {
//        testResultEl.innerHTML = \`
//          <strong>🚨 Ошибка сети:</strong> \${error.message}
//        \`;
//        testResultEl.className = 'result error';
//      } finally {
//        button.disabled = false;
//        button.textContent = originalText;
//      }
//    }

//    async function testSmsSend() {
//      const button = event.target;
//      const originalText = button.textContent;

//      button.disabled = true;
//      button.textContent = '🔄 Отправка...';
//      testResultEl.innerHTML = '🔄 Отправка запроса для отправки SMS...';
//      testResultEl.className = 'result loading';

//      try {
//        const response = await fetch('/test-sms-send', {
//          method: 'POST',
//          headers: {
//            'Content-Type': 'application/json',
//            'Accept': 'application/json'
//          }
//        });

//        const data = await response.json();

//        if (response.ok) {
//          testResultEl.innerHTML = \`
//            <strong>✅ Успешно!</strong>
//            <div><strong>Статус:</strong> \${data.status}</div>
//            <div><strong>Сообщение:</strong> \${data.message}</div>
//            <div><strong>Ответ от Laravel:</strong></div>
//            <pre>\${JSON.stringify(data.response, null, 2)}</pre>
//          \`;
//          testResultEl.className = 'result success';
//        } else {
//          testResultEl.innerHTML = \`
//            <strong>❌ Ошибка:</strong> \${data.error}
//            \${data.request ? '<div><strong>Запрос:</strong> ' + JSON.stringify(data.request) + '</div>' : ''}
//          \`;
//          testResultEl.className = 'result error';
//        }
//      } catch (error) {
//        testResultEl.innerHTML = \`
//          <strong>🚨 Ошибка сети:</strong> \${error.message}
//        \`;
//        testResultEl.className = 'result error';
//      } finally {
//        button.disabled = false;
//        button.textContent = originalText;
//      }
//    }

//    try {
//      const ws = new WebSocket('ws://' + window.location.host);

//      ws.onopen = function() {
//        statusEl.textContent = 'Connected ✅';
//        statusEl.className = 'status connected';
//        addMessage('WebSocket connected successfully', 'success');

//        // Получаем CSRF токен
//        fetchCsrfToken();

//        // Отправляем тестовое сообщение
//        setTimeout(function() {
//          ws.send(JSON.stringify({
//            type: 'test',
//            message: 'Hello from web interface',
//            timestamp: Date.now()
//          }));
//        }, 1000);
//      };

//      ws.onclose = function() {
//        statusEl.textContent = 'Disconnected ❌';
//        statusEl.className = 'status disconnected';
//        addMessage('WebSocket disconnected', 'error');
//      };

//      ws.onerror = function(err) {
//        statusEl.textContent = 'Connection Error ❌';
//        statusEl.className = 'status disconnected';
//        addMessage('WebSocket error: ' + err.type, 'error');
//      };

//      ws.onmessage = function(event) {
//        try {
//          const data = JSON.parse(event.data);
//          addMessage('Received: ' + JSON.stringify(data));
//        } catch (e) {
//          addMessage('Received: ' + event.data);
//        }
//      };

//    } catch(e) {
//      statusEl.textContent = 'Failed to connect: ' + e.message;
//      statusEl.className = 'status disconnected';
//    }
//  </script>
//</body>
//</html>`);
//});
