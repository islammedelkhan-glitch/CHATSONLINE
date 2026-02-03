const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const mongoURI = "mongodb+srv://islammedelkhan_db_user:sVjFAe30NltnT5Cd@cluster0.qmvz3zc.mongodb.net/chatDB?retryWrites=true&w=majority&appName=Cluster0"; 

mongoose.connect(mongoURI).then(() => console.log("MongoDB қосылды!"));

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// ПАЙДАЛАНУШЫЛАРДЫ ЛОГИН БОЙЫНША ІЗДЕУ
app.get('/search-user', async (req, res) => {
    const query = req.query.username;
    const users = await User.find({ username: { $regex: query, $options: 'i' } }).limit(5);
    res.json(users.map(u => u.username));
});

app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await new User({ username, password: hashedPassword }).save();
        res.json({ success: true });
    } catch (err) { res.json({ success: false, message: "Қате" }); }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        res.json({ success: true, username: user.username });
    } else { res.json({ success: false }); }
});

io.on('connection', (socket) => {
    socket.on('join', (data) => socket.join(data.room));
    socket.on('message', (data) => io.to(data.room).emit('msg', data));
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Сервер: ${PORT}`));