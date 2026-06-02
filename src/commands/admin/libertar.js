const { getUser, updateUser } = require('../../database/users')
const { mention } = require('../../utils/formatter')

module.exports = {
  name: ['libertar', 'soltar'],
  description: 'Admin: libertar membro da prisão',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (!mentioned?.length) {
      await sock.sendMessage(from, { text: '❓ Uso: */libertar @user*' }, { quoted: msg }); return
    }
    const jid = mentioned[0]
    const user = getUser(jid)
    if (!user.prison_until || new Date(user.prison_until) <= new Date()) {
      await sock.sendMessage(from, { text: `❕ ${mention(jid)} não está na prisão.`, mentions: [jid] }, { quoted: msg }); return
    }
    updateUser(jid, { prison_until: null })
    await sock.sendMessage(from, {
      text: `🔓 ${mention(jid)} foi libertado pelo admin!`,
      mentions: [jid],
    })
  },
}
