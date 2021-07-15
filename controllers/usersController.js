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
    await auth.checkAuth(socket);
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
  }catch(err) {
    if(err === "Auth error") {
      socket.emit("invalid_auth")
    }else {
      console.log("Server error fetching current user data.")
    }
  }finally {
    await session.close();
  }
}

module.exports.getUserData = async (socket, onlineUsers) => {
  const session = driver.session();
  try {
    await auth.checkAuth(socket);
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
  }catch(err) {
    if(err === "Auth error") {
      socket.emit("invalid_auth")
    }else {
      console.log("Server error while fetching users data.")
    }
  }finally {
    await session.close();
  }
}

module.exports.friendUpdate = async (socket, onlineUsers, data) => {
  const session = driver.session();
  try {
    await auth.checkAuth(socket);
    const results = await session.readTransaction(tx =>
      tx.run(`MATCH (:user {username: $username}) - [r:FRIEND {status: 'accepted'}] - (friend:user) RETURN friend`, {username: socket.username})
    )
    results.records.forEach(item => {
      if(onlineUsers[item._fields[0].properties.username]) {
        onlineUsers[item._fields[0].properties.username].emit('friend_update')
        onlineUsers[item._fields[0].properties.username].emit('timeline_update', data)
      }
    })
  }catch(err) {
    if(err === "Auth error") {
      socket.emit("invalid_auth")
    }else {
      console.log("Server error while fetching a friend update.")
    }
  }finally {
    await session.close();
  }
}

module.exports.uploadPhoto = async (socket, file) => {
  const session = driver.session();
  try {
    await auth.checkAuth(socket);
    const type = await FileType.fromBuffer(file);
    const timestamp = Date.now().toString();
    const fileName = `bucketFolder/${timestamp}-lg`;
    const data = await uploadFile(file, fileName, type);
    console.log(data)
    await session.writeTransaction(tx => 
      tx.run(`MATCH (currentUser:user {username: $username}) set currentUser.picture=$location`, {username: socket.username, location: data.Location})
    )
    socket.emit('update_complete', {message: "updated their profile picture.", username: socket.username, time: moment(Date.now()).calendar()})
  }catch(err) {
    if(err === "Auth error") {
      socket.emit("invalid_auth")
    }else {
      console.log("Server error while uploading photo.")
    }
  }finally {
    await session.close();
  }
}

module.exports.updateStatus = async (socket, status) => {
  const session = driver.session();
  try {
    await auth.checkAuth(socket);
    await session.writeTransaction(tx => 
      tx.run(`MATCH (currentUser:user {username: $username}) set currentUser.status=$status`, {username: socket.username, status: status})
    )
    socket.emit('update_complete', {message: `is now ${status}`, username: socket.username, time: moment(Date.now()).calendar()})
  }catch(err) {
    if(err === "Auth error") {
      socket.emit("invalid_auth")
    }else {
      console.log("Server error while updating status.")
    }
  }finally {
    await session.close();
  }
}