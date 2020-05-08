var express = require('express');
require('dotenv').config();
var app = express();
var http = require('http');
var socketIO = require('socket.io')
var server = http.createServer(app);
const cors = require('cors');
const io = socketIO(server)
const indexRouter = require('./routes')
app.use(cors())
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 3000;
var mongoose = require('mongoose');
mongoose.connect(process.env.MongoDB, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
var messages = require('./models/messages');

var usersController = require('./controllers/usersController')
var requestsController = require('./controllers/requestsController')
var messagesController = require('./controllers/messagesController')

var onlineUsers = {};

io.on("connection", function(socket) {
  var query = socket.handshake.query
  if(query && query.token) {
    try{
      jwt.verify(query.token, process.env.JWTSECRET, function(err, decoded) {
        if(decoded.exp < Date.now()/1000) {
          socket.emit('invalid_auth')
        } else if(onlineUsers[decoded.username]) {
          socket.emit('duplicate_auth', "Already logged in somewhere.")
        }else {
          socket.username = decoded.username
          console.log(`${socket.username} connected to server.`);
          onlineUsers[socket.username] = socket;
          socket.emit('logged_in', decoded.username)
        }
      })
    }
    catch {
        socket.emit('invalid_auth')
    }
  }

  socket.on('get_user_data', (token) => usersController.getUserData(socket, onlineUsers, token))

  socket.on('get_request_data', (token) => requestsController.getRequestData(socket, token))

  socket.on('get_message_data', (token) => messagesController.getMessageData(socket, token))

  socket.on('new_user', () => usersController.addUser(socket, onlineUsers));

  socket.on('send_request', (friend) => requestsController.sendRequest(socket, onlineUsers, friend))

  socket.on('accept_request', (request) => requestsController.acceptRequest(socket, onlineUsers, request))

  socket.on('message', (message) => messagesController.createMessage(socket, onlineUsers, message))

  socket.on('mark_read', (from) => messagesController.markRead(socket, from))

  socket.on('started_typing', (data) => onlineUsers[data.to].emit('friend_is_typing', data.from))

  socket.on('stopped_typing', (data) => onlineUsers[data.to].emit('friend_stopped_typing', data.from))

  socket.on('disconnect', () => {
    delete onlineUsers[socket.username]
    setTimeout(() => {
      if(!onlineUsers[socket.username]) {
        usersController.removeUser(socket, onlineUsers)
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
