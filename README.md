# CyberDuel AR

CyberDuel AR es una experiencia de realidad aumentada interactiva y multijugador desarrollada como aplicación web progresiva. Está diseñada para ejecutarse directamente en navegadores modernos compatibles con WebXR, sin necesidad de instalación previa. La aplicación permite a dos jugadores competir en un entorno compartido de realidad aumentada, donde deben encontrar y tocar esferas virtuales que activan minijuegos aleatorios.


## Estructura del Proyecto

El repositorio está organizado de la siguiente manera:

```bash
client/
├── assets/ # Archivos
├── cert/ # Aquí se debe introducir el certificado autofirmado que se genere
├── index.html # Entrada principal de la app
├── main.js # Lógica del cliente AR y minijuegos
├── styles.css 
├── serverexpress.js # Servidor HTTPS de la app
└── package.json # Dependencias

server/
├── ws-server.js # Servidor WebSocket seguro
└── package.json # Dependencias
```

## Requisitos

- Node.js ≥ 18.x
- Dispositivo con compatibilidad WebXR (Android con Chrome/Edge)
- Conexión en red local entre dispositivos
- Certificados autofirmados válidos para HTTPS/WSS

## Instalación

### 1. Instalar dependencias

Ejecuta el siguiente comando en los dos directorios principales:

```bash
cd client
npm install

cd ../server
npm install
```

### 2. Generar certificados autofirmados
Para permitir la ejecución de WebXR y WebSockets en dispositivos móviles mediante HTTPS/WSS, debes generar un certificado autofirmado. Puedes hacerlo con OpenSSL o siguiendo la documentación oficial de Microsoft:

```bash
openssl req -x509 -newkey rsa:2048 -nodes -keyout clave.pem -out certificado.pem -days 365
```

### 3. Iniciar los servidores

```bash
cd client
node serverexpress.js
Esto arrancará el servidor en https://<IP_LOCAL>:443.
```

Servidor WebSocket
```bash
cd server
node ws-server.js
Esto iniciará el servidor WSS en wss://<IP_LOCAL>:8080.
```

### 4. Uso desde el móvil

- Asegúrate de estar en la misma red WiFi que el servidor.

- Abre en el navegador móvil la URL: https://<IP_LOCAL>

- Acepta el certificado de seguridad (si es autofirmado).

- Permite el acceso a la cámara.

- Espera a que ambos jugadores estén conectados para comenzar.

## Funcionalidades
   
- Generación de esferas AR sincronizadas para dos jugadores.

- Minijuegos activados al tocar esferas (preguntas, reflejos, memoria...).

- Interfaz accesible y dinámica.

- Sincronización en tiempo real mediante WebSocket seguro (WSS).


