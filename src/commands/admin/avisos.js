const { getUser, updateUser } = require('../../database/users')
const { mention } = require('../../utils/formatter')

module.exports = {
  name: ['avisos', 'warns', 'verAvisos'],
  description: 'Admin: ver ou limpar avisos de um membro',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg, args }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (!mentioned?.length) {
      await sock.sendMessage(from, { text: '❓ Uso: */avisos @user* | */avisos limpar @user*' }, { quoted: msg }); return
    }

    const sub = args[0]?.toLowerCase()
    const targetJid = mentioned[0]
    const user = getUser(targetJid)

    if (sub === 'limpar' || sub === 'clear' || sub === 'reset') {
      updateUser(targetJid, { warnings: 0 })
      await sock.sendMessage(from, {
        text: `✅ Avisos de ${mention(targetJid)} foram limpos.`,
        mentions: [targetJid],
      }, { quoted: msg })
      return
    }

    const warnings = user.warnings || 0
    const bars = '⚠️'.repeat(warnings) + '▪️'.repeat(Math.max(0, 3 - warnings))

    await sock.sendMessage(from, {
      text: [
        `📋 *Avisos — ${user.name}*`,
        ``,
        `${bars}  (${warnings}/3)`,
        warnings === 0 ? `✅ Sem avisos activos.` : ``,
        warnings >= 2 ? `🔴 Próximo aviso = expulsão!` : ``,
      ].filter(Boolean).join('\n'),
      mentions: [targetJid],
    }, { quoted: msg })
  },
}
