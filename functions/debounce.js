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

module.exports.onConnect = debounce((socket, onlineUsers) => {
  console.log(`${socket.username} connected to server.`);
  usersController.friendUpdate(socket, onlineUsers, {message: "has come online.", username: socket.username, time: moment(Date.now()).calendar()})
}, 10000)

module.exports.onDisconnect =  debounce((socket, onlineUsers) => {
  if(!onlineUsers[socket.username]) {
    usersController.friendUpdate(socket, onlineUsers, {message: "has gone offline.", username: socket.username, time: moment(Date.now()).calendar()})
    console.log(`${socket.username} has disconnected.`)
  }
}, 10000)