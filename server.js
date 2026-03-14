const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static('uploads'));

const mongoURI = "mongodb+srv://islammedelkhan_db_user:sVjFAe30NltnT5Cd@cluster0.qmvz3zc.mongodb.net/chatDB?retryWrites=true&w=majority&appName=Cluster0"; 
mongoose.connect(mongoURI).then(() => console.log("MongoDB қосылды!"));

// СХЕМАЛАР
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: { type: String },
    avatar: { type: String, default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' },
    theme: { type: String, default: '#0b141a' } // 4-себеп: Тема сақтау
});

const MessageSchema = new mongoose.Schema({
    from: String, to: String, text: String, file: String, fType: String, time: { type: Date, default: Date.now }
});

const CallSchema = new mongoose.Schema({
    from: String, to: String, type: String, time: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);
const Call = mongoose.model('Call', CallSchema);

// ХАБАРЛАМАЛАРДЫ АЛУ (1-себеп)
app.get('/messages', async (req, res) => {
    const msgs = await Message.find({
        $or: [
            { from: req.query.me, to: req.query.with },
            { from: req.query.with, to: req.query.me }
        ]
    }).sort('time');
    res.json(msgs);
});

// ҚОҢЫРАУ ТАРИХЫН АЛУ (5-себеп)
app.get('/calls', async (req, res) => {
    const calls = await Call.find({ $or: [{ from: req.query.me }, { to: req.query.me }] }).sort('-time').limit(10);
    res.json(calls);
});

// ТЕМАНЫ ӨЗГЕРТУ (4-себеп)
app.post('/set-theme', async (req, res) => {
    await User.findOneAndUpdate({ username: req.body.username }, { theme: req.body.color });
    res.json({ success: true });
});

app.post('/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        res.json({ success: true, username: user.username, theme: user.theme });
    } else { res.json({ success: false }); }
});

// SOCKET ЛОГИКАСЫ
io.on('connection', (socket) => {
    socket.on('join', (u) => socket.join(u));
    socket.on('msg', async (d) => {
        const newMsg = new Message(d);
        await newMsg.save(); // Сақтау
        io.to(d.to).to(d.from).emit('msg', d);
    });
    socket.on('call-log', async (d) => {
        await new Call(d).save(); // Қоңырау тарихы
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Сервер қосылды!`));