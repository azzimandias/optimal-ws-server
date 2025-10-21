const express = require('express')
const http = require('http')
require('dotenv').config()
const cors = require('cors')
const { Server } = require('socket.io')
const app = express()
const PORT = process.env.PORT || 5003

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.originalUrl}`)
  next()
})

const allowedOrigins = process.env.CORS_ORIGINS.split(',')

// Создаем HTTP сервер
const httpServer = http.createServer(app)
// Затем инициализируем Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
})

// ОБРАБОТЧИКИ СОБЫТИЙ SOCKET.IO ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  // Подписка на комнату (сохраняем для обратной совместимости)
  socket.on('subscribeToChat', (userId) => {
    const userRoom = `user:${userId}`;
    socket.join(userRoom);
    console.log(`User ${socket.id} joined personal room ${userRoom}`);

    // Также подписываем на общую комнату для обратной совместимости
    socket.join('CHAT');
  })

  // Обработка ошибок подключения
  socket.on('connect_error', (err) => {
    console.log('Connection error:', err.message, err.description, err.context)
  })

  // Обработка отключения
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})
// ОБРАБОТЧИКИ СОБЫТИЙ SOCKET.IO ----------------------------------------------------------------

// ОБРАБОТЧИКИ API ROUTES ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
const apiRoutes = [
  '/api/sms/new-sms', // поменять у бо на message
]

apiRoutes.forEach((route) => {
  app.post(route, (req, res) => {
    console.log(`📡 [WS] Route "${route}"`);
    Object.entries(req.body).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    try {
      const { left, right } = req.body;
      const eventName = route.split('/').pop().replace(/-/g, ':');
      const senderId = left.from.id;
      const senderRoom = `user:${senderId}`;
      const recipientId = left.to.id;
      const recipientRoom = `user:${recipientId}`;

      io.to(senderRoom).emit(eventName, { left });
      io.to(recipientRoom).emit(eventName, { left, right });

      res.json({ status: 'ok' });
    } catch (error) {
      console.error('Error in API route:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  })
})

// ОБРАБОТЧИКИ API ROUTES ----------------------------------------------------------------

// 7. Тестирование связи Laravel → BFF → Frontend  ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 7. Тестирование связи Laravel → BFF → Frontend -------------------------------------------------------------

// 8. ОБРАБОТКА ОШИБОК И ЛОГИРОВАНИЕ ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// Глобальный обработчик ошибок WebSocket соединений
io.engine.on('connection_error', (err) => {
  console.log('🚨 [WS Engine] Connection error:', {
    code: err.code,
    message: err.message,
    context: err.context,
  })
})

// Улучшенное логирование подключений
const connectedClients = new Map()

io.on('connection', (socket) => {
  const clientInfo = {
    id: socket.id,
    connectedAt: new Date().toISOString(),
    rooms: new Set(),
  }
  connectedClients.set(socket.id, clientInfo)

  console.log(
    `✅ [WS] Client connected: ${socket.id}, total: ${connectedClients.size}`
  )

  socket.on('subscribe', (room) => {
    socket.join(room)
    clientInfo.rooms.add(room)
    console.log(
      `📝 [WS] Client ${socket.id} joined room "${room}", total rooms: ${clientInfo.rooms.size}`
    )
  })

  // ✅ ДОБАВЛЕНО: Логирование для room:join
  socket.on('room:join', (room) => {
    socket.join(room)
    clientInfo.rooms.add(room)
    console.log(
      `📝 [WS:room:join] Client ${socket.id} joined room "${room}", total rooms: ${clientInfo.rooms.size}`
    )
  })

  socket.on('subscribeToList', (listId) => {
    const room = `list_${listId}`
    socket.join(room)
    clientInfo.rooms.add(room)
    console.log(
      `📝 [WS] Client ${socket.id} subscribed to list "${listId}", total rooms: ${clientInfo.rooms.size}`
    )
  })

  socket.on('unsubscribeFromList', (listId) => {
    const room = `list_${listId}`
    socket.leave(room)
    clientInfo.rooms.delete(room)
    console.log(
      `📝 [WS] Client ${socket.id} unsubscribed from list "${listId}", total rooms: ${clientInfo.rooms.size}`
    )
  })

  // ✅ ДОБАВЛЕНО: Логирование для SMS событий
  socket.on('sms:new_message', (data) => {
    console.log(
      `💬 [WS:sms:new_message] Client ${socket.id} sent message to chat ${data.chat_id}`
    )
  })

  socket.on('connect_error', (err) => {
    console.log('🚨 [WS] Connection error:', {
      socketId: socket.id,
      message: err.message,
      description: err.description,
      context: err.context,
    })
  })

  socket.on('disconnect', (reason) => {
    connectedClients.delete(socket.id)
    console.log(
      `❌ [WS] Client disconnected: ${socket.id}, reason: ${reason}, total: ${connectedClients.size}`
    )
  })

  // Обработка необработанных ошибок в socket событиях
  socket.on('error', (error) => {
    console.log('🚨 [WS] Socket error:', {
      socketId: socket.id,
      error: error.message,
    })
  })
})

// Глобальный обработчик необработанных исключений
process.on('uncaughtException', (error) => {
  console.log('🚨 [Process] Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.log(
    '🚨 [Process] Unhandled Rejection at:',
    promise,
    'reason:',
    reason
  )
})

// 8. ОБРАБОТКА ОШИБОК И ЛОГИРОВАНИЕ ----------------------------------------------------------------

// 9. GRACEFUL SHUTDOWN И МОНИТОРИНГ ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// Функция для graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(
    `\n🛑 [Shutdown] Received ${signal}, starting graceful shutdown...`
  )

  // Уведомляем всех клиентов о перезапуске сервера
  io.emit('server_restart', {
    message: 'Server is restarting, please reconnect',
    timestamp: new Date().toISOString(),
  })

  // БЫСТРЫЙ graceful shutdown для разработки и PM2 kill
  const isDevelopment = process.env.NODE_ENV !== 'PRODMODE'
  const shutdownDelay = isDevelopment ? 300 : 1000 // 300ms для dev, 1s для prod

  setTimeout(() => {
    console.log('⏳ [Shutdown] Closing HTTP server...')

    httpServer.close((err) => {
      if (err) {
        console.log('🚨 [Shutdown] Error closing HTTP server:', err)
        process.exit(1)
      }

      console.log('✅ [Shutdown] HTTP server closed')
      console.log('🔄 [Shutdown] Closing WebSocket connections...')

      io.disconnectSockets()
      io.close()

      console.log(
        `✅ [Shutdown] WebSocket server closed, ${connectedClients.size} clients disconnected`
      )
      console.log('🎉 [Shutdown] BFF server stopped gracefully')
      process.exit(0)
    })
  }, shutdownDelay)
}

// Обработчики сигналов для разработки и PM2
process.on('SIGINT', () => gracefulShutdown('SIGINT')) // Ctrl+C (разработка)
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')) // PM2 reload
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')) // PM2 stop

// Для PM2 graceful shutdown
if (process.env.PM2) {
  process.on('message', (msg) => {
    if (msg === 'shutdown') {
      console.log('🔄 [PM2] Received shutdown message from PM2')
      gracefulShutdown('PM2_SHUTDOWN')
    }
  })
}

// Мониторинг - периодический вывод статистики
setInterval(() => {
  const stats = {
    timestamp: new Date().toISOString(),
    connectedClients: connectedClients.size,
    memoryUsage: `${Math.round(
      process.memoryUsage().heapUsed / 1024 / 1024
    )}MB`,
    uptime: `${Math.round(process.uptime())}s`,
    pm2: !!process.env.PM2,
    nodeEnv: process.env.NODE_ENV || 'development',
  }

  console.log('📊 [Monitor] Server statistics:', stats)
}, 300000)

// Health check endpoint
app.post('/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    timestamp: new Date().toISOString(),
    service: 'BFF WebSocket Server',
  })
})

// Endpoint для проверки статистики в реальном времени
app.post('/stats', (req, res) => {
  const clientStats = Array.from(connectedClients.entries()).map(
    ([id, info]) => ({
      id,
      connectedAt: info.connectedAt,
      rooms: Array.from(info.rooms),
      connectionTime: `${Math.round(
        (new Date() - new Date(info.connectedAt)) / 1000
      )}s`,
    })
  )

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: {
      uptime: `${Math.round(process.uptime())}s`,
      memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      connectedClients: connectedClients.size,
      pm2: !!process.env.PM2,
      nodeVersion: process.version,
      nodeEnv: process.env.NODE_ENV || 'development',
    },
    clients: clientStats,
  })
})

// 9. GRACEFUL SHUTDOWN И МОНИТОРИНГ ----------------------------------------------------------------

// ЗАПУСК СЕРВЕРА ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
httpServer.listen(PORT, () => {
  console.log(`✅ Unified HTTP + WS server started on port ${PORT}`)
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`)
  console.log(`🎯 Using unified naming convention with colons (:)`)
})
// ЗАПУСК СЕРВЕРА ----------------------------------------------------------------