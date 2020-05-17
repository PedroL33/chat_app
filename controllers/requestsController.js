const neo4j = require('neo4j-driver');
var driver = neo4j.driver(process.env.GRAPHENEDB_BOLT_URL, neo4j.auth.basic(process.env.GRAPHENEDB_BOLT_USER, process.env.GRAPHENEDB_BOLT_PASSWORD), { encrypted : true });
var auth = require('../Authentication/checkAuth')
var moment = require('moment');

module.exports.getRequestData = function(socket, token) {
  auth.checkAuth(token, (res) => {
    if(res) {
      var session = driver.session();
      session.run(
        `MATCH (:user { username: '${socket.username}'}) <- [r:FRIEND {status: 'requested'}] - (request:user)
        RETURN request`
      )
      .then(result => {
        var requestData = []
        if(result.records.length) {
          result.records.forEach(item => {
            requestData.push(item._fields[0].properties.username)
          })
        }
        socket.emit('request_data', requestData)
      })
      .finally(() => {
        session.close();
      }) 
    }else {
      socket.emit('invalid_auth')
    }
  }) 
}

module.exports.sendRequest = function(socket, onlineUsers, friend) {
  var session = driver.session();
  if(friend === socket.username) {
    socket.emit('request_message', {type: 'error', msg: 'Cannot add yourself.'})
  }else {
    session.run(
      `MATCH (from:user), (to:user) 
      WHERE from.username='${socket.username}' AND to.username='${friend}' 
      MERGE (from)-[r:FRIEND]-(to)
      ON CREATE SET r.status='requested'
      ON MATCH SET r.duplicate=true
      RETURN r`
    )
    .then(results => {
      if(!results.records.length) {
        socket.emit('request_message', {type: 'error', msg: 'User does not exist.'})
      }else if(results.records[0]._fields[0].properties.username === socket.username) {
        socket.emit('request_message', {type: 'error', msg: "Cannot add yourself."})
      }else if(results.records[0]._fields[0].properties.status === 'accepted') {
        socket.emit('request_message', {type: 'error', msg: "User is already your friend."})
      }else if(results.records[0]._fields[0].properties.duplicate) {
        socket.emit('request_message', {type: 'error', msg: "Request has already been sent"})
      }else {
        socket.emit('request_message', {type: 'success', msg: "Request sent."})
        onlineUsers[friend].emit('request_update')
      }
    })
    .finally(() => {
      session.close()
    })
  }
}

module.exports.acceptRequest = function(socket, onlineUsers, request) {
  var session = driver.session();
  session.run(
    `MATCH (:user { username: '${socket.username}'}) <- [r:FRIEND {status: 'requested'}] - (:user {username: '${request}'})
    SET r.status='accepted'
    RETURN r`
  )
  .then(results => {
    socket.emit('request_update')
    socket.emit('friend_update')
    onlineUsers[request].emit('friend_update')
    onlineUsers[request].emit('timeline_update', {message: "accepted your friend request.", username: socket.username, time: moment(Date.now()).calendar()})
  })
  .finally(() => {
    session.close()
  })
}

module.exports.declineRequest = function(socket, onlineUsers, request) {
  var session = driver.session();
  session.run(
    `MATCH (:user { username: '${socket.username}'}) <- [r:FRIEND {status: 'requested'}] - (:user {username: '${request}'})
    DELETE r`
  )
  .then(results => {
    socket.emit('request_update')
    onlineUsers[request].emit('timeline_update', {message: `declined your friend request`, username: socket.username, time: moment(Date.now()).calendar()})
  })
  .finally(() => {
    session.close()
  })
}