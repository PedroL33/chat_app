var express = require('express');
require('dotenv').config();
var app = express();
var http = require('http');
var socketIO = require('socket.io')
var server = http.createServer(app);
var cors = require('cors');
app.use(cors())
var io = socketIO(server)
var indexRouter = require('./routes')
var port = process.env.PORT || 3000;
var moment = require('moment')

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var usersController = require('./controllers/usersController')
var requestsController = require('./controllers/requestsController')
var messagesController = require('./controllers/messagesController')

const auth = require('./Authentication/checkAuth');

var onlineUsers = {};
io.on("connection", async (socket) => {
  try{
    const decoded = await auth.checkAuth(socket);
    if(onlineUsers[decoded.username]) {
      socket.emit('duplicate_auth', "Already logged in somewhere.")
    }else {
      socket.username = decoded.username
      console.log(`${socket.username} connected to server.`);
      onlineUsers[socket.username] = socket;
      usersController.getCurrentUser(socket);
    }
  }catch(err) {
    socket.emit('invalid_auth')
  }

  socket.on('get_user_data', () => usersController.getUserData(socket, onlineUsers))

  socket.on('get_request_data', () => requestsController.getRequestData(socket))

  socket.on('get_message_data', () => messagesController.getMessageData(socket))

  socket.on('get_current_user', () => usersController.getCurrentUser(socket))

  socket.on('new_user', () => usersController.friendUpdate(socket, onlineUsers, {message: "has come online.", username: socket.username, time: moment(Date.now()).calendar()}))

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
    delete onlineUsers[socket.username]
    setTimeout(() => {
      if(!onlineUsers[socket.username]) {
        usersController.friendUpdate(socket, onlineUsers, {message: "has gone offline.", username: socket.username, time: moment(Date.now()).calendar()})
        console.log(`${socket.username} has disconnected.`)
      }
    }, 5000);
  })
})

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/', indexRouter)

server.listen(port, () => 
  console.log(`Listening on port ${port}`)
)

module.exports = app;
