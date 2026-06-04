const { getUser, updateUser } = require('../../database/users')
const { mention } = require('../../utils/formatter')

module.exports = {
  name: ['removerwarning', 'rw', 'limparwarning', 'zeroadvertencias', 'perdoar', 'pardon'],
  description: 'Admin: remover advertências de um membro',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid

    if (!mentioned?.length) {
      await sock.sendMessage(from, { text: '❓ Uso: */removerwarning @user*' }, { quoted: msg })
      return
    }

    const targetJid = mentioned[0]
    const target = getUser(targetJid)
    const before = target.warnings || 0

    updateUser(targetJid, { warnings: 0 })

    await sock.sendMessage(from, {
      text: `✅ Advertências de ${mention(targetJid)} removidas!\n⚠️ Antes: *${before}* → Agora: *0*`,
      mentions: [targetJid],
    }, { quoted: msg })
  },
}
