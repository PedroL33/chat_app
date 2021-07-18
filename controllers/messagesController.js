var Message = require('../models/messages');
var auth = require('../Authentication/checkAuth')

module.exports.getMessageData = async (socket) => {
  try {
    const decoded = await auth.checkAuth(socket);
    const messages = await Message.find({$or: [{from: decoded.username}, {to: decoded.username}]});
    socket.emit("message_data", messages);
  }catch(err) {
    if(err === "Auth error") {
      socket.emit("invalid_auth");
    }else {
      console.log(err)
      socket.emit(`server_error`, {type: "error", msg: "Server error while fetching messages."})
    }
    
  }
}

module.exports.createMessage = async (socket, onlineUsers, newMessage) => {
  try {
    const message = new Message(newMessage);
    await message.save();
    socket.emit('message_update', newMessage.from)
    if(onlineUsers[newMessage.to]) {
        onlineUsers[newMessage.to].emit('message_update', newMessage.from)
    }
  }catch(err) {
    if(err === "Auth error") {
      socket.emit("invalid_auth");
    }else {
      console.log(err)
      socket.emit(`server_error`, {type: "error", msg: "Server error while sending message."})
    }
    
  }
}

module.exports.markRead = async (socket, from) => {
  try {
    await Message.updateMany({$and: [{to: socket.username}, {from: from}, {read: false}]}, {$set: {read: true}})
    socket.emit("message_update", socket.username)
  }catch(err) {
    if(err === "Auth error") {
      socket.emit("invalid_auth");
    }else {
      socket.emit(`server_error`, {type: "error", msg: "Server error while updating messages  ."})
      console.log(err)
    }
  }
}