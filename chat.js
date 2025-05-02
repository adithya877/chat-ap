// DOM elements
const logoutBtn = document.getElementById('logout-btn');
const usernameSpan = document.getElementById('username');
const userAvatar = document.getElementById('user-avatar');
const chatList = document.getElementById('chat-list');
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('file-input');
const chatNameSpan = document.getElementById('chat-name');
const chatAvatar = document.getElementById('chat-avatar');

// Global variables
let currentUser = null;
let selectedChatId = null;

// Initialize the app
function init() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadUserData();
            loadChats();
        } else {
            window.location.href = 'login.html';
        }
    });
}

// Load user data
function loadUserData() {
    db.collection('users').doc(currentUser.uid).get()
        .then((doc) => {
            if (doc.exists) {
                usernameSpan.textContent = doc.data().name;
            }
        });
}

// Load chats
function loadChats() {
    db.collection('chats')
        .where('participants', 'array-contains', currentUser.uid)
        .onSnapshot((snapshot) => {
            chatList.innerHTML = '';
            
            snapshot.forEach((doc) => {
                const chat = doc.data();
                const chatId = doc.id;
                const otherParticipantId = chat.participants.find(id => id !== currentUser.uid);
                
                // Get other participant's data
                db.collection('users').doc(otherParticipantId).get()
                    .then((userDoc) => {
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            const chatItem = document.createElement('div');
                            chatItem.className = 'chat-item';
                            chatItem.dataset.chatId = chatId;
                            
                            chatItem.innerHTML = `
                                <img src="${userData.photoURL || 'images/default-avatar.png'}" alt="${userData.name}">
                                <div class="chat-info">
                                    <div class="chat-name">${userData.name}</div>
                                    <div class="last-message">${chat.lastMessage || 'No messages yet'}</div>
                                </div>
                            `;
                            
                            chatItem.addEventListener('click', () => {
                                selectChat(chatId, userData);
                            });
                            
                            chatList.appendChild(chatItem);
                        }
                    });
            });
        });
}

// Select a chat
function selectChat(chatId, participantData) {
    selectedChatId = chatId;
    chatNameSpan.textContent = participantData.name;
    chatAvatar.src = participantData.photoURL || 'images/default-avatar.png';
    
    // Load messages
    loadMessages(chatId);
}

// Load messages
function loadMessages(chatId) {
    messagesContainer.innerHTML = '';
    
    db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const message = change.doc.data();
                    displayMessage(message);
                }
            });
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
}

// Display a message
function displayMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
    
    let contentHtml = '';
    if (message.type === 'text') {
        contentHtml = `<div class="message-text">${message.content}</div>`;
    } else if (message.type === 'file') {
        contentHtml = `
            <div class="file-message">
                <span class="file-icon">📄</span>
                <span class="file-name">${message.fileName}</span>
                <a href="${message.fileUrl}" class="download-btn" download>Download</a>
            </div>
        `;
    }
    
    messageDiv.innerHTML = `
        ${contentHtml}
        <div class="message-time">${new Date(message.timestamp?.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
}

// Send message
function sendMessage() {
    const content = messageInput.value.trim();
    if (!content || !selectedChatId) return;
    
    const message = {
        content: content,
        senderId: currentUser.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        type: 'text'
    };
    
    db.collection('chats').doc(selectedChatId).collection('messages').add(message)
        .then(() => {
            // Update last message in chat
            db.collection('chats').doc(selectedChatId).update({
                lastMessage: content,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            messageInput.value = '';
        })
        .catch((error) => {
            console.error('Error sending message:', error);
        });
}

// Send file
function sendFile(file) {
    if (!selectedChatId) return;
    
    const storageRef = storage.ref(`chat_files/${selectedChatId}/${file.name}`);
    const uploadTask = storageRef.put(file);
    
    uploadTask.on('state_changed',
        (snapshot) => {
            // Progress monitoring can be added here
        },
        (error) => {
            console.error('Upload error:', error);
        },
        () => {
            // Upload complete
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                const message = {
                    content: downloadURL,
                    senderId: currentUser.uid,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    type: 'file',
                    fileName: file.name,
                    fileUrl: downloadURL
                };
                
                db.collection('chats').doc(selectedChatId).collection('messages').add(message)
                    .then(() => {
                        // Update last message in chat
                        db.collection('chats').doc(selectedChatId).update({
                            lastMessage: `File: ${file.name}`,
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
            });
        }
    );
}

// Event listeners
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'login.html';
        });
    });
}

if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
}

if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

if (attachBtn) {
    attachBtn.addEventListener('click', () => {
        fileInput.click();
    });
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            sendFile(file);
        }
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
