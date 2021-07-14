const neo4j = require('neo4j-driver');
var driver = new neo4j.driver(process.env.AURA_URI, neo4j.auth.basic(process.env.AURA_USER, process.env.AURA_PASSWORD));
var auth = require('../Authentication/checkAuth')
const AWS = require("aws-sdk");
const FileType = require('file-type');
const bluebird = require('bluebird');
const moment = require('moment');

AWS.config.update({
    accessKeyId: process.env.AWSAccessKeyId,
    secretAccessKey: process.env.AWSSecretKey
});
AWS.config.setPromisesDependency(bluebird);
const s3 = new AWS.S3();

const uploadFile = (buffer, name, type) => {
  const params = {
    ACL: 'public-read',
    Body: buffer,
    Bucket: 'chatbucket11',
    ContentType: type.mime,
    Key: `${name}.${type.ext}`
  };
  return s3.upload(params).promise();
};

module.exports.getCurrentUser = async (socket) => {
  const session = driver.session()
  try {
    const results = await session.readTransaction(tx => 
      tx.run(`MATCH (currentUser:user {username: $username}) RETURN currentUser`, {username: socket.username})
    )
    const currentUser = {}
    if(results && results.records) {
        currentUser.username = results.records[0]._fields[0].properties.username;
        currentUser.picture = results.records[0]._fields[0].properties.picture;
        currentUser.status = results.records[0]._fields[0].properties.status;
    }
    socket.emit('current_user_data', currentUser)
  }catch {
    console.log("Server error with get user.")
  }finally {
    await session.close();
  }
}

module.exports.getUserData = async (socket, onlineUsers, token) => {
  if(auth.checkAuth(token)) {
    const session = driver.session();
    try {
      const results = await session.readTransaction(tx =>
        tx.run(`MATCH (:user { username: $username}) - [r:FRIEND {status: 'accepted'}] - (friend:user)
        RETURN friend`, {username: socket.username})
      )
      var online = {}
      var offline = {}
      if(results.records.length) {
          results.records.forEach(item => {
          if(onlineUsers[item._fields[0].properties.username]) {
              online[item._fields[0].properties.username] = {
                isTyping: false,
                picture: item._fields[0].properties.picture, 
                status: item._fields[0].properties.status
              }
          }else {
              offline[item._fields[0].properties.username] = {
                isTyping: false,
                picture: item._fields[0].properties.picture, 
                status: item._fields[0].properties.status
              }
          }
          })
      }
      var userData = {
          online: online,
          offline: offline
      }
      socket.emit('user_data', userData);
    }catch {
      console.log("server error")
    }finally {
      await session.close();
    }
  }
  else {
    socket.emit('invalid_auth')
  }
}

module.exports.friendUpdate = async (socket, onlineUsers, data) => {
  const session = driver.session();
  try {
    const results = await session.readTransaction(tx =>
      tx.run(`MATCH (:user {username: $username}) - [r:FRIEND {status: 'accepted'}] - (friend:user) RETURN friend`, {username: socket.username})
    )
    results.records.forEach(item => {
      if(onlineUsers[item._fields[0].properties.username]) {
        onlineUsers[item._fields[0].properties.username].emit('friend_update')
        onlineUsers[item._fields[0].properties.username].emit('timeline_update', data)
      }
    })
  }catch {
    console.log("Server error with friend update.")
  }finally {
    await session.close();
  }
}

module.exports.uploadPhoto = async function(socket, file) {
  try {
    const type = await FileType.fromBuffer(file);
    const timestamp = Date.now().toString();
    const fileName = `bucketFolder/${timestamp}-lg`;
    const data = await uploadFile(file, fileName, type);
    var session = driver.session();
    session.run(
      `MATCH (currentUser:user {username: '${socket.username}'})
      set currentUser.picture='${data.Location}'`
    )
    .then(results => {
      socket.emit('update_complete', {message: "updated their profile picture.", username: socket.username, time: moment(Date.now()).calendar()})
    })
    .finally(() => session.close())
  }
  catch(err) {
    console.log(err)
  }
}

module.exports.updateStatus = function(socket, status) {
  var session = driver.session();
  session.run(
    `MATCH (currentUser:user {username: '${socket.username}'})
    set currentUser.status='${status}'`
  )
  .then(result => {
    socket.emit('update_complete', {message: `is now ${status}`, username: socket.username, time: moment(Date.now()).calendar()})
  })
  .finally(() => session.close())
}