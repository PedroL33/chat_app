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
var users = mongoose.model('User');

var onlineUsers = {};

io.use(function(socket, next) {
  var query = socket.handshake.query
  if(query && query.token) {
    try{
      jwt.verify(query.token, process.env.JWTSECRET, function(err, decoded) {
        if(decoded.exp < Date.now()/1000) {
          return next(new Error("Invalid token."))
        }else {
          socket.username = decoded.username
          next()
        }
      })
    }
    catch {
      return next(new Error("Invalid token."))
    }
  }
})
.on("connection", function(socket) {
  console.log(`${socket.username} connected to server.`);
  onlineUsers[socket.username] = socket;

  socket.on('get_data', () => {
    users.find({username: socket.username})
    .then(user => {
      var online = []
      var offline = []
      user[0].friends.forEach(friend => {
        if(onlineUsers[friend]) {
          online.push(friend)
        }else {
          offline.push(friend)
        }
      })
      var userData = {
        online: online,
        offline: offline,
        requests: user[0].requests
      }
      socket.emit('data', userData)
    })
  })

  socket.on('new_user', () => {
    users.find({username: socket.username})
    .then( user => {
      var friends = user[0].friends
      for(user in onlineUsers) {
        if(friends.includes(onlineUsers[user].username)) {
          onlineUsers[user].emit('new_online_friend', socket.username)
        }
      }
    })
  });

  socket.on('send_request', friend => {
    users.sendRequest(socket.username, friend).then(response => {
      if(response.success) {
        socket.emit('new_notification', response.success)
        if(onlineUsers[friend]) {
          onlineUsers[friend].emit("new_notification", `${socket.username} has sent you a friend request`)
          onlineUsers[friend].emit('new_request', socket.username)
        }
      }else {
        socket.emit('new_notification', response.error)
      }
    })
  })

  socket.on('accept_request', request => {
    users.acceptRequest(socket.username, request)
    .then(response => {
      if(response.success) {
        if(onlineUsers[request]) {
          onlineUsers[request].emit('new_online_friend', socket.username)
          socket.emit('new_online_friend', request)
        }else {
          socket.emit('new_offline_friend', request)
        }
        socket.emit('remove_request', request)
      }
    })
    users.find({username: request})
    .then(user => {
      var friend = user[0]
      friend.friends.push(socket.username)
      friend.save()
    })
  })

  socket.on('disconnect', () => {
    delete onlineUsers[socket.username]
    users.find({username: socket.username})
    .then( user => {
      var friends = user[0].friends
      for(user in onlineUsers) {
        if(friends.includes(onlineUsers[user].username)) {
          onlineUsers[user].emit('new_offline_friend', socket.username)
        }
      }
    })
    console.log("User disconnected.")
  })
})
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/', indexRouter)
server.listen(port, () => 
  console.log(`Listening on port ${port}`)
)

module.exports = app;
