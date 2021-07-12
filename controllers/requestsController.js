var auth = require('../Authentication/checkAuth')
var moment = require('moment');
const User = require('../models/users');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports.getRequestData = async (socket, token) => {
  try {
    if(auth.checkAuth(token)) {
      const user =  await User.findOne({username: socket.username}).populate('friends.user');
      console.log(socket.username)
      const requests = user.friends.filter(item => item.status == "pending")
      socket.emit('request_data', requests);
    }else {
      socket.emit('invalid_auth')
      console.log('getRequest')
    }
  }catch(err) {
    console.log("getRequestData error");
  }
}

module.exports.sendRequest = async (socket, onlineUsers, friend, token) => {
  if(friend === socket.username) {
    socket.emit('request_message', {type: 'error', msg: 'Cannot add yourself.'})
  }else {
    const users = await User.find({ username: { $in: [friend, socket.username]}});
    if(users.length===1) {
      socket.emit('request_message', {type: 'error', msg: 'User does not exist.'})
    }else {
      const me = users[0].username === friend ? users[1]: users[0];
      const user = users[0].username === friend ? users[0]: users[1];
      const alreadyRecieved = me.friends.find(item => item.user.equals(user._id));
      const alreadySent = user.friends.find(item => item.user.equals(socket.id));
      if(alreadyRecieved) {
        if(alreadyRecieved.status === "pending") {
          socket.emit('request_message', {type: 'error', msg: "This user has already sent you a request."})
        }else {
          socket.emit('request_message', {type: 'error', msg: 'User is already your friend.'})
        }
      }else if(alreadySent) {
        if(alreadySent.status === "pending") {
          socket.emit('request_message', {type: 'error', msg: "Request has already been sent"})
        }else {
          socket.emit('request_message', {type: 'error', msg: 'User is already your friend.'})
        }
      }else {
        user.friends.push({
          user: new ObjectId(socket.id)
        })
        await user.save();
        socket.emit('request_message', {type: 'success', msg: "Request sent."})
        if(onlineUsers[friend]) {
          onlineUsers[friend].emit('request_update')
        }
      }
    }
  }
}

module.exports.acceptRequest = async (socket, onlineUsers, request, token) => {
  try {
    if(auth.checkAuth(token)) {
      const users = await User.find({ username: { $in: [request, socket.username]}});
      if(users.length===1) {
        socket.emit('request_message', {type: 'error', msg: 'User does not exist.'})
      }else {
        const me = users[0].username === request ? users[1]: users[0];
        const user = users[0].username === request ? users[0]: users[1];
        const userReq = me.friends.find(item => item.user.equals(user._id));
        userReq.status = "accepted";
        await me.save();
        user.friends.push({user: new ObjectId(socket.id), status: "accepted"});
        await user.save();
        socket.emit('request_update')
        socket.emit('friend_update')
        if(onlineUsers[request]) {
          onlineUsers[request].emit('friend_update')
          onlineUsers[request].emit('timeline_update', {message: "accepted your friend request.", username: socket.username, time: moment(Date.now()).calendar()})
        }
      }
    }else {
      socket.emit('invalid_auth');
    }
  }catch {
    console.log("acceptRequest error.")
  }
}

module.exports.declineRequest = async (socket, onlineUsers, request, token) => {
  try {
    if(auth.checkAuth(token)) {
      const user = await User.findOne({username: socket.username}).populate('friends.user');
      user.friends = user.friends.filter(item => item.user.username !== request);
      await user.save();
      socket.emit('request_update')
      if(onlineUsers[request]) {
        onlineUsers[request].emit('timeline_update', {message: `declined your friend request`, username: socket.username, time: moment(Date.now()).calendar()})
      }
    }
  }catch {
    console.log("declinerequest error.")
  }
}