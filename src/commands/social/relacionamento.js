const { getUser } = require('../../database/users')
const { header } = require('../../utils/formatter')

const statusEmoji = { solteiro: '💔', namorando: '💑', casado: '💍' }
const statusLabel = { solteiro: 'Solteiro(a)', namorando: 'Namorando', casado: 'Casado(a)' }

module.exports = {
  name: ['relacionamento', 'amor', 'casal', 'status_amor', 'rel'],
  description: 'Ver o teu estado de relacionamento',
  category: 'Social',
  async execute({ sock, from, msg, sender, pushName, args }) {
    let targetJid = sender
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (mentioned?.length) targetJid = mentioned[0]

    const user = getUser(targetJid, targetJid === sender ? pushName : null)
    const status = user.relationship_status || 'solteiro'
    const emoji = statusEmoji[status]
    const label = statusLabel[status]

    const lines = [
      header(`${emoji} Estado Amoroso — ${user.name}`),
      ``,
      `${emoji} *Status:* ${label}`,
    ]

    if (user.partner) {
      const partner = getUser(user.partner)
      lines.push(`💑 *${status === 'casado' ? 'Cônjuge' : 'Par'}:* ${partner.name}`)
    }

    if (status === 'solteiro') {
      lines.push(``, `💡 Experimenta */paquerar @user* ou */namorar @user*!`)
    }

    await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg })
  },
}
