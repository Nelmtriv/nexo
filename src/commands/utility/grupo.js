const { header } = require('../../utils/formatter')

module.exports = {
  name: ['grupo', 'group', 'grp', 'infog', 'infogrupo'],
  description: 'Informações sobre o grupo',
  category: 'Utilidade',
  async execute({ sock, from, msg }) {
    const meta = await sock.groupMetadata(from)
    const admins = meta.participants.filter(p => p.admin).length
    const created = new Date(meta.creation * 1000).toLocaleDateString('pt-PT')

    const text = [
      header('📋 Info do Grupo'),
      ``,
      `📛 *Nome:* ${meta.subject}`,
      `👥 *Membros:* ${meta.participants.length}`,
      `👑 *Admins:* ${admins}`,
      `📅 *Criado em:* ${created}`,
      meta.desc ? `\n📝 *Descrição:*\n${meta.desc}` : '',
    ].filter(Boolean).join('\n')

    await sock.sendMessage(from, { text }, { quoted: msg })
  },
}
