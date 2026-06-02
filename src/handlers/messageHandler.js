const { prefix, economy } = require('../config')
const { runCommand } = require('./commandHandler')
const { isAdmin: checkAdmin } = require('../utils/permissions')
const { getUser, addGemas, updateUser, isInPrison, getPrisonRemaining } = require('../database/users')
const { checkCooldown } = require('../utils/cooldown')
const { gem } = require('../utils/formatter')
const { formatRemaining } = require('../utils/cooldown')

// Commands blocked while in prison
const PRISON_BLOCKED = new Set([
  'roubar', 'roubo', 'rob', 'crime', 'cometer',
  'cassino', 'slots', 'slot', 'blackjack', 'bj',
  'duelo', 'duel', 'ppt', 'rps',
  'trabalhar', 'trabalho', 'work', 'emprego',
  'transferir', 'pagar', 'send',
])

function extractContent(msg) {
  const m = msg.message
  if (!m) return null
  if (m.conversation) return m.conversation
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text
  if (m.imageMessage?.caption) return m.imageMessage.caption
  if (m.videoMessage?.caption) return m.videoMessage.caption
  if (m.documentMessage?.caption) return m.documentMessage.caption
  return null
}

function extractMedia(msg) {
  const m = msg.message
  if (!m) return null
  if (m.imageMessage) return { type: 'image', message: m.imageMessage }
  if (m.videoMessage) return { type: 'video', message: m.videoMessage }
  if (m.stickerMessage) return { type: 'sticker', message: m.stickerMessage }
  const ctx = m.extendedTextMessage?.contextInfo?.quotedMessage
  if (ctx?.imageMessage) return { type: 'image', message: ctx.imageMessage, isQuoted: true, quotedMsg: ctx }
  if (ctx?.videoMessage) return { type: 'video', message: ctx.videoMessage, isQuoted: true, quotedMsg: ctx }
  return null
}

async function handleMessage(sock, msg) {
  if (!msg.message) return
  if (msg.key.fromMe) return

  const from = msg.key.remoteJid
  if (!from?.endsWith('@g.us')) return

  const sender = msg.key.participant || msg.key.remoteJid
  const pushName = msg.pushName || sender.split('@')[0]
  const text = extractContent(msg)
  const media = extractMedia(msg)

  const user = getUser(sender, pushName)

  // auto daily bonus on first message of the day
  const { ready } = checkCooldown(user.last_daily, economy.dailyCooldownMs)
  if (ready) {
    addGemas(sender, economy.dailyAmount, '🎁 Bónus diário automático')
    updateUser(sender, {
      last_daily: new Date().toISOString(),
      streak: (user.streak || 0) + 1,
    })
    await sock.sendMessage(from, {
      text: `🎁 *${user.name}*, bom dia! Recebeste o teu bónus diário: *+${gem(economy.dailyAmount)}* 💎  🔥 Streak: ${(user.streak || 0) + 1}`,
    })
  }

  if (!text?.startsWith(prefix)) return

  const body = text.slice(prefix.length).trim()
  const [commandName, ...argParts] = body.split(/\s+/)
  const args = argParts
  const cmdLower = commandName.toLowerCase()

  // prison block
  if (PRISON_BLOCKED.has(cmdLower) && isInPrison(sender)) {
    const rem = getPrisonRemaining(sender)
    await sock.sendMessage(from, {
      text: `🔒 *${user.name}*, estás na prisão e não podes usar este comando!\nSaes em *${formatRemaining(rem)}*. Usa */fianca* para sair mais cedo.`,
    }, { quoted: msg })
    return
  }

  const isAdmin = await checkAdmin(sock, from, sender)

  const ctx = {
    sock, msg, from, sender, pushName, args, body, text, media, isAdmin,
  }

  await runCommand(cmdLower, ctx)
}

module.exports = { handleMessage }
