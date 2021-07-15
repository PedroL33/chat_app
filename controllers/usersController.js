<<<<<<< HEAD
=======
const neo4j = require('neo4j-driver');
var driver = new neo4j.driver(process.env.AURA_URI, neo4j.auth.basic(process.env.AURA_USER, process.env.AURA_PASSWORD));
>>>>>>> old-state
var auth = require('../Authentication/checkAuth')
const AWS = require("aws-sdk");
const FileType = require('file-type');
const bluebird = require('bluebird');
const moment = require('moment');
const User = require('../models/users');

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

<<<<<<< HEAD
module.exports.getCurrentUser = async (socket, token) => {
  try {
    if(auth.checkAuth(token)) {
      const user = await User.findOne({username: socket.username});
      if(user) {
        var currentUser = {
          username: user.username,
          picture: user.image,
          status: user.status
        }
        socket.emit('current_user_data', currentUser);
      }
    }else {
      socket.emit('invalid_auth')
    }
  }catch {
    console.log('getCurrentuser error.')
  }
}

module.exports.getUserData = async (socket, onlineUsers, token) => {
  try {
    if(auth.checkAuth(token)) {
      const user = await User.findOne({username: socket.username}).populate('friends.user');
      if(user) {
        const online = {};
        const offline = {};
        const friends = user.friends.filter(item => item.status == "accepted");
        friends.forEach(item => {
          if(onlineUsers[item.user.username]) {
            online[item.user.username] = {
              isTyping: false,
              picture: item.user.image, 
              status: item.user.status
            }
          }else {
            offline[item.user.username] = {
              isTyping: false,
              picture: item.user.image, 
              status: item.user.status
            }
          }
        })
        var userData = {
          online: online,
          offline: offline
        }
        socket.emit('user_data', userData);
      }
    }else {
      socket.emit('invalid_auth');
    }
  }catch {
    console.log("getuserdata error.")
  }
}

module.exports.friendUpdate = async (socket, onlineUsers, data, token) => {
  try{
    if(auth.checkAuth(token)) {
      const user = await User.findOne({username: socket.username}).populate('friends.user');
      const friends = user.friends.filter(item => item.status === "accepted");
      friends.forEach(item => {
        if(onlineUsers[item.user.username]) {
          onlineUsers[item.user.username].emit('friend_update');
          onlineUsers[item.user.username].emit('timeline_update', data);
        }
      })
    }else {
      socket.emit('invalid_auth')
    }
  }catch {
    console.log("Friend update error.")
  }
}

module.exports.uploadPhoto = async (socket, file, token) => {
  try {
    if(auth.checkAuth(token)) {
      const type = await FileType.fromBuffer(file);
      const timestamp = Date.now().toString();
      const fileName = `bucketFolder/${timestamp}-lg`;
      const data = await uploadFile(file, fileName, type);
      const user = User.findOne({username: socket.username});
      user.image = data.Location;
      await user.save();
      socket.emit('update_complete', {message: "updated their profile picture.", username: socket.username, time: moment(Date.now()).calendar()})
    }else {
      socket.emit('invalid_auth')
    }
  }
  catch {
    console.log("uploadPhoto error.")
  }
}

module.exports.updateStatus = async (socket, status, token) => {
  try{
    if(auth.checkAuth(token)) {
      const user = await User.findOne({username: socket.username});
      user.status = status;
      const res = await user.save();
      socket.emit('update_complete', {message: `is now ${status}`, username: socket.username, time: moment(Date.now()).calendar()})
    }else {
      socket.emit('invalid_auth')
    }
  }catch(err) {
    console.log("update status error.")
=======
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
      console.log(err)
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
>>>>>>> old-state
  }
}