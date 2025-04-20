const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

console.log("Servidor WebSocket escuchando en ws://localhost:8080");

wss.on('connection', function connection(ws) {
  console.log("🔌 Cliente conectado");

  ws.on('message', function incoming(message) {
    console.log(`📩 Mensaje recibido: ${message}`);

    // Puedes enviar respuesta si quieres
    ws.send('🧠 Servidor recibió tu mensaje');
  });

  ws.on('close', () => {
    console.log("❌ Cliente desconectado");
  });
});
