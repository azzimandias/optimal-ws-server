const { WebSocketServer } = require('ws');

function createLogWSServer(server, metrics) {
  const wss = new WebSocketServer({ server });
  console.log('🚀 [LOG-WS] initialized');

  wss.on('connection', (socket, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`🧩 [LOG-WS] new connection from ${ip}`);
    metrics.connectedClients.set(wss.clients.size);

    // приветственное сообщение
    socket.send(
      JSON.stringify({
        message: '📡 Connected to log stream',
        time: new Date().toISOString(),
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
      console.log(`[LOG-WS] disconnected, total: ${wss.clients.size}`);
    });

    socket.on('error', (err) => {
      console.error('[LOG-WS] error:', err.message);
    });
  });

  // heartbeat для очистки мёртвых соединений
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

module.exports = createLogWSServer;
