const { getUser, updateUser } = require('../../database/users')
const { checkCooldown, formatRemaining } = require('../../utils/cooldown')
const { mention } = require('../../utils/formatter')

const COOLDOWN_MS = 30 * 60 * 1000

const wins = [
  '{you} mandou uma mensagem especial e {nome} corou de vergonha! 😳💕',
  '{nome} caiu nos braços de {you}! Que carisma! 😍',
  '{you} olhou nos olhos de {nome} e... foi amor à primeira vista! 💞',
  'Um sorriso, uma piscadela — {nome} ficou completamente derretido(a)! 🥰',
  '{you} mandou um áudio de voz e {nome} ouviu três vezes seguidas! 😂❤️',
  '{nome} mudou o estado para "ocupado(a)" depois de falar com {you}... suspeito! 👀💘',
  '{you} ofereceu um café virtual a {nome} e a conversa não parou mais! ☕💬',
]

const fails = [
  '{nome} nem olhou para {you}. Que rejeição brutal! 💔',
  '{nome} fingiu não ver a mensagem de {you}. Visto e ignorado! 😭',
  '{you} tentou ser engraçado(a) com {nome} mas a piada caiu no vazio! 🦗',
  '{nome} bloquearia {you} se pudesse neste momento... 🙈',
  '{you} mandou um coração e {nome} reagiu com 👍. Isso diz tudo.',
  '{nome} mostrou a mensagem de {you} aos amigos e todos riram. Ai! 😬',
  '{you} tentou paquerar {nome} mas {nome} estava ocupado(a) a paquerar outro! 🤡',
]

const jealous = [
  '😡 *{partner}* ficou com ciúmes! {you} tentou aproximar-se de {nome} que está {status}!',
  '🔥 Cuidado! *{partner}* não ficou nada bem com a investida de {you} sobre {nome}!',
  '⚠️ {nome} está {status} com *{partner}*! Isso pode criar problemas para {you}...',
]

function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] || k)
}

module.exports = {
  name: ['paquerar', 'flertar', 'cantada', 'paquera'],
  description: 'Tenta paquerar alguém no grupo! (Cooldown 30min)',
  category: 'Social',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (!mentioned?.length) {
      await sock.sendMessage(from, {
        text: '❓ Uso: */paquerar @user*\nTenta a tua sorte na conquista! 💘',
      }, { quoted: msg }); return
    }

    const targetJid = mentioned[0]
    if (targetJid === sender) {
      await sock.sendMessage(from, { text: '🪞 Paquerar a si mesmo(a)? Tens autoestima mas isso é demais! 😂' }, { quoted: msg }); return
    }

    const you = getUser(sender, pushName)
    const target = getUser(targetJid)

    const { ready, remaining } = checkCooldown(you.last_paquerar, COOLDOWN_MS)
    if (!ready) {
      await sock.sendMessage(from, {
        text: `⏳ Calma! Ainda precisas de ${formatRemaining(remaining)} para te recuperares da última tentativa! 😅`,
      }, { quoted: msg }); return
    }

    updateUser(sender, { last_paquerar: new Date().toISOString() })

    const vars = { you: you.name, nome: target.name }

    // If target is in a relationship
    const hasPartner = target.partner && target.relationship_status !== 'solteiro'
    if (hasPartner) {
      const partner = getUser(target.partner)
      const statusLabel = target.relationship_status === 'casado' ? 'casado(a)' : 'namorando'
      const jealousMsg = jealous[Math.floor(Math.random() * jealous.length)]
      await sock.sendMessage(from, {
        text: fill(jealousMsg, { ...vars, partner: partner.name, status: statusLabel }),
        mentions: [targetJid, target.partner],
      })
      return
    }

    const successRate = 0.45
    const success = Math.random() < successRate

    const pool = success ? wins : fails
    const msg_ = pool[Math.floor(Math.random() * pool.length)]

    await sock.sendMessage(from, {
      text: fill(msg_, vars),
      mentions: [sender, targetJid],
    })
  },
}
