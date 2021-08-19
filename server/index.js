const express = require('express')
const socketio = require('socket.io')
const http = require('http')
const cors = require('cors')

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users') // функции обработки действий с пользователем

const router = require('./router')
const PORT = process.env.PORT || 5000


const app = express()
const server = http.createServer(app)
const io = socketio(server, {
  cors: {
    // origin: "https://611d7c9452081b145f4a7732--training-react-chat.netlify.app",
    origin: 'http://localhost:3000 ',
    methods: ["GET", "POST"]
  }
})


app.use(cors())
app.use(router)


io.on('connection', (socket) => {

  socket.on('join', ({ name, room }, callback) => { // событие при подтверждении первичной формы
    const { error, user } = addUser({ id: socket.id, name, room })

    if(error) return callback(error) // условие, если имя пользователя не уникально

    socket.emit('message', { user: 'admin', text: `${user.name}, welcom to the room ${user.room}` }) // приветствие для пользователя
    socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name}, has joined!` }) // оповещение других пользователей о присоединении пользователя

    socket.join(user.room) // присоединение сокета к уникальной комнате

    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) })

    callback()
  })

  socket.on('sendMessage', (message, callback) => { // слушатель
    const user = getUser(socket.id)

    io.to(user.room).emit('message', { user: user.name, text: message })

    callback()
  })

  socket.on('disconnect', () => {
    const user = removeUser(socket.id)

    if(user) {
      io.to(user.room).emit('message', { user: 'admin', text: `${user.name}, has left...` })
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)})
    }
  })
})


server.listen(PORT, () => {
  console.log(`Server has started on port ${PORT}`);
})
