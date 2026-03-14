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

if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

const mongoURI = "mongodb+srv://islammedelkhan_db_user:sVjFAe30NltnT5Cd@cluster0.qmvz3zc.mongodb.net/chatDB?retryWrites=true&w=majority&appName=Cluster0"; 
mongoose.connect(mongoURI).then(() => console.log("MongoDB қосылды!"));

const User = mongoose.model('User', new mongoose.Schema({ username: { type: String, unique: true }, password: { type: String } }));
const Message = mongoose.model('Message', new mongoose.Schema({ from: String, to: String, text: String, time: { type: Date, default: Date.now } }));
const Status = mongoose.model('Status', new mongoose.Schema({ user: String, file: String, time: { type: Date, default: Date.now, expires: 86400 } }));

const upload = multer({ dest: './uploads/' });

app.post('/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (user && await bcrypt.compare(req.body.password, user.password)) res.json({ success: true, username: user.username });
    else res.json({ success: false });
});

app.get('/search', async (req, res) => {
    const users = await User.find({ username: { $regex: req.query.q, $options: 'i' } }).limit(10);
    res.json({ data: users.map(u => u.username) });
});

app.get('/messages', async (req, res) => {
    const msgs = await Message.find({ $or: [{ from: req.query.me, to: req.query.with }, { from: req.query.with, to: req.query.me }] }).sort('time');
    res.json(msgs);
});

app.post('/upload-status', upload.single('file'), async (req, res) => {
    const st = new Status({ user: req.body.user, file: `/uploads/${req.file.filename}` });
    await st.save();
    res.json({ success: true });
});

app.get('/statuses', async (req, res) => {
    const sts = await Status.find().sort('-time');
    res.json(sts);
});

io.on('connection', (socket) => {
    socket.on('join', (u) => socket.join(u));
    
    socket.on('msg', async (d) => {
        await new Message(d).save();
        io.to(d.to).to(d.from).emit('msg', d);
    });

    // ЗВОНОК СИГНАЛЫ (Осы жер звонокты істеткен жер)
    socket.on('call-user', (d) => {
        io.to(d.to).emit('incoming-call', { from: d.from, type: d.type });
    });

    socket.on('accept-call', (d) => {
        io.to(d.to).emit('call-accepted', { from: d.from });
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Сервер дайын!`));