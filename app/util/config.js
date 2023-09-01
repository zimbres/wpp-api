const dotenv = require('dotenv')
const packageJson = require('../../package.json')

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

module.exports = {
  appVersion: packageJson.version,
  appName: packageJson.name,
  port: process.env.PORT || 8000,
  logLevel: process.env.LOG_LEVEL || 'info',
  webHookUrl: process.env.WEBHOOKURL,
  chromiumPath: process.env.CHROMIUM_PATH,
  pptrArgs: process.env.PPTRARGS
    ? process.env.PPTRARGS.split(',')
    : [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
      ],
}
