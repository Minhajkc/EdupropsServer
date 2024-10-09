const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const cors = require('cors');
const studentRoutes = require('./Routes/studentRoutes');
const adminRoutes = require('./Routes/adminRoutes');
const mentorRoutes = require('./Routes/mentorRoutes');
const http = require('http'); // Import http module for server
const { Server } = require('socket.io'); // Import Socket.IO

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(cookieParser());

app.use(studentRoutes);
app.use(adminRoutes);
app.use(mentorRoutes);

app.get('/backend', (req, res) => {
    res.cookie('username', 'JohnDoe');
    res.send('Cookie has been set');
});

// Create an HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173', // Update this based on your front-end URL
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle messages
    socket.on('chat message', (msg) => {
        console.log('Message received:', msg);
        io.emit('chat message', msg); // Broadcast message to all clients
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start the server
server.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
});
