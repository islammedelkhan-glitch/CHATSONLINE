const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

app.use(express.json());
app.use(express.static(__dirname));

// MongoDB сілтемесі
const mongoURI = "mongodb+srv://islammedelkhan_db_user:sVjFAe30NltnT5Cd@cluster0.qmvz3zc.mongodb.net/chatDB?retryWrites=true&w=majority&appName=Cluster0"; 

mongoose.connect(mongoURI)
    .then(() => console.log("MongoDB қосылды!"))
    .catch(err => console.error("БД қатесі:", err));

// Пайдаланушы моделі
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// Тіркелу
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.json({ success: false, message: "Деректер толық емес" });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: "Бұл логин бос емес" });
    }
});

// Кіру
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            res.json({ success: true, username: user.username });
        } else {
            res.json({ success: false, message: "Қате логин не пароль" });
        }
    } catch (err) {
        res.json({ success: false, message: "Сервер қатесі" });
    }
});

io.on('connection', (socket) => {
    socket.on('join', (data) => socket.join(data.room));
    socket.on('message', (data) => {
        io.to(data.room).emit('msg', { user: data.user, text: data.text });
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Сервер ${PORT} портында қосылды`));