module.exports = {
  name: ['abrir'],
  description: 'Admin: abrir o grupo para todos',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg }) {
    try {
      await sock.groupSettingUpdate(from, 'not_announcement')
      await sock.sendMessage(from, { text: '🔔 Grupo aberto. Todos podem enviar mensagens.' })
    } catch {
      await sock.sendMessage(from, { text: '❌ Não foi possível abrir o grupo. O bot é admin?' }, { quoted: msg })
    }
  },
}
