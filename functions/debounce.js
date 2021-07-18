const usersController = require('../controllers/usersController');
const moment = require('moment');

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      func(...args)
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  }
}

module.exports.onConnect = (socket, onlineUsers, lastOnline) => {
  if(!lastOnline[socket.username] || Date.now() - lastOnline[socket.username] > 10000) {
    console.log(`${socket.username} connected to server.`);
    usersController.friendUpdate(socket, onlineUsers, {message: "has come online.", username: socket.username, time: moment(Date.now()).calendar()})
  }else {
    lastOnline[socket.useranme] = Date.now();
  }
}

module.exports.onDisconnect =  debounce((socket, onlineUsers) => {
  if(!onlineUsers[socket.username]) {
    usersController.friendUpdate(socket, onlineUsers, {message: "has gone offline.", username: socket.username, time: moment(Date.now()).calendar()})
    console.log(`${socket.username} has disconnected.`)
  }
}, 10000)