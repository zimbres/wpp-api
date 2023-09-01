const axios = require('axios')
const express = require('express')
const router = express.Router()
const config = require('./util/config')
const swaggerUi = require('swagger-ui-express')
const swaggerJSDoc = require('swagger-jsdoc')
const fileUpload = require('express-fileupload')
const { MessageMedia } = require('whatsapp-web.js')
const { body, validationResult } = require('express-validator')
const { phoneNumberFormatter } = require('./helpers/formatter')
const { client, checkIsConnected, checkRegisteredNumber, findGroupByName } = require('./client')

const options = {
  failOnErrors: true,
  definition: {
    openapi: '3.1.0',
    info: {
      title: config.appName,
      version: config.appVersion,
    },
  },
  apis: ['./app/routes.js'],
}
const swaggerSpec = swaggerJSDoc(options)

router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
router.use(express.json())
router.use(express.urlencoded({ extended: true }))
router.use(fileUpload({ debug: false }))
router.use(express.static(__dirname + '/public'))

/**
 * @openapi
 * /:
 *   get:
 *     summary: Get app health
 *     responses:
 *       200:
 *         description: Returns app health status.
 */
router.get('/', (req, res) => {
  res.json({
    data: {
      health: 'true',
    },
  })
})

router.get('/wpp', (req, res) => {
  res.sendFile('./public/wpp.html', {
    root: __dirname,
  })
})

/**
 * @openapi
 * /state:
 *   get:
 *     summary: Get wpp connection state
 *     responses:
 *       200:
 *         description: Returns wpp connection state.
 *       503:
 *         description: NotConnected
 */
router.get('/state', async (req, res) => {
  const isConnected = await checkIsConnected()
  if (isConnected == 'CONNECTED') {
    res.json({
      connected: true,
    })
  } else {
    res.status(503).json({ state: 'NotConnected' })
  }
})

/**
 * @openapi
 * /send-message:
 *   post:
 *     summary: Send a message
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *                 description: User phone number.
 *                 example: 5511912345678
 *               message:
 *                 type: string
 *                 description: Message.
 *                 example: This is a test message.
 *     responses:
 *       200:
 *         description: Response.
 */
router.post('/send-message', [body('number').notEmpty(), body('message').notEmpty()], async (req, res) => {
  const errors = validationResult(req).formatWith(({ msg }) => {
    return msg
  })

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped(),
    })
  }

  const number = phoneNumberFormatter(req.body.number)
  const message = req.body.message

  const isConnected = await checkIsConnected()
  if (isConnected != 'CONNECTED') {
    return res.status(422).json({
      status: false,
      message: 'Client is not connected',
    })
  }

  const isRegisteredNumber = await checkRegisteredNumber(number)

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: 'The number is not registered',
    })
  }

  client
    .sendMessage(number, message)
    .then((response) => {
      res.status(200).json({
        status: true,
        response: response,
      })
    })
    .catch((err) => {
      res.status(500).json({
        status: false,
        response: err,
      })
    })
})

router.post('/send-media', async (req, res) => {
  const number = phoneNumberFormatter(req.body.number)
  const caption = req.body.caption
  const fileUrl = req.body.file
  // const media = MessageMedia.fromFilePath('./image-example.png')
  // const file = req.files.file
  // const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name)
  let mimetype
  const attachment = await axios.get(fileUrl, { responseType: 'arraybuffer' }).then((response) => {
    mimetype = response.headers['content-type']
    return response.data.toString('base64')
  })

  const media = new MessageMedia(mimetype, attachment, 'Media')

  client
    .sendMessage(number, media, { caption: caption })
    .then((response) => {
      res.status(200).json({
        status: true,
        response: response,
      })
    })
    .catch((err) => {
      res.status(500).json({
        status: false,
        response: err,
      })
    })
})

router.post(
  '/send-group-message',
  [
    body('id').custom((value, { req }) => {
      if (!value && !req.body.name) {
        throw new Error('Invalid value, you can use `id` or `name`')
      }
      return true
    }),
    body('message').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req).formatWith(({ msg }) => {
      return msg
    })

    if (!errors.isEmpty()) {
      return res.status(422).json({
        status: false,
        message: errors.mapped(),
      })
    }

    let chatId = req.body.id
    const groupName = req.body.name
    const message = req.body.message

    if (!chatId) {
      const group = await findGroupByName(groupName)
      if (!group) {
        return res.status(422).json({
          status: false,
          message: 'No group found with name: ' + groupName,
        })
      }
      chatId = group.id._serialized
    }

    client
      .sendMessage(chatId, message)
      .then((response) => {
        res.status(200).json({
          status: true,
          response: response,
        })
      })
      .catch((err) => {
        res.status(500).json({
          status: false,
          response: err,
        })
      })
  },
)

router.post('/clear-message', [body('number').notEmpty()], async (req, res) => {
  const errors = validationResult(req).formatWith(({ msg }) => {
    return msg
  })

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped(),
    })
  }

  const number = phoneNumberFormatter(req.body.number)
  const isRegisteredNumber = await checkRegisteredNumber(number)

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: 'The number is not registered',
    })
  }

  const chat = await client.getChatById(number)

  chat
    .clearMessages()
    .then((status) => {
      res.status(200).json({
        status: true,
        response: status,
      })
    })
    .catch((err) => {
      res.status(500).json({
        status: false,
        response: err,
      })
    })
})

module.exports = router
