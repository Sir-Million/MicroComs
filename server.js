const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir archivos estáticos desde la carpeta public
app.use(express.static('public'));

const rooms = {}; // Almacenamiento temporal de salas

app.get('/create-room', (req, res) => {
    const roomId = uuidv4(); // Genera un ID de sala único
    rooms[roomId] = []; // Crea una entrada para la sala
    res.send({ roomId });
});

// Ruta para manejar la sala
app.get('/room/:roomId', (req, res) => {
    res.sendFile(__dirname + '/public/index.html'); // Sirve el mismo archivo HTML para todas las salas
    res.sendFile(__dirname + '/public/normal.css'); // Sirve el mismo archivo CSS para todas las salas
    res.sendFile(__dirname + '/public/style.css'); // Sirve el mismo archivo CSS para todas las salas
});

io.on('connection', (socket) => {
    socket.on('joinRoom', (roomId) => {
        if (!rooms[roomId]) {
            // Si la sala no existe, no permitir unirse
            socket.emit('error', 'Sala no encontrada');
            return;
        }
        
        socket.join(roomId);
        rooms[roomId].push(socket.id);

        // Escuchar ofertas y respuestas de WebRTC
        socket.on('offer', (roomId, offer) => {
            socket.to(roomId).emit('offer', offer);
        });

        socket.on('answer', (roomId, answer) => {
            socket.to(roomId).emit('answer', answer);
        });

        socket.on('ice-candidate', (roomId, candidate) => {
            socket.to(roomId).emit('ice-candidate', candidate);
        });

        socket.on('disconnect', () => {
            rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
