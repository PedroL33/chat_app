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
<<<<<<< HEAD

var usersController = require('./controllers/usersController')
var requestsController = require('./controllers/requestsController')
var messagesController = require('./controllers/messagesController')

var onlineUsers = {};
io.on("connection", function(socket) {
  var query = socket.handshake.query
  if(query && query.token) {
    try{
      jwt.verify(query.token, process.env.JWTSECRET, (err, decoded) => {
        if(decoded.exp < Date.now()/1000) {
          socket.emit('invalid_auth')
        } else if(onlineUsers[decoded.id]) {
          socket.emit('duplicate_auth', "Already logged in somewhere.")
        }else {
          socket.username = decoded.username;
          socket.id = decoded.id;
          onlineUsers[decoded.username] = socket;
          usersController.getCurrentUser(socket, query.token);
          console.log(`${socket.username} connected to server.`);
        }
      })
    }
    catch {
        socket.emit('invalid_auth')
    }
=======
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
>>>>>>> old-state
  }

  socket.on('get_user_data', () => usersController.getUserData(socket, onlineUsers))

  socket.on('get_request_data', () => requestsController.getRequestData(socket))

  socket.on('get_message_data', () => messagesController.getMessageData(socket))

  socket.on('get_current_user', (token) => usersController.getCurrentUser(socket, token))

<<<<<<< HEAD
  socket.on('new_user', (token) => usersController.friendUpdate(socket, onlineUsers, {message: "has come online.", username: socket.username, time: moment(Date.now()).calendar()}, token))

  socket.on('send_request', (friend, token) => requestsController.sendRequest(socket, onlineUsers, friend, token))
=======
  socket.on('send_request', (friend) => requestsController.sendRequest(socket, onlineUsers, friend))
>>>>>>> old-state

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
