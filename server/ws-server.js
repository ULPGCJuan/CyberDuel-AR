const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const path = require('path');

// Rutas a tus certificados
const options = {
  key: fs.readFileSync(path.join(__dirname, '../client/cert/clave.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../client/cert/certificado.pem')),
};

// Crear servidor HTTPS vacío para WebSocket

const httpsServer = https.createServer(options);

const wss = new WebSocket.Server({ server: httpsServer });

let clients = [];

wss.on('connection', (ws) => {
  clients.push(ws);
  console.log('Cliente conectado. Total:', clients.length);

  const isHost = clients.length === 1;
  ws.send(JSON.stringify({ type: 'role', role: isHost ? 'host' : 'client' }));

  if (clients.length === 2) {
    clients[0].send(JSON.stringify({ type: 'start' }));
  }

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.type === 'positions' && clients.length === 2) {
      clients[1].send(JSON.stringify({ type: 'positions', data: msg.data }));
    }

    if (msg.type === 'game-over') {
      // Enviar a todos los clientes la información del juego terminado
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'game-over',
            winner: msg.winner
          }));
        }
      });
    }
  });

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    console.log('Cliente desconectado. Total:', clients.length);
  });
});


httpsServer.listen(8080, () => {
  console.log('Servidor WebSocket seguro activo en wss://localhost:8080');
});