const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Парольді шифрлау
const multer = require('multer');
const path = require('path');
const fs = require('fs');

app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static('uploads'));

// Папканы тексеру
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

// Базаға қосылу
const mongoURI = "mongodb+srv://islammedelkhan_db_user:sVjFAe30NltnT5Cd@cluster0.qmvz3zc.mongodb.net/chatDB?retryWrites=true&w=majority&appName=Cluster0"; 
mongoose.connect(mongoURI).then(() => console.log("MongoDB-ге сәтті қосылды!"));

// Пайдаланушы моделі
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    avatar: { type: String, default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' },
    hiddenChats: [{ target: String, code: String }],
    stories: [{ url: String, type: String, date: { type: Date, default: Date.now } }]
});
const User = mongoose.model('User', UserSchema);

// Multer баптау (Фото/Видео сапалы сақтау)
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// --- ТІРКЕЛУ ЖӘНЕ КІРУ (Сен сұраған бөлім) ---
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: "Логин бос емес немесе техникалық қате" });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            res.json({ success: true, username: user.username });
        } else {
            res.json({ success: false, message: "Логин немесе пароль қате" });
        }
    } catch (e) { res.json({ success: false }); }
});

// --- БАСҚА ФУНКЦИЯЛАР ---
app.post('/upload', upload.single('file'), (req, res) => {
    res.json({ url: `/uploads/${req.file.filename}`, type: req.file.mimetype });
});

app.post('/hide-chat', async (req, res) => {
    const { owner, target, code } = req.body;
    await User.findOneAndUpdate({ username: owner }, { $push: { hiddenChats: { target, code } } });
    res.json({ success: true });
});

app.get('/search', async (req, res) => {
    const { q, user } = req.query;
    const me = await User.findOne({ username: user });
    if(!me) return res.json({type: 'public', data: []});

    const hidden = me.hiddenChats.filter(c => c.code === q);
    if (hidden.length > 0) {
        res.json({ type: 'hidden', data: hidden.map(h => h.target) });
    } else {
        const users = await User.find({ username: { $regex: q, $options: 'i' } }).limit(5);
        res.json({ type: 'public', data: users.map(u => ({ name: u.username, avatar: u.avatar })) });
    }
});

// Socket.io
io.on('connection', (socket) => {
    socket.on('join', (u) => socket.join(u));
    socket.on('msg', (d) => io.to(d.to).to(d.from).emit('msg', d));
});

<<<<<<< HEAD
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Сервер ${PORT} портында істеп тұр`));
=======
http.listen(process.env.PORT || 3000, () => console.log("Сервер іске қосылды!"));
>>>>>>> ec7c43d98edb395e9b877ddb685e32945130dc2e
