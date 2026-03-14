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

// БАЗА СХЕМАСЫ
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: { type: String },
    theme: { type: String, default: '#0b141a' }
});
const MessageSchema = new mongoose.Schema({
    from: String, to: String, text: String, time: { type: Date, default: Date.now }
});
const CallSchema = new mongoose.Schema({
    from: String, to: String, type: String, time: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);
const Call = mongoose.model('Call', CallSchema);

const upload = multer({ dest: './uploads/' });

// ТАРИХТЫ АЛУ
app.get('/messages', async (req, res) => {
    const msgs = await Message.find({
        $or: [{ from: req.query.me, to: req.query.with }, { from: req.query.with, to: req.query.me }]
    }).sort('time');
    res.json(msgs);
});

app.get('/calls', async (req, res) => {
    const calls = await Call.find({ $or: [{ from: req.query.me }, { to: req.query.me }] }).sort('-time');
    res.json(calls);
});

app.get('/search', async (req, res) => {
    const users = await User.find({ username: { $regex: req.query.q, $options: 'i' } }).limit(5);
    res.json({ data: users.map(u => u.username) });
});

app.post('/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        res.json({ success: true, username: user.username });
    } else { res.json({ success: false }); }
});

io.on('connection', (socket) => {
    socket.on('join', (u) => socket.join(u));
    socket.on('msg', async (d) => {
        await new Message(d).save();
        io.to(d.to).to(d.from).emit('msg', d);
    });
    socket.on('save-call', async (d) => {
        await new Call(d).save();
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Сервер қосылды!`));