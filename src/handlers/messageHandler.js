const { prefix, economy } = require('../config')
const { runCommand } = require('./commandHandler')
const { isAdmin: checkAdmin } = require('../utils/permissions')
const { getUser, addGemas, removeGemas, updateUser, isInPrison, getPrisonRemaining } = require('../database/users')
const { checkCooldown } = require('../utils/cooldown')
const { gem } = require('../utils/formatter')
const { formatRemaining } = require('../utils/cooldown')

const processedIds = new Set()

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

  const msgId = msg.key.id
  if (processedIds.has(msgId)) return
  processedIds.add(msgId)
  if (processedIds.size > 500) processedIds.delete(processedIds.values().next().value)

  const from = msg.key.remoteJid
  if (!from?.endsWith('@g.us')) return

  const sender = msg.key.participant || msg.key.remoteJid
  const pushName = msg.pushName || sender.split('@')[0]
  const text = extractContent(msg)
  const media = extractMedia(msg)

  const user = getUser(sender, pushName)

  const today = new Date().toDateString()

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

  // wealth tax every 7 days: 3% of (gemas + bank) if total > 3000
  const TAX_THRESHOLD = 3000
  const TAX_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000
  const freshUser = getUser(sender)
  const totalWealth = (freshUser.gemas || 0) + (freshUser.bank || 0)
  const lastTax = freshUser.last_tax_date ? new Date(freshUser.last_tax_date).getTime() : 0
  if (totalWealth > TAX_THRESHOLD && Date.now() - lastTax >= TAX_COOLDOWN_MS) {
    const taxAmount = Math.floor(totalWealth * 0.03)
    // deduct from gemas first, remainder from bank
    const fromGemas = Math.min(taxAmount, freshUser.gemas || 0)
    const fromBank  = taxAmount - fromGemas
    const { getData, save } = require('../database/db')
    const db = getData()
    db.users[sender].gemas = (db.users[sender].gemas || 0) - fromGemas
    db.users[sender].bank  = (db.users[sender].bank  || 0) - fromBank
    db.users[sender].last_tax_date = new Date().toISOString()
    save()
    const afterTax = getUser(sender)
    await sock.sendMessage(from, {
      text: [
        `🏛️ *${freshUser.name}*, o governo cobrou *${gem(taxAmount)}* de imposto de riqueza (3% semanal)!`,
        `📊 Base: ${gem(freshUser.gemas)} (carteira) + ${gem(freshUser.bank || 0)} (banco) = ${gem(totalWealth)}`,
        `💸 Imposto: 10% = *${gem(taxAmount)}*`,
        fromBank > 0 ? `   └ ${gem(fromGemas)} da carteira + ${gem(fromBank)} do banco` : `   └ ${gem(fromGemas)} da carteira`,
        ``,
        `💳 Carteira: ${gem(afterTax.gemas)} | 🏦 Banco: ${gem(afterTax.bank)}`,
      ].join('\n'),
    })
  }

  // loan expiry check — prison if overdue
  const loanUser = getUser(sender)
  if (loanUser.loan?.active && loanUser.loan?.due && new Date(loanUser.loan.due) < new Date()) {
    const { getData: getDB, save: saveDB } = require('../database/db')
    const ldb = getDB()
    const prisonMs = 60 * 60 * 1000
    ldb.users[sender].loan = { active: false, amount: 0, total: 0, due: null }
    ldb.users[sender].prison_until = new Date(Date.now() + prisonMs).toISOString()
    saveDB()
    await sock.sendMessage(from, {
      text: `🔒 *${loanUser.name}*, não pagaste o empréstimo de ${gem(loanUser.loan.amount)} a tempo!\nForam aplicados juros de ${gem(loanUser.loan.total)} e foste *preso por 1 hora*!`,
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
