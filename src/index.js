const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys')

const pino = require('pino')
const qrcode = require('qrcode-terminal')
const fs = require('fs')
const path = require('path')

const { initDB } = require('./database/db')
const { handleMessage } = require('./handlers/messageHandler')
const { botName } = require('./config')

let reconnectAttempts = 0
const maxReconnectAttempts = 5

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
      keepAliveIntervalMs: 30000,
      defaultQueryTimeoutMs: 30000,
      retryRequestDelayMs: 250,
      getMessage: async () => ({ conversation: '' }),
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        console.clear()
        console.log(`\n🤖 ${botName} — Escaneie o QR code:\n`)
        qrcode.generate(qr, { small: true })
      }

      if (connection === 'open') {
        reconnectAttempts = 0
        console.log(`\n✅ ${botName} conectado com sucesso!\n`)
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode

        // 440 = connectionReplaced: outra instância está a correr — não reconectar
        if (code === DisconnectReason.connectionReplaced || code === 440) {
          console.error(`\n❌ Ligação substituída (código 440).`)
          console.log(`💡 Tens outra instância do bot a correr. Fecha-a e reinicia este.`)
          process.exit(1)
        }

        const shouldReconnect = code !== DisconnectReason.loggedOut

        if (shouldReconnect) {
          reconnectAttempts++

          const delay = Math.min(5000 * Math.pow(2, reconnectAttempts - 1), 60000)

          console.log(`⚠️  Desconectado (código ${code}). Tentativa ${reconnectAttempts}/${maxReconnectAttempts}`)
          console.log(`⏳ Reconectando em ${delay / 1000}s...\n`)

          if (reconnectAttempts <= maxReconnectAttempts) {
            setTimeout(() => startBot(), delay)
          } else {
            console.error(`❌ Máximo de tentativas atingido. Sessão expirou.`)
            console.log(`💡 Solução: Apaga a pasta "auth_info" e executa o bot novamente.`)
            process.exit(1)
          }
        } else {
          console.log(`❌ Deslogado (código ${code}).`)
          console.log(`💡 Apaga a pasta "auth_info" e executa o bot novamente para fazer novo QR.`)
          process.exit(0)
        }
      }
    })

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return

      for (const msg of messages) {
        if (!msg.message) continue
        try {
          await handleMessage(sock, msg)
        } catch (err) {
          console.error('❌ Erro ao processar mensagem:', err)
        }
      }
    })

  } catch (err) {
    console.error(`❌ Erro ao iniciar bot:`, err.message)
    const delay = Math.min(5000 * Math.pow(2, reconnectAttempts), 60000)
    console.log(`⏳ Tentando novamente em ${delay / 1000}s...`)
    setTimeout(startBot, delay)
  }
}

process.on('unhandledRejection', (err) => {
  const msg = err?.message || ''
  if (msg.includes('Connection Closed') || msg.includes('Connection Lost') || msg.includes('connection')) return
  console.error('❌ Erro não tratado:', msg)
})

startBot()