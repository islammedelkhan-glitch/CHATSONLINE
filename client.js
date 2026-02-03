// Этот код должен быть в файле client.js
const socket = io();
const form = document.getElementById('form');
const input = document.getElementById('m');
const messages = document.getElementById('messages');
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const currentUserSpan = document.getElementById('current-user');
let username = '';

// --- Логика Входа/Выхода ---
function login() {
    const usernameInput = document.getElementById('username-input').value.trim();
    if (usernameInput) {
        username = usernameInput;
        localStorage.setItem('chatUsername', username); 
        
        currentUserSpan.textContent = `Вы: ${username}`;
        loginScreen.style.display = 'none';
        chatScreen.style.display = 'block';
        socket.emit('user connected', username);
    } else {
        alert('Пожалуйста, введите имя.');
    }
}

function logout() {
    localStorage.removeItem('chatUsername');
    location.reload(); 
}

window.onload = function() {
    const savedUsername = localStorage.getItem('chatUsername');
    if (savedUsername) {
        document.getElementById('username-input').value = savedUsername;
        login();
    }
};

// --- Логика Отправки Сообщений ---
form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (input.value) {
        const messageData = {
            user: username,
            text: input.value
        };
        socket.emit('chat message', messageData);
        input.value = '';
        addMessage(messageData, true); 
    }
});

// --- Логика Получения Сообщений ---
socket.on('chat message', function(msg) {
    if (msg.user !== username) {
        addMessage(msg, false);
    }
});

function addMessage(msg, isMe) {
    const item = document.createElement('li');
    item.classList.add(isMe ? 'message-me' : 'message-other');
    
    if (!isMe) {
        const userSpan = document.createElement('div');
        userSpan.classList.add('message-user');
        userSpan.textContent = msg.user;
        item.appendChild(userSpan);
    }
    
    const textNode = document.createTextNode(msg.text);
    item.appendChild(textNode);
    
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight; 
}