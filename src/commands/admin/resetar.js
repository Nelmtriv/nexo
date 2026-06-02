const { resetUser } = require('../../database/users')
const { mention } = require('../../utils/formatter')

module.exports = {
  name: ['resetar', 'reset'],
  description: 'Admin: resetar stats de um jogador',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid

    if (!mentioned?.length) {
      await sock.sendMessage(from, { text: '❓ Uso: */resetar @user*' }, { quoted: msg })
      return
    }

    const targetJid = mentioned[0]
    resetUser(targetJid)

    await sock.sendMessage(from, {
      text: `✅ Stats de ${mention(targetJid)} foram resetados. Saldo: 100💎`,
      mentions: [targetJid],
    }, { quoted: msg })
  },
}
