const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

const PORT = process.env.PORT || 3000;

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta de comprobación de salud
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Pelusas - Juegos AlanMath', timestamp: new Date() });
});

// Manejo básico de sockets
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor de Pelusas corriendo en el puerto ${PORT}`);
});
