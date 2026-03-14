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
    username: { type: String, unique: true },
    password: { type: String }
});
const MessageSchema = new mongoose.Schema({
    from: String, to: String, text: String, time: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);

app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        await new User({ username: req.body.username, password: hashedPassword }).save();
        res.json({ success: true });
    } catch (err) { res.json({ success: false }); }
});

app.post('/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        res.json({ success: true, username: user.username });
    } else { res.json({ success: false }); }
});

app.get('/search', async (req, res) => {
    const users = await User.find({ username: { $regex: req.query.q, $options: 'i' } }).limit(5);
    res.json({ data: users.map(u => u.username) });
});

app.get('/messages', async (req, res) => {
    const msgs = await Message.find({
        $or: [{ from: req.query.me, to: req.query.with }, { from: req.query.with, to: req.query.me }]
    }).sort('time');
    res.json(msgs);
});

io.on('connection', (socket) => {
    socket.on('join', (u) => socket.join(u));
    socket.on('msg', async (d) => {
        await new Message(d).save();
        io.to(d.to).to(d.from).emit('msg', d);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Сервер іске қосылды!`));