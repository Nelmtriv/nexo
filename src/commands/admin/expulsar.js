const { mention } = require('../../utils/formatter')

module.exports = {
  name: ['expulsar', 'kick'],
  description: 'Admin: expulsar membro do grupo',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid

    if (!mentioned?.length) {
      await sock.sendMessage(from, { text: '❓ Uso: */expulsar @user*' }, { quoted: msg })
      return
    }

    try {
      await sock.groupParticipantsUpdate(from, mentioned, 'remove')
      await sock.sendMessage(from, {
        text: `✅ ${mention(mentioned[0])} foi expulso do grupo.`,
        mentions: mentioned,
      })
    } catch {
      await sock.sendMessage(from, { text: '❌ Não foi possível expulsar. O bot é admin?' }, { quoted: msg })
    }
  },
}
