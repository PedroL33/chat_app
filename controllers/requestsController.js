const neo4j = require('neo4j-driver');
var driver = new neo4j.driver(process.env.AURA_URI, neo4j.auth.basic(process.env.AURA_USER, process.env.AURA_PASSWORD));
var auth = require('../Authentication/checkAuth')
var moment = require('moment');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports.getRequestData = async (socket) => {
  const session = driver.session();
  try {
    await auth.checkAuth(socket)
    const result = await session.readTransaction(tx =>
      tx.run(`MATCH (:user { username: $username}) <- [r:FRIEND {status: 'requested'}] - (request:user) RETURN request`, {username: socket.username})
    )
    const requestData = []
    if(result.records.length) {
      result.records.forEach(item => {
        requestData.push(item._fields[0].properties)
      })
    }
    socket.emit('request_data', requestData)
  }catch(err) {
    if(err === "Auth error") {
      socket.emit("invalid_auth")
    }else {
      console.log("Server error while fetching request data.")
    }
  }finally {
    await session.close();
  }
}

module.exports.sendRequest = async (socket, onlineUsers, friend) => {
  const session = driver.session();
  try {
    await auth.checkAuth(socket);
    if(friend === socket.username) {
      socket.emit('request_message', {type: 'error', msg: 'Cannot add yourself.'})
    }else {
      const results = await session.writeTransaction(tx => 
        tx.run(`
          MATCH (from:user), (to:user) 
          WHERE from.username=$username AND to.username=$friend 
          MERGE (from)-[r:FRIEND]-(to)
          ON CREATE SET r.status='requested'
          ON MATCH SET r.duplicate=true
          RETURN r
        `, {username: socket.username, friend: friend})  
      )
      console.log(friend)
      if(!results.records.length) {
        socket.emit('request_message', {type: 'error', msg: 'User does not exist.'})
      }else if(results.records[0]._fields[0].properties.username === socket.username) {
        socket.emit('request_message', {type: 'error', msg: "Cannot add yourself."})
      }else if(results.records[0]._fields[0].properties.status === 'accepted') {
        socket.emit('request_message', {type: 'error', msg: "User is already your friend."})
      }else if(results.records[0]._fields[0].properties.duplicate) {
        socket.emit('request_message', {type: 'error', msg: "Request has already been sent"})
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
  }catch(err) {
    if(err === "Auth error") {
      socket.emit("invalid_auth")
    }else {
      console.log("Server error while sending request.")
    }
  }finally {
    await session.close();
  }
}

module.exports.acceptRequest = async (socket, onlineUsers, request) => {
  const session = driver.session();
  try {
    await session.writeTransaction(tx => 
      tx.run(
        `MATCH (:user { username: $username}) <- [r:FRIEND {status: 'requested'}] - (:user {username: $request})
        SET r.status='accepted' RETURN r`, {username: socket.username, request: request}
      )  
    )
    socket.emit('request_update')
    socket.emit('friend_update')
    if(onlineUsers[request]) {
      onlineUsers[request].emit('friend_update')
      onlineUsers[request].emit('timeline_update', {message: "accepted your friend request.", username: socket.username, time: moment(Date.now()).calendar()})
    }
  }catch(err) {
    if(err === "Auth error") {
      socket.emit("invalid_auth")
    }else {
      console.log("Server error while accepting request.")
    }
  }finally {
    await session.close();
  }
}

module.exports.declineRequest = async (socket, onlineUsers, request) => {
  const session = driver.session();
  try {
    await session.writeTransaction(tx =>
      tx.run(
        `MATCH (:user { username: $username}) <- [r:FRIEND {status: 'requested'}] - (:user {username: $request})
        DELETE r`, {username: socket.username, request, request}
      )  
    )
    socket.emit('request_update')
    if(onlineUsers[request]) {
      onlineUsers[request].emit('timeline_update', {message: `declined your friend request`, username: socket.username, time: moment(Date.now()).calendar()})
    }
  }catch(err) {
    if(err === "Auth error") {
      socket.emit("invalid_auth")
    }else {
      console.log("Server error while declining request.")
    }
  }finally {
    await session.close();
  }
}