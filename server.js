const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// Настройка базы данных
let db;
(async () => {
    db = await open({
        filename: 'chat.db',
        driver: sqlite3.Database
    });
    // Создаем таблицу, если её нет
    await db.exec('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, text TEXT)');
})();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', async (socket) => {
    console.log('Пользователь подключился');

    // 1. Отправляем историю сообщений новому пользователю
    const messages = await db.all('SELECT user, text FROM messages');
    socket.emit('chat history', messages);

    // 2. Обработка нового сообщения
    socket.on('chat message', async (msg) => {
        // Сохраняем в базу данных
        await db.run('INSERT INTO messages (user, text) VALUES (?, ?)', [msg.user, msg.text]);
        // Рассылаем всем
        io.emit('chat message', msg);
    });
});

http.listen(3000, () => {
    console.log('Сервер с базой данных запущен: http://localhost:3000');
});