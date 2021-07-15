const express = require('express');
require('dotenv').config();
const app = express();
const http = require('http');
const socketIO = require('socket.io')
const server = http.createServer(app);
const cors = require('cors');
const io = socketIO(server)
const indexRouter = require('./routes')
const port = process.env.PORT || 3000;
const debounce = require('./functions/debounce');

app.use(cors())
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

io.sockets.on("connection", async (socket) => {
  try{
    const decoded = await auth.checkAuth(socket);
    socket.username = decoded.username
    onlineUsers[socket.username] = socket;
    debounce.onConnect(socket, onlineUsers);
    usersController.getCurrentUser(socket);
  }catch(err) {
    socket.emit('invalid_auth')
  }

  socket.on('get_user_data', () => usersController.getUserData(socket, onlineUsers))

  socket.on('get_request_data', () => requestsController.getRequestData(socket))

  socket.on('get_message_data', () => messagesController.getMessageData(socket))

  socket.on('get_current_user', () => usersController.getCurrentUser(socket))

  socket.on('send_request', (friend) => requestsController.sendRequest(socket, onlineUsers, friend))

  socket.on('accept_request', (request) => requestsController.acceptRequest(socket, onlineUsers, request))
  
  socket.on('decline_request', (request) => requestsController.declineRequest(socket, onlineUsers, request))

  socket.on('message', (message) => messagesController.createMessage(socket, onlineUsers, message))

  socket.on('mark_read', (from) => messagesController.markRead(socket, from))

  socket.on('started_typing', (data) => onlineUsers[data.to] && onlineUsers[data.to].emit('friend_is_typing', data.from))

  socket.on('stopped_typing', (data) => onlineUsers[data.to] && onlineUsers[data.to].emit('friend_stopped_typing', data.from))

  socket.on('profile_photo', (file) => usersController.uploadPhoto(socket, file))

  socket.on('update_status', (status) => usersController.updateStatus(socket, status))

  socket.on('broadcast_update', (data) => usersController.friendUpdate(socket, onlineUsers, data))

  socket.on('disconnect', () => {
    debounce.onDisconnect(socket, onlineUsers);
    delete onlineUsers[socket.username]
  })
})

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/', indexRouter)

server.listen(port, () => 
  console.log(`Listening on port ${port}`)
)

module.exports = app;
