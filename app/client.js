const axios = require('axios')
const qrcode = require('qrcode')
const logger = require('./util/logger')
const config = require('./util/config')
const { Client, LocalAuth } = require('whatsapp-web.js')

const client = new Client({
  restartOnAuthFail: true,
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: config.chromiumPath,
    args: config.pptrArgs,
  },
})

const wppClient = function (io) {
  client.initialize()

  client.on('message', async (msg) => {
    logger.info(msg)

    axios.post(config.webHookUrl, msg).catch(function (error) {
      logger.error(error)
    })
  })

  io.on('connection', function (socket) {
    socket.emit('message', 'Connecting...')

    client.on('qr', (qr) => {
      logger.info('QR RECEIVED', qr)
      qrcode.toDataURL(qr, (err, url) => {
        socket.emit('qr', url)
        socket.emit('message', 'QR Code received, scan!')
      })
    })

    client.on('loading_screen', (percent, message) => {
      socket.emit(`LOADING SCREEN, ${percent}% - ${message}`)
      logger.info(`LOADING SCREEN, ${percent}% - ${message}`)
    })

    client.on('ready', () => {
      socket.emit('ready', 'Whatsapp is ready!')
      socket.emit('message', 'Whatsapp is ready!')
      logger.info('READY')
    })

    client.on('authenticated', () => {
      socket.emit('authenticated', 'Whatsapp is authenticated!')
      socket.emit('message', 'Whatsapp is authenticated!')
      logger.info('AUTHENTICATED')
    })

    client.on('auth_failure', function (session) {
      socket.emit('message', 'Auth failure, restarting...')
      logger.error('AUTHENTICATION FAILURE', session)
    })

    client.on('disconnected', (reason) => {
      socket.emit('message', 'Whatsapp is disconnected!')
      logger.warn('DISCONNECTED', reason)
      client.destroy()
      client.initialize()
    })
  })
}

const checkIsConnected = async function () {
  const isConnected = await client.getState().catch(() => {
    logger.error('Connection error')
  })
  return isConnected
}
const checkRegisteredNumber = async function (number) {
  const isRegistered = await client.isRegisteredUser(number).catch(() => {
    logger.error('Client is not connected')
  })
  return isRegistered
}
const findGroupByName = async function (name) {
  const group = await client.getChats().then((chats) => {
    return chats.find((chat) => chat.isGroup && chat.name.toLowerCase() == name.toLowerCase())
  })
  return group
}

module.exports = {
  client,
  wppClient,
  checkIsConnected,
  checkRegisteredNumber,
  findGroupByName,
}
