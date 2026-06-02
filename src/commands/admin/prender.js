const { getUser, updateUser } = require('../../database/users')
const { mention } = require('../../utils/formatter')
const { formatRemaining } = require('../../utils/cooldown')

module.exports = {
  name: ['prender', 'preso'],
  description: 'Admin: prender membro por X minutos',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg, args }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    const minutesArg = args.find(a => !isNaN(a) && Number(a) > 0)

    if (!mentioned?.length || !minutesArg) {
      await sock.sendMessage(from, { text: '❓ Uso: */prender @user <minutos>*' }, { quoted: msg }); return
    }

    const jid = mentioned[0]
    const minutes = Math.min(parseInt(minutesArg), 1440) // máx 24h
    const until = new Date(Date.now() + minutes * 60 * 1000).toISOString()
    updateUser(jid, { prison_until: until })

    await sock.sendMessage(from, {
      text: `🔒 ${mention(jid)} foi preso por *${minutes} minuto(s)*!`,
      mentions: [jid],
    })
  },
}
