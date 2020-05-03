const neo4j = require('neo4j-driver');
var driver = neo4j.driver('bolt://localhost:11002', neo4j.auth.basic('neo4j', "Pass11word"));
var auth = require('../Authentication/checkAuth')

module.exports.getUserData = function (socket, onlineUsers, token) {
  auth.checkAuth(token, (res) => {
    if(res) {
      var session = driver.session();
      session.run(
        `MATCH (:user { username: '${socket.username}'}) - [r:FRIEND {status: 'accepted'}] - (friend:user)
        RETURN friend`
      )
      .then( result => {
        var online = {}
        var offline = {}
        if(result.records.length) {
            result.records.forEach(item => {
            if(onlineUsers[item._fields[0].properties.username]) {
                online[item._fields[0].properties.username] = {
                  isTyping: false
                }
            }else {
                offline[item._fields[0].properties.username] = {
                  isTyping: false
                }
            }
            })
        }
        var userData = {
            online: online,
            offline: offline
        }
        socket.emit('user_data', userData);
      })
      .finally(() => {
          session.close();
      })
    }
    else {
      socket.emit('invalid_auth')
    }
  })
}

module.exports.addUser = function(socket, onlineUsers) {
  var session = driver.session();
  session.run(
    `MATCH (:user {username: '${socket.username}'}) - [r:FRIEND {status: 'accepted'}] - (friend:user)
    RETURN friend`
  )
  .then(results => {
    results.records.forEach(item => {
      if(onlineUsers[item._fields[0].properties.username]) {
        onlineUsers[item._fields[0].properties.username].emit('friend_update')
      }
    })
  })
  .finally(() => {
    session.close();
  })
}

module.exports.removeUser = function(socket, onlineUsers) {
  var session = driver.session();
  session.run(
    `MATCH (:user {username: '${socket.username}'}) - [r:FRIEND {status: 'accepted'}] - (friend:user)
    RETURN friend`
  )
  .then(results => {
    results.records.forEach(item => {
      if(onlineUsers[item._fields[0].properties.username]) {
        onlineUsers[item._fields[0].properties.username].emit('friend_update')
      }
    })
  })
  .finally(() => {
    session.close();
  })
  console.log(`${socket.username} disconnected.`)
}