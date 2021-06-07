const neo4j = require('neo4j-driver');
var driver = neo4j.driver(process.env.GRAPHENEDB_BOLT_URL, neo4j.auth.basic(process.env.GRAPHENEDB_BOLT_USER, process.env.GRAPHENEDB_BOLT_PASSWORD), { encrypted : true });
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

module.exports.getCurrentUser = async (socket) => {
  const user = await User.findOne({username: socket.username});
  if(user) {
    var currentUser = {
      username: user.username,
      picture: user.image,
      status: user.status
    }
    socket.emit('current_user_data', currentUser);
  }
  // var session = driver.session()
  // session.run(`MATCH (currentUser:user {username: '${socket.username}'}) RETURN currentUser`)
  // .then(results => {
  //   var currentUser = {
  //     username: results.records[0]._fields[0].properties.username,
  //     picture: results.records[0]._fields[0].properties.picture,
  //     status: results.records[0]._fields[0].properties.status
  //   }
  //   socket.emit('current_user_data', currentUser)
  // })
  // .finally(() => {
  //   session.close();
  // })
}

module.exports.getUserData = async (socket, onlineUsers, token) => {
  if(auth.checkAuth(token)) {
    const user = await User.findOne({username: socket.username}).populate('friends.user');
    if(user) {
      const online = {};
      const offline = {};
      const friends = user.friends.filter(item => item.status == "accepted");
      friends.forEach(item => {
        if(onlineUsers[item.user.username]) {
          online[item._fields[0].properties.username] = {
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
  // auth.checkAuth(token, (res) => {
  //   if(res) {
  //     var session = driver.session();
  //     session.run(
  //       `MATCH (:user { username: '${socket.username}'}) - [r:FRIEND {status: 'accepted'}] - (friend:user)
  //       RETURN friend`
  //     )
  //     .then( result => {
  //       var online = {}
  //       var offline = {}
  //       if(result.records.length) {
  //           result.records.forEach(item => {
  //           if(onlineUsers[item._fields[0].properties.username]) {
  //               online[item._fields[0].properties.username] = {
  //                 isTyping: false,
  //                 picture: item._fields[0].properties.picture, 
  //                 status: item._fields[0].properties.status
  //               }
  //           }else {
  //               offline[item._fields[0].properties.username] = {
  //                 isTyping: false,
  //                 picture: item._fields[0].properties.picture, 
  //                 status: item._fields[0].properties.status
  //               }
  //           }
  //           })
  //       }
  //       var userData = {
  //           online: online,
  //           offline: offline
  //       }
  //       socket.emit('user_data', userData);
  //     })
  //     .finally(() => {
  //         session.close();
  //     })
  //   }
  //   else {
  //     socket.emit('invalid_auth')
  //   }
  // })
}

module.exports.friendUpdate = function(socket, onlineUsers, data) {
  // var session = driver.session();
  // session.run(
  //   `MATCH (:user {username: '${socket.username}'}) - [r:FRIEND {status: 'accepted'}] - (friend:user)
  //   RETURN friend`
  // )
  // .then(results => {
  //   results.records.forEach(item => {
  //     if(onlineUsers[item._fields[0].properties.username]) {
  //       onlineUsers[item._fields[0].properties.username].emit('friend_update')
  //       onlineUsers[item._fields[0].properties.username].emit('timeline_update', data)
  //     }
  //   })
  // })
  // .finally(() => {
  //   session.close();
  // })
  console.log('hi')
}

module.exports.uploadPhoto = async (socket, file) => {
  try {
    const type = await FileType.fromBuffer(file);
    const timestamp = Date.now().toString();
    const fileName = `bucketFolder/${timestamp}-lg`;
    const data = await uploadFile(file, fileName, type);
    const user = User.findOne({username: socket.username});
    user.image = data.Location;
    const res = await user.save();
    if(res) {
      socket.emit('update_complete', {message: "updated their profile picture.", username: socket.username, time: moment(Date.now()).calendar()})
    }
    // var session = driver.session();
    // session.run(
    //   `MATCH (currentUser:user {username: '${socket.username}'})
    //   set currentUser.picture='${data.Location}'`
    // )
    // .then(results => {
    //   socket.emit('update_complete', {message: "updated their profile picture.", username: socket.username, time: moment(Date.now()).calendar()})
    // })
    // .finally(() => session.close())
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