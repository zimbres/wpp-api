const express = require('express')
const socketIO = require('socket.io')
const http = require('http')
const app = express()
const server = http.createServer(app)
const io = socketIO(server)
const logger = require('./util/logger')
const routes = require('./routes')
const config = require('./util/config')
const { wppClient } = require('./client')

app.use('/', routes)

wppClient(io)

server.listen(config.port, function () {
  logger.info(`App version ${config.appVersion} running on port ${config.port}`)
})
