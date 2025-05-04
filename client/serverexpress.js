const fs = require('fs');
const https = require('https');
const express = require('express');
const path = require('path');

const app = express();
const PORT = 443;

const options = {
  key: fs.readFileSync(path.join(__dirname+"/cert", 'clave.pem')),
  cert: fs.readFileSync(path.join(__dirname+"/cert", 'certificado.pem')),
};

app.use(express.static(__dirname));

// Ruta raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

https.createServer(options, app).listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor HTTPS activo en https://localhost`);
});
