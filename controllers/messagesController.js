var Message = require('../models/messages');
var auth = require('../Authentication/checkAuth')
const { v4: uuidv4 } = require('uuid');

<<<<<<< HEAD
module.exports.getMessageData = async (socket, token) => {
  try {
    if(auth.checkAuth(token)) {
      const messages = await Message.find({$or: [{from: socket.username}, {to: socket.username}]})
      socket.emit("message_data", messages)
    }else {
      socket.emit('invalid_auth')
    }
  }catch {
    socket.emit("error", "Server error.  Could not fetch messages.")
=======
module.exports.getMessageData = async (socket) => {
  try {
    await auth.checkAuth(socket);
    const messages = await Message.find({$or: [{from: socket.username}, {to: socket.username}]});
    socket.emit("message_data", messages);
  }catch {
    console.log("Server error while getting messages")
>>>>>>> old-state
  }
}

module.exports.createMessage = async (socket, onlineUsers, newMessage) => {
  try {
<<<<<<< HEAD
    const message = new message(newMessage)
    await message.save();
=======
    const Message = new Message(newMessage);
    const results = await message.save();
>>>>>>> old-state
    socket.emit('message_update', newMessage.from)
    if(onlineUsers[newMessage.to]) {
        onlineUsers[newMessage.to].emit('message_update', newMessage.from)
    }
  }catch {
<<<<<<< HEAD
    const notif = {
      type: "error",
      msg: `Server error.  Message ${newMessage.message} could not be sent to ${newMessage.to}`
    }
    socket.emit("notification", notif)
  }
=======
    socket.emit(`notification`, {id: uuidv4(), msg: "Server error while sending message."})
  }
    
>>>>>>> old-state
}

module.exports.markRead = async (socket, from) => {
  try {
    await Message.updateMany({$and: [{to: socket.username}, {from: from}, {read: false}]}, {$set: {read: true}})
    socket.emit("message_update", socket.username)
  }catch {
    console.log("mardRead error.")
  }
}