const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys')

const pino = require('pino')
const qrcode = require('qrcode-terminal')

const { initDB } = require('./database/db')
const { handleMessage } = require('./handlers/messageHandler')
const { botName } = require('./config')

let reconnecting = false

async function startBot() {
  try {
    initDB()

    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: [botName, 'Chrome', '1.0.0'],
      keepAliveIntervalMs: 10000,
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        console.clear()
        console.log(`\n🤖 ${botName} — QR:\n`)
        qrcode.generate(qr, { small: true })
      }

      if (connection === 'open') {
        reconnecting = false
        console.log(`\n${botName} conectado\n`)
      }

      if (connection === 'close') {
        if (reconnecting) return
        reconnecting = true

        const code = lastDisconnect?.error?.output?.statusCode
        const shouldReconnect = code !== DisconnectReason.loggedOut

        if (shouldReconnect) {
          setTimeout(() => {
            reconnecting = false
            startBot()
          }, 5000)
        }
      }
    })

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return

      for (const msg of messages) {
        if (!msg.message) continue
        await handleMessage(sock, msg)
      }
    })

  } catch (err) {
    setTimeout(startBot, 5000)
  }
}

startBot()