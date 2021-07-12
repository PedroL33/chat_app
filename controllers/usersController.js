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
  }
}