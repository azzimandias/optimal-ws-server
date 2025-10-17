const { WebSocketServer } = require('ws');

function createMainWSServer(server, metrics) {
  const wss = new WebSocketServer({ server });
  console.log('🚀 [MAIN-WS] initialized');

  wss.on('connection', (socket, req) => {
    console.log('[MAIN-WS] WebSocket connected');
    metrics.connectedClients.set(wss.clients.size);

    // приветственное сообщение
    socket.send(
      JSON.stringify({
        action: 'CONNECTED TO WS',
        title: 'Main Connected',
        type: 'info',
      })
    );

    // heartbeat
    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.on('close', () => {
      metrics.connectedClients.set(wss.clients.size);
      console.log('[MAIN-WS] disconnected, total:', wss.clients.size);
    });

    socket.on('error', (err) => {
      console.error('[MAIN-WS] WS Error:', err.message);
    });
  });

  // Очистка мёртвых соединений каждые 30 секунд
  const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (socket.isAlive === false) return socket.terminate();
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  return wss;
}

module.exports = createMainWSServer;
