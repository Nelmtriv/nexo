const { getUser, updateUser } = require('../../database/users')
const { mention } = require('../../utils/formatter')

const MAX_WARNINGS = 3

module.exports = {
  name: ['avisar', 'warn', 'aviso'],
  description: 'Admin: avisar membro (3 avisos = expulsão automática)',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg, args, sender }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (!mentioned?.length) {
      await sock.sendMessage(from, { text: '❓ Uso: */avisar @user <motivo>*' }, { quoted: msg }); return
    }

    const targetJid = mentioned[0]
    if (targetJid === sender) {
      await sock.sendMessage(from, { text: '😅 Não podes avisar-te a ti mesmo.' }, { quoted: msg }); return
    }

    const motivo = args.filter(a => !a.startsWith('@')).join(' ') || 'Comportamento inadequado'
    const user = getUser(targetJid)
    const warnings = (user.warnings || 0) + 1
    updateUser(targetJid, { warnings })

    const bars = '⚠️'.repeat(warnings) + '▪️'.repeat(MAX_WARNINGS - warnings)

    if (warnings >= MAX_WARNINGS) {
      updateUser(targetJid, { warnings: 0 })
      try {
        await sock.groupParticipantsUpdate(from, [targetJid], 'remove')
        await sock.sendMessage(from, {
          text: [
            `🚨 *${user.name}* atingiu *${MAX_WARNINGS} avisos* e foi expulso automaticamente!`,
            `📋 Último motivo: ${motivo}`,
          ].join('\n'),
          mentions: [targetJid],
        })
      } catch {
        await sock.sendMessage(from, {
          text: `🚨 ${mention(targetJid)} atingiu ${MAX_WARNINGS} avisos! (Bot precisa ser admin para expulsar)`,
          mentions: [targetJid],
        })
      }
    } else {
      await sock.sendMessage(from, {
        text: [
          `⚠️ *Aviso ${warnings}/${MAX_WARNINGS}* — ${mention(targetJid)}`,
          `${bars}`,
          `📋 Motivo: *${motivo}*`,
          ``,
          warnings === MAX_WARNINGS - 1
            ? `🔴 *Próximo aviso = expulsão automática!*`
            : ``,
        ].filter(Boolean).join('\n'),
        mentions: [targetJid],
      })
    }
  },
}
