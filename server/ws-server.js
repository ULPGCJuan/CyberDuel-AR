const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const path = require('path');


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

  
  let role = 'client' + clients.length;
  if (clients.length === 1) role = 'host';
  
  ws.role = role;
  ws.send(JSON.stringify({ type: 'role', role }));

  broadcast({ type: 'connected-users', count: clients.length });

  /*if (clients.length === 2) {
    clients[0].send(JSON.stringify({ type: 'start' }));
  }*/

  ws.on('message', (data) => {
    const msg = JSON.parse(data);

    if (msg.type === 'start' && ws === clients[0]) {
      clients.forEach(c => c.send(JSON.stringify({ type: 'start' })));
    }

    if (msg.type === 'positions') {
      clients.forEach(c => {
        if (c !== ws && c.readyState === WebSocket.OPEN) {
          c.send(JSON.stringify(msg));
        }
      });
    }


    if (msg.type === 'sphere-update') {
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'sphere-update',
            index: msg.index,
            owner: msg.owner
          }));
        }
      });
    }

    if (msg.type === 'score-update') {
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'score-update',
            scores: msg.scores
          }));
        }
      });
    }

    if (msg.type === 'game-over') {
      // Enviar a todos los clientes la información del juego terminado
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'game-over',
            winner: ws.role
          }));
        }
      });
    }
  });

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    broadcast({ type: 'connected-users', count: clients.length });
  });
  
});

function broadcast(msg) {
  clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(JSON.stringify(msg));
    }
  });
}


httpsServer.listen(8080, () => {
  console.log('Servidor WebSocket seguro activo en wss://localhost:8080');
});