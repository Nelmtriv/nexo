const { mention } = require('../../utils/formatter')

module.exports = {
  name: ['promover', 'promote', 'tornarAdmin'],
  description: 'Admin: promover membro a administrador',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (!mentioned?.length) {
      await sock.sendMessage(from, { text: '❓ Uso: */promover @user*' }, { quoted: msg }); return
    }
    try {
      await sock.groupParticipantsUpdate(from, mentioned, 'promote')
      await sock.sendMessage(from, {
        text: `👑 ${mention(mentioned[0])} foi promovido a *administrador*!`,
        mentions: mentioned,
      })
    } catch {
      await sock.sendMessage(from, { text: '❌ Não foi possível promover. O bot é admin?' }, { quoted: msg })
    }
  },
}
