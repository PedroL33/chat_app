var Message = require('../models/messages');
var auth = require('../Authentication/checkAuth')

module.exports.getMessageData = async (socket) => {
  try {
    await auth.checkAuth(socket);
    const messages = await Message.find({$or: [{from: socket.username}, {to: socket.username}]});
    socket.emit("message_data", messages);
  }catch {
    console.log("Server error while getting messages")
  }
}

module.exports.createMessage = async (socket, onlineUsers, newMessage) => {
  try {
    const Message = new Message(newMessage);
    const results = await message.save();
    socket.emit('message_update', newMessage.from)
    if(onlineUsers[newMessage.to]) {
        onlineUsers[newMessage.to].emit('message_update', newMessage.from)
    }
  }catch {
    socket.emit(`notification`, {id: uuidv4(), msg: "Server error while sending message."})
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