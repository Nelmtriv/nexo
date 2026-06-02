const { mention } = require('../../utils/formatter')

module.exports = {
  name: ['rebaixar', 'demote', 'removerAdmin'],
  description: 'Admin: remover administrador',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (!mentioned?.length) {
      await sock.sendMessage(from, { text: '❓ Uso: */rebaixar @user*' }, { quoted: msg }); return
    }
    try {
      await sock.groupParticipantsUpdate(from, mentioned, 'demote')
      await sock.sendMessage(from, {
        text: `📉 ${mention(mentioned[0])} foi removido de *administrador*.`,
        mentions: mentioned,
      })
    } catch {
      await sock.sendMessage(from, { text: '❌ Não foi possível rebaixar. O bot é admin?' }, { quoted: msg })
    }
  },
}
