const neo4j = require('neo4j-driver');
var driver = neo4j.driver(process.env.GRAPHENEDB_BOLT_URL, neo4j.auth.basic(process.env.GRAPHENEDB_BOLT_USER, process.env.GRAPHENEDB_BOLT_PASSWORD), { encrypted : true });
var auth = require('../Authentication/checkAuth')
var moment = require('moment');
const User = require('../models/users');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports.getRequestData = async (socket, token) => {
  if(auth.checkAuth(token)) {
    const user =  await User.findOne({username: socket.username}).populate('friends.user');
    const requests = user.friends.filter(item => item.status == "pending")
    socket.emit('request_data', requests);
  }else {
    socket.emit('invalid_auth')
  }
  // auth.checkAuth(token, (res) => {
  //   if(res) {
  //     var session = driver.session();
  //     session.run(
  //       `MATCH (:user { username: '${socket.username}'}) <- [r:FRIEND {status: 'requested'}] - (request:user)
  //       RETURN request`
  //     )
  //     .then(result => {
  //       var requestData = []
  //       if(result.records.length) {
  //         result.records.forEach(item => {
  //           requestData.push(item._fields[0].properties.username)
  //         })
  //       }
  //       socket.emit('request_data', requestData)
  //     })
  //     .finally(() => {
  //       session.close();
  //     }) 
  //   }else {
  //     socket.emit('invalid_auth')
  //   }
  // }) 
}

module.exports.sendRequest = async (socket, onlineUsers, friend) => {
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
  // var session = driver.session();
  // if(friend === socket.username) {
  //   socket.emit('request_message', {type: 'error', msg: 'Cannot add yourself.'})
  // }else {
  //   session.run(
  //     `MATCH (from:user), (to:user) 
  //     WHERE from.username='${socket.username}' AND to.username='${friend}' 
  //     MERGE (from)-[r:FRIEND]-(to)
  //     ON CREATE SET r.status='requested'
  //     ON MATCH SET r.duplicate=true
  //     RETURN r`
  //   )
  //   .then(results => {
  //     if(!results.records.length) {
  //       socket.emit('request_message', {type: 'error', msg: 'User does not exist.'})
  //     }else if(results.records[0]._fields[0].properties.username === socket.username) {
  //       socket.emit('request_message', {type: 'error', msg: "Cannot add yourself."})
  //     }else if(results.records[0]._fields[0].properties.status === 'accepted') {
  //       socket.emit('request_message', {type: 'error', msg: "User is already your friend."})
  //     }else if(results.records[0]._fields[0].properties.duplicate) {
  //       socket.emit('request_message', {type: 'error', msg: "Request has already been sent"})
  //     }else {
  //       socket.emit('request_message', {type: 'success', msg: "Request sent."})
  //       if(onlineUsers[friend]) {
  //         onlineUsers[friend].emit('request_update')
  //       }
  //     }
  //   })
  //   .finally(() => {
  //     session.close()
  //   })
  // }
}

module.exports.acceptRequest = async (socket, onlineUsers, request) => {
  const users = await User.find({ username: { $in: [request, socket.username]}});
  if(users.length===1) {
    socket.emit('request_message', {type: 'error', msg: 'User does not exist.'})
  }else {
    const me = users[0].username === request ? users[1]: users[0];
    const user = users[0].username === request ? users[0]: users[1];
    const userReq = me.friends.find(item => item.user.equals(user._id));
    userReq.status = "accepted";
    const meSaved = await me.save();
    if(meSaved) {
      user.friends.push({user: new ObjectId(socket.id), status: "accepted"});
      const userSaved = await user.save();
      if(userSaved) {
        socket.emit('request_update')
        socket.emit('friend_update')
        if(onlineUsers[request]) {
          onlineUsers[request].emit('friend_update')
          // onlineUsers[request].emit('timeline_update', {message: "accepted your friend request.", username: socket.username, time: moment(Date.now()).calendar()})
        }
      }
    }
  }
  // var session = driver.session();
  // session.run(
  //   `MATCH (:user { username: '${socket.username}'}) <- [r:FRIEND {status: 'requested'}] - (:user {username: '${request}'})
  //   SET r.status='accepted'
  //   RETURN r`
  // )
  // .then(results => {
  //   socket.emit('request_update')
  //   socket.emit('friend_update')
  //   if(onlineUsers[request]) {
  //     onlineUsers[request].emit('friend_update')
  //     onlineUsers[request].emit('timeline_update', {message: "accepted your friend request.", username: socket.username, time: moment(Date.now()).calendar()})
  //   }
  // })
  // .finally(() => {
  //   session.close()
  // })
}

module.exports.declineRequest = async (socket, onlineUsers, request) => {
  const user = await User.findOne({username: socket.username}).populate('friends.user');
  user.friends = user.friends.filter(item => item.user.username !== request);
  const res = await user.save();
  if(res) {
    socket.emit('request_update')
    if(onlineUsers[request]) {
      onlineUsers[request].emit('timeline_update', {message: `declined your friend request`, username: socket.username, time: moment(Date.now()).calendar()})
    }
  }
  // var session = driver.session();
  // session.run(
  //   `MATCH (:user { username: '${socket.username}'}) <- [r:FRIEND {status: 'requested'}] - (:user {username: '${request}'})
  //   DELETE r`
  // )
  // .then(results => {
  //   socket.emit('request_update')
  //   if(onlineUsers[request]) {
  //     onlineUsers[request].emit('timeline_update', {message: `declined your friend request`, username: socket.username, time: moment(Date.now()).calendar()})
  //   }
  // })
  // .finally(() => {
  //   session.close()
  // })
}