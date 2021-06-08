var Message = require('../models/messages');
var auth = require('../Authentication/checkAuth')

module.exports.getMessageData = async (socket, token) => {
  try {
    if(auth.checkAuth(token)) {
      const messages = await Message.find({$or: [{from: socket.username}, {to: socket.username}]})
      socket.emit("message_data", messages)
    }else {
      socket.emit('invalid_auth')
    }
  }catch {
    console.log("Getmessagedata error.")
  }
}

module.exports.createMessage = async (socket, onlineUsers, newMessage) => {
  try {
    const message = new Message(newMessage)
    await message.save();
    socket.emit('message_update', newMessage.from)
    if(onlineUsers[newMessage.to]) {
        onlineUsers[newMessage.to].emit('message_update', newMessage.from)
    }
  }catch {
    console.log("createMessage error.")
  }
}

module.exports.markRead = async (socket, from) => {
  try {
    await Message.updateMany({$and: [{to: socket.username}, {from: from}, {read: false}]}, {$set: {read: true}})
    socket.emit("message_update", socket.username)
  }catch {
    console.log("mardRead error.")
  }
}