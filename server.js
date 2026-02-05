const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static('uploads'));

// Фото/Видео сақталатын папка
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

// Базаға қосылу
const mongoURI = "mongodb+srv://islammedelkhan_db_user:sVjFAe30NltnT5Cd@cluster0.qmvz3zc.mongodb.net/chatDB?retryWrites=true&w=majority&appName=Cluster0"; 
mongoose.connect(mongoURI);

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    avatar: { type: String, default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' },
    hiddenChats: [{ target: String, code: String }] // Жасырын чаттар мен кодтары
});
const User = mongoose.model('User', UserSchema);

// Файлды сапалы сақтау баптауы
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// Файлдарды жүктеу API
app.post('/upload', upload.single('file'), (req, res) => {
    res.json({ url: `/uploads/${req.file.filename}`, type: req.file.mimetype });
});

// Чатты жасыру API
app.post('/hide-chat', async (req, res) => {
    const { owner, target, code } = req.body;
    await User.findOneAndUpdate({ username: owner }, { $push: { hiddenChats: { target, code } } });
    res.json({ success: true });
});

// Іздеу (Қарапайым және Код арқылы жасырын чатты табу)
app.get('/search', async (req, res) => {
    const { q, user } = req.query;
    const me = await User.findOne({ username: user });
    
    // Егер жазылған сөз жасырын чаттың коды болса:
    const hidden = me.hiddenChats.filter(c => c.code === q);
    if (hidden.length > 0) {
        res.json({ type: 'hidden', data: hidden.map(h => h.target) });
    } else {
        const users = await User.find({ username: { $regex: q, $options: 'i' } });
        res.json({ type: 'public', data: users.map(u => ({ name: u.username, avatar: u.avatar })) });
    }
});

io.on('connection', (socket) => {
    socket.on('join', (u) => socket.join(u));
    socket.on('msg', (d) => io.to(d.to).to(d.from).emit('msg', d));
});

http.listen(process.env.PORT || 3000, () => console.log("Сервер іске қосылды!"));
