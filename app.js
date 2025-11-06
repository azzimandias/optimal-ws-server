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

const activeOrgHighlights  = new Map();
const activeBidHighlights  = new Map();

activeOrgHighlights.clear();
activeBidHighlights.clear();
console.log('🧹 Cleared previous active highlights');

const getAllActiveConnectionsOrgs = () => {
    const allConnections = [];
    for (const userConnections of activeOrgHighlights.values()) {
        allConnections.push(...userConnections);
    }
    return allConnections;
};
const getActiveHighlightsOrgs = () => {
    return Array.from(activeOrgHighlights.entries()).map(([userId, data]) => ({
        userId: userId,
        userFIO: data.userFIO,
        bidId: data.bidId,
        socketId: data.socketId,
        timestamp: data.timestamp
    }));
};

const getAllActiveConnectionsBids = () => {
    const allConnections = [];
    for (const userConnections of activeBidHighlights.values()) {
        allConnections.push(...userConnections);
    }
    return allConnections;
};
const getActiveHighlightsBids = () => {
    return Array.from(activeBidHighlights.entries()).map(([userId, data]) => ({
        userId: userId,
        userFIO: data.userFIO,
        bidId: data.bidId,
        socketId: data.socketId,
        timestamp: data.timestamp
    }));
};

// ОБРАБОТЧИКИ СОБЫТИЙ SOCKET.IO ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    /* + CHAT */
    // Подписка на комнату
    socket.on('subscribeToChat', (userId) => {
        const userRoom = `user:${userId}`;
        socket.join(userRoom);
        console.log(`User ${socket.id} joined personal room ${userRoom}`);
        socket.join('CHAT');
    })
    /* - CHAT */

    /* + NOTIFICATION */
    socket.on('subscribeToNotification', (userId) => {
        const userRoom = `userNotification:${userId}`;
        socket.join(userRoom);
        console.log(`User ${socket.id} joined personal room ${userRoom}`);
        socket.join('NOTIFICATION');
    })
    /* - NOTIFICATION */

    /* + ORG LIST */
    socket.on('SUBSCRIBE_ORG_ACTIVITY', (userId) => {
        socket.join('orgActivityMonitor');
        console.log(`📊 [WS] Client ${socket.id} joined org activity monitoring, userId: ${userId}`);

        const allActiveConnections = getAllActiveConnectionsOrgs();
        const activeHighlights = getActiveHighlightsOrgs();
        socket.emit('ACTIVE_HIGHLIGHTS_LIST_ORGS', {
            event: 'ACTIVE_HIGHLIGHTS_LIST_ORGS',
            activeHighlights: activeHighlights,
            count: activeHighlights.length,
            timestamp: new Date().toISOString(),
            activeUsers: allActiveConnections,
        });

        console.log(`📋 [WS] Sent ${activeHighlights.length} active highlights to new observer ${socket.id}`);
    })
    socket.on('UNSUBSCRIBE_ORG_ACTIVITY', (userId) => {
        socket.leave('orgActivityMonitor');
        console.log(`📝 [WS] Client ${socket.id} left activity monitoring, userId: ${userId}`);
    });
    socket.on('HIGHLIGHT_ORG', (obj) => {
        const orgPageRoom = `userHighlight:${obj.userId}:${obj.bidId}`;
        socket.join(orgPageRoom);
        console.log(`🎯 User ${obj.userId} joined bidPage room ${orgPageRoom}`);

        const connection = {
            userId: obj.userId,
            userFIO: obj.userFIO,
            orgId: obj.orgId,
            socketId: socket.id,
            action: obj.action,
            timestamp: new Date().toISOString(),
            joinedAt: new Date().toISOString(),
            connectionId: `${obj.userId}_${socket.id}_${obj.orgId}` // уникальный ID подключения
        };
        if (!activeOrgHighlights.has(obj.userId)) {
            activeOrgHighlights.set(obj.userId, []);
        }
        const userConnections = activeOrgHighlights.get(obj.userId);
        const existingConnectionIndex = userConnections.findIndex(conn =>
            conn.connectionId === connection.connectionId
        );

        if (existingConnectionIndex === -1) {
            // Новое подключение - добавляем
            userConnections.push(connection);
            console.log(`✅ Added new connection: ${connection.connectionId}`);
        } else {
            // Существующее подключение - обновляем
            userConnections[existingConnectionIndex] = connection;
            console.log(`🔄 Updated existing connection: ${connection.connectionId}`);
        }

        const allActiveConnections = getAllActiveConnectionsOrgs();
        const activeHighlights = getActiveHighlightsOrgs();
        io.to('orgActivityMonitor').emit('ACTIVE_HIGHLIGHTS_LIST_ORGS', {
            event: 'ACTIVE_HIGHLIGHTS_LIST_ORGS',
            activeHighlights: activeHighlights,
            count: activeHighlights.length,
            timestamp: new Date().toISOString(),
            activeUsers: allActiveConnections,
        });
        console.log(`📤 [WS] Notified org activity monitors about subscription. Total active: ${activeOrgHighlights.size}`);
    });
    socket.on('UNHIGHLIGHT_ORG', (obj) => {
        const orgPageRoom = `userHighlight:${obj.userId}:${obj.orgId}`;
        socket.leave(orgPageRoom);

        if (activeOrgHighlights.has(obj.userId)) {
            const userConnections = activeOrgHighlights.get(obj.userId);
            const connectionId = `${obj.userId}_${socket.id}_${obj.orgId}`;
            const initialLength = userConnections.length;
            activeOrgHighlights.set(obj.userId,
                userConnections.filter(conn => conn.connectionId !== connectionId)
            );

            const finalLength = activeOrgHighlights.get(obj.userId).length;
            const wasRemoved = initialLength > finalLength;

            if (finalLength === 0) {
                activeOrgHighlights.delete(obj.userId);
            }

            if (wasRemoved) {
                const allActiveConnections = getAllActiveConnectionsOrgs();
                const activeHighlights = getActiveHighlightsOrgs();
                io.to('orgActivityMonitor').emit('ACTIVE_HIGHLIGHTS_LIST_ORGS', {
                    event: 'ACTIVE_HIGHLIGHTS_LIST_ORGS',
                    activeHighlights: activeHighlights,
                    count: activeHighlights.length,
                    timestamp: new Date().toISOString(),
                    activeUsers: allActiveConnections,
                });
                console.log(`📤 [WS] Removed connection: ${connectionId}. User connections: ${finalLength}, Global: ${allActiveConnections.length}`);
            } else {
                console.log(`❌ Connection not found: ${connectionId}`);
            }
        }
    });
    /* - ORG LIST */

    /* + BID LIST */
    socket.on('SUBSCRIBE_BID_ACTIVITY', (userId) => {
        socket.join('bidActivityMonitor');
        console.log(`📊 [WS] Client ${socket.id} joined bid activity monitoring, userId: ${userId}`);

        const allActiveConnections = getAllActiveConnectionsBids();
        const activeHighlights = getActiveHighlightsBids();
        socket.emit('ACTIVE_HIGHLIGHTS_LIST_BIDS', {
            event: 'ACTIVE_HIGHLIGHTS_LIST_BIDS',
            activeHighlights: activeHighlights,
            count: activeHighlights.length,
            timestamp: new Date().toISOString(),
            activeUsers: allActiveConnections,
        });

        console.log(`📋 [WS] Sent ${activeHighlights.length} active highlights to new observer ${socket.id}`);
    });
    socket.on('UNSUBSCRIBE_BID_ACTIVITY', (userId) => {
        socket.leave('bidActivityMonitor');
        console.log(`📝 [WS] Client ${socket.id} left bid activity monitoring, userId: ${userId}`);
    });
    socket.on('HIGHLIGHT_BID', (obj) => {
        const bidPageRoom = `userHighlight:${obj.userId}:${obj.bidId}`;
        socket.join(bidPageRoom);
        console.log(`🎯 User ${obj.userId} joined bidPage room ${bidPageRoom}`);

        const connection = {
            userId: obj.userId,
            userFIO: obj.userFIO,
            bidId: obj.bidId,
            socketId: socket.id,
            timestamp: new Date().toISOString(),
            joinedAt: new Date().toISOString(),
            connectionId: `${obj.userId}_${socket.id}_${obj.bidId}` // уникальный ID подключения
        };
        if (!activeBidHighlights.has(obj.userId)) {
            activeBidHighlights.set(obj.userId, []);
        }
        const userConnections = activeBidHighlights.get(obj.userId);
        const existingConnectionIndex = userConnections.findIndex(conn =>
            conn.connectionId === connection.connectionId
        );
        if (existingConnectionIndex === -1) {
            userConnections.push(connection);
            console.log(`✅ Added new connection: ${connection.connectionId}`);
        } else {
            console.log(`⚠️ Connection already exists: ${connection.connectionId}`);
        }

        const allActiveConnections = getAllActiveConnectionsBids();
        const activeHighlights = getActiveHighlightsBids();
        io.to('bidActivityMonitor').emit('ACTIVE_HIGHLIGHTS_LIST_BIDS', {
            event: 'ACTIVE_HIGHLIGHTS_LIST_BIDS',
            activeHighlights: activeHighlights,
            count: activeHighlights.length,
            timestamp: new Date().toISOString(),
            activeUsers: allActiveConnections,
        });
        console.log(`📤 [WS] Notified bid activity monitors about subscription. Total active: ${activeBidHighlights.size}`);
    });
    socket.on('UNHIGHLIGHT_BID', (obj) => {
        const bidPageRoom = `userHighlight:${obj.userId}:${obj.bidId}`;
        socket.leave(bidPageRoom);

        if (activeBidHighlights.has(obj.userId)) {
            const userConnections = activeBidHighlights.get(obj.userId);
            const connectionId = `${obj.userId}_${socket.id}_${obj.bidId}`;
            const initialLength = userConnections.length;
            activeBidHighlights.set(obj.userId,
                userConnections.filter(conn => conn.connectionId !== connectionId)
            );

            const finalLength = activeBidHighlights.get(obj.userId).length;
            const wasRemoved = initialLength > finalLength;

            if (finalLength === 0) {
                activeBidHighlights.delete(obj.userId);
            }

            if (wasRemoved) {
                const allActiveConnections = getAllActiveConnectionsBids();
                const activeHighlights = getActiveHighlightsBids();
                io.to('bidActivityMonitor').emit('ACTIVE_HIGHLIGHTS_LIST_BIDS', {
                    event: 'ACTIVE_HIGHLIGHTS_LIST_BIDS',
                    activeHighlights: activeHighlights,
                    count: activeHighlights.length,
                    timestamp: new Date().toISOString(),
                    activeUsers: allActiveConnections,
                });
                console.log(`📤 [WS] Removed connection: ${connectionId}. User connections: ${finalLength}, Global: ${allActiveConnections.length}`);
            } else {
                console.log(`❌ Connection not found: ${connectionId}`);
            }
        }
    });
    /* - BID LIST */

    // Обработка ошибок подключения
    socket.on('connect_error', (err) => {
        console.log('Connection error:', err.message, err.description, err.context)
    })

    // Обработка отключения
    socket.on('disconnect', (reason) => {
        console.log(`❌ User disconnected: ${socket.id}, reason: ${reason}`);
        let removedConnectionsOrgs = [];
        let removedConnectionsBids = [];

        for (const [userId, userConnections] of activeOrgHighlights.entries()) {
            const connectionsToRemove = userConnections.filter(conn => conn.socketId === socket.id);
            if (connectionsToRemove.length > 0) {
                removedConnectionsOrgs.push(...connectionsToRemove);
                const updatedConnections = userConnections.filter(conn => conn.socketId !== socket.id);
                if (updatedConnections.length === 0) {
                    activeOrgHighlights.delete(userId);
                } else {
                    activeOrgHighlights.set(userId, updatedConnections);
                }
            }
        }
        for (const [userId, userConnections] of activeBidHighlights.entries()) {
            const connectionsToRemove = userConnections.filter(conn => conn.socketId === socket.id);
            if (connectionsToRemove.length > 0) {
                removedConnectionsBids.push(...connectionsToRemove);
                const updatedConnections = userConnections.filter(conn => conn.socketId !== socket.id);
                if (updatedConnections.length === 0) {
                    activeBidHighlights.delete(userId);
                } else {
                    activeBidHighlights.set(userId, updatedConnections);
                }
            }
        }

        if (removedConnectionsOrgs.length > 0) {
            const allActiveConnections = getAllActiveConnectionsOrgs();
            removedConnectionsOrgs.forEach(connection => {
                const activeHighlights = getActiveHighlightsOrgs();
                io.to('orgActivityMonitor').emit('ACTIVE_HIGHLIGHTS_LIST_ORGS', {
                    event: 'ACTIVE_HIGHLIGHTS_LIST_ORGS',
                    activeHighlights: activeHighlights,
                    count: activeHighlights.length,
                    timestamp: new Date().toISOString(),
                    activeUsers: allActiveConnections,
                });
                console.log(`📤 [WS] Disconnected: user ${connection.userId} from bid ${connection.orgId}`);
            });
            console.log(`📤 [WS] Removed ${removedConnectionsOrgs.length} connections for socket ${socket.id}. Total active: ${allActiveConnections.length}`);
        }
        if (removedConnectionsBids.length > 0) {
            const allActiveConnections = getAllActiveConnectionsBids();
            removedConnectionsBids.forEach(connection => {
                const activeHighlights = getActiveHighlightsBids();
                io.to('bidActivityMonitor').emit('ACTIVE_HIGHLIGHTS_LIST_BIDS', {
                    event: 'ACTIVE_HIGHLIGHTS_LIST_BIDS',
                    activeHighlights: activeHighlights,
                    count: activeHighlights.length,
                    timestamp: new Date().toISOString(),
                    activeUsers: allActiveConnections,
                });
                console.log(`📤 [WS] Disconnected: user ${connection.userId} from bid ${connection.bidId}`);
            });
            console.log(`📤 [WS] Removed ${removedConnectionsBids.length} connections for socket ${socket.id}. Total active: ${allActiveConnections.length}`);
        }
    });
})
// ОБРАБОТЧИКИ СОБЫТИЙ SOCKET.IO ----------------------------------------------------------------

// ОБРАБОТЧИКИ API ROUTES ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
/* + CHAT */
app.post('/api/sms/new-sms', (req, res) => {
  try {
    const route = '/api/sms/new-sms';
    const { left, right } = req.body;
    const eventName = route.split('/').pop().replace(/-/g, ':');
    const recipientId = left.to.id;
    const recipientRoom = `user:${recipientId}`;

    io.to(recipientRoom).emit(eventName, { left, right });

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Error in API route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.post('/api/sms/update-sms', (req, res) => {
  try {
    const route = '/api/sms/update-sms';
    const { sms } = req.body;
    //for (var key in sms){
    //  console.log( key + ": " + sms[key]);
    //}
    const eventName = route.split('/').pop().replace(/-/g, ':');

    const recipientId = sms.from;
    const recipientRoom = `user:${recipientId}`;

    io.to(recipientRoom).emit(eventName, { sms });

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Error in API route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
/* - CHAT */

/* + NOTIFICATION */
app.post('/api/notification/engineer', (req, res) => {
    try {
        const route = '/api/notification/engineer';
        const { engineers, message } = req.body;
        const recipientRoom = engineers.map(eng => {
            return `userNotification:${eng}`;
        });

        recipientRoom.forEach(room => {
            io.to(room).emit('new:notification', {message});
        });

        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Error in API route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/* - NOTIFICATION */

/* + ORGS */
app.post('/api/org/create', (req, res) => {
    try {
        io.to('orgActivityMonitor').emit('REFRESH_PAGE');
        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Error in API route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/api/org/update', (req, res) => {
    try {
        console.log(req.body);
        const { org_id } = req.body.data;
        io.to('orgActivityMonitor').emit('UPDATE_ORG', { org_id });
        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Error in API route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/* - ORGS */

/* + BIDS */
app.post('/api/bid/create', (req, res) => {
    try {
        io.to('bidActivityMonitor').emit('REFRESH_PAGE');
        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Error in API route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/api/bid/update', (req, res) => {
    try {
        console.log(req.body);
        const { bid_id } = req.body.data;
        io.to('bidActivityMonitor').emit('REFRESH_BID', { bid_id });
        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Error in API route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/api/bid/check-busy', (req, res) => {
    try {
        const { bid_id } = req.body;
        const usersOnBid = [];
        for (const [userId, userConnections] of activeBidHighlights.entries()) {
            const connectionsToThisBid = userConnections.filter(conn =>
                conn.bidId === bid_id.toString()
            );
            if (connectionsToThisBid.length > 0) {
                const userInfo = connectionsToThisBid[0];
                usersOnBid.push({
                    userId: userInfo.userId,
                });
            }
        }
        console.log(`🔍 Check busy for bid ${bid_id}: ${usersOnBid.length} users found`);
        res.json({
            users_on_bid: usersOnBid,
            count: usersOnBid.length,
            bid_id: bid_id,
            status: 'ok',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in API route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/* - BIDS */

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
