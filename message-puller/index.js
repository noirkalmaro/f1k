const { Server } = require("socket.io");
const express = require('express');
const http = require('http');
const raceData = require('./data/f1karting-m.kartchrono.com-race.json');

function _base64ToArrayBuffer(base64) {
  // var binary_string = window.atob(base64);
  var binary_string = Buffer.from(base64, 'base64').toString()
  var len = binary_string.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

const socketMessages = raceData.log.entries[24]._webSocketMessages;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/hc', (req, res) => {
  res.send('Hello world!');
});

app.get("/", (req, res) => res.sendFile(__dirname + "/static/index.html"));

io.on('connection', (socket) => {
    console.log('a user connected');
    const interval = createPullerInterval();
    socket.on('disconnect', () => {
      console.log('user disconnected');
      clearInterval(interval);
    });
  });

server.listen(3888, () => {
  console.log('listening on *:3888');
});

function createPullerInterval() {
    let index = 0;

    return setInterval(() => {
      const message = { ...socketMessages[index++] };
      if (message.opcode === 2) {
        message.data = _base64ToArrayBuffer(message.data)
      }
      
      io.emit('message', message);
    }, 1000 * 2);
}

