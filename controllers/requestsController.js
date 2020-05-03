const neo4j = require('neo4j-driver');
var driver = neo4j.driver('bolt://localhost:11002', neo4j.auth.basic('neo4j', "Pass11word"));
var auth = require('../Authentication/checkAuth')

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
  })
  .finally(() => {
    session.close()
  })
}