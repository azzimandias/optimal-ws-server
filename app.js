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

// TODO: Заменить на актуальные переменные (chatId, user.id и т.д.)

// Заметки:
// socket.id = "КТО" (идентификатор подключения)
// room = "НА ЧТО" (идентификатор комнаты, например, чат или список)

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  // Подписка на комнату (сохраняем для обратной совместимости)
  socket.on('subscribe', (room) => {
    socket.join(room)
    console.log(`User ${socket.id} joined room ${room}`)
  })

  // ✅ НОВЫЙ: Подписка на комнату чата (унифицированный naming convention)
  socket.on('room:join', (room) => {
    socket.join(room)
    console.log(`[room:join] User ${socket.id} joined room ${room}`)
  })

  // Подписка на список
  // socket.on('subscribeToList', (listId) => {
  //   socket.join(`list_${listId}`)
  //   console.log(`User ${socket.id} subscribed to list ${listId}`)
  // })
  //
  // // Отписка от списка
  // socket.on('unsubscribeFromList', (listId) => {
  //   socket.leave(`list_${listId}`)
  //   console.log(`User ${socket.id} unsubscribed from list ${listId}`)
  // })

  // ✅ НОВЫЕ: Обработчики для клиентских событий с унифицированными названиями

  // Отправка нового сообщения
  socket.on('sms:new_message', (msg) => {
    console.log(`[sms:new_message] New message from ${socket.id}:`, msg)
    // Здесь должна быть логика сохранения в БД
    // Затем рассылаем всем подписанным на комнату чата
    io.to(msg.chat_id).emit('sms:new_message', { 
      message: msg,
      uuid: msg.uuid,
      timestamp: new Date().toISOString()
    })
  })

  // Обновление сообщения
  socket.on('sms:update_message', (data) => {
    console.log(`[sms:update_message] Update message from ${socket.id}:`, data)
    io.to(data.chat_id).emit('sms:update_message', data)
  })

  // Редактирование сообщения
  socket.on('sms:edit_message', (data) => {
    console.log(`[sms:edit_message] Edit message from ${socket.id}:`, data)
    io.to(data.chat_id).emit('sms:edit_message', data)
  })

  // Ответ на сообщение
  socket.on('sms:reply_message', (data) => {
    console.log(`[sms:reply_message] Reply message from ${socket.id}:`, data)
    io.to(data.chat_id).emit('sms:reply_message', data)
  })

  // Удаление сообщения
  socket.on('sms:delete_message', (data) => {
    console.log(`[sms:delete_message] Delete message from ${socket.id}:`, data)
    io.to(data.chat_id).emit('sms:delete_message', data)
  })

  // Обновление статуса сообщения
  socket.on('sms:status_update', (data) => {
    console.log(`[sms:status_update] Status update from ${socket.id}:`, data)
    io.to(data.chat_id).emit('sms:status_update', data)
  })

  // Инициализация списка чатов
  socket.on('chat:list:init', (userId) => {
    console.log(`[chat:list:init] User ${socket.id} requested chat list for user ${userId}`)
    // Здесь логика загрузки списка чатов из БД
    // socket.emit('chat:list:init', chatList)
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

// API Routes
const apiRoutes = [
  // SMS/Чат события - РАЗДЕЛЬНЫЕ
  '/api/sms/new-sms', // поменять у бо на message
  '/api/sms/update-message',
  '/api/sms/edit-message',
  '/api/sms/reply-message',
  '/api/sms/delete-message',
  '/api/sms/status-update', // (прочитано, доставлено)
]

apiRoutes.forEach((route) => {
  app.post(route, (req, res) => {
    try {
      const { room, message, uuid, messageId, replyTo, status, left, right } = req.body

      if (!room) {
        return res.status(400).json({ error: 'Room is required' })
      }

      // ✅ ИСПРАВЛЕНО: Генерируем имя события через двоеточие
      const eventName = route.split('/').pop().replace(/-/g, ':')

      // Отправляем WebSocket событие в указанную комнату
      io.to(room).emit(eventName, { message, uuid, messageId, replyTo, status, left, right })

      console.log(`📡 [WS] Event "${eventName}" sent to room "${room}"`)

      res.json({ status: 'ok' })
    } catch (error) {
      console.error('Error in API route:', error)
      res.status(500).json({ error: 'Internal server error' })
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