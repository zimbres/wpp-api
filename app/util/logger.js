const config = require('./config')
const winston = require('winston')
require('winston-daily-rotate-file')
const { combine, timestamp, json } = winston.format

const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: './logs/wpp-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '3d',
})

const logger = winston.createLogger({
  level: config.logLevel,
  format: combine(timestamp(), json()),
  transports: [new winston.transports.Console(), fileRotateTransport],
})

module.exports = logger
