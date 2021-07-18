const express = require('express');
require('dotenv').config();
var app = express();
const cors = require('cors');
app.use(cors())
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
}); 
const indexRouter = require('./routes')
const debounce = require('./functions/debounce');

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const usersController = require('./controllers/usersController')
const requestsController = require('./controllers/requestsController')
const messagesController = require('./controllers/messagesController')
var indexController = require('./controllers')

const auth = require('./Authentication/checkAuth');

let onlineUsers = indexController.onlineUsers;
let lastOnline = {};

io.on("connection", async (socket) => {
  try{
    const decoded = await auth.checkAuth(socket);
    socket.username = decoded.username
    onlineUsers[socket.username] = socket;
    debounce.onConnect(socket, onlineUsers, lastOnline);
    usersController.getCurrentUser(socket);
  }catch(err) {
    socket.emit('invalid_auth')
  }

  socket.on('get_user_data', () => usersController.getUserData(socket, onlineUsers))

  socket.on('get_request_data', () => requestsController.getRequestData(socket))

  socket.on('get_message_data', () => messagesController.getMessageData(socket))

  socket.on('get_current_user', (token) => usersController.getCurrentUser(socket, token))

  socket.on('send_request', (friend) => requestsController.sendRequest(socket, onlineUsers, friend))

  socket.on('accept_request', (request, token) => requestsController.acceptRequest(socket, onlineUsers, request, token))
  
  socket.on('decline_request', (request, token) => requestsController.declineRequest(socket, onlineUsers, request, token))

  socket.on('message', (message) => messagesController.createMessage(socket, onlineUsers, message))

  socket.on('mark_read', (from) => messagesController.markRead(socket, from))

  socket.on('started_typing', (data) => onlineUsers[data.to] && onlineUsers[data.to].emit('friend_is_typing', data.from))

  socket.on('stopped_typing', (data) => onlineUsers[data.to] && onlineUsers[data.to].emit('friend_stopped_typing', data.from))

  socket.on('profile_photo', (file, token) => usersController.uploadPhoto(socket, file, token))

  socket.on('update_status', (status, token) => usersController.updateStatus(socket, status, token))

  socket.on('broadcast_update', (data, token) => usersController.friendUpdate(socket, onlineUsers, data, token))

  socket.on('disconnect', () => {
    lastOnline[socket.username] = Date.now();
    delete onlineUsers[socket.username]
    debounce.onDisconnect(socket, onlineUsers);
  })
})

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/', indexRouter)


const port = process.env.PORT || 3000;
server.listen(port, () => 
  console.log(`Listening on port ${port}`)
)

module.exports = app;
