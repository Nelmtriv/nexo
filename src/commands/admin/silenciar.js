module.exports = {
  name: ['silenciar', 'fechar'],
  description: 'Admin: silenciar o grupo (apenas admins falam)',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg }) {
    try {
      await sock.groupSettingUpdate(from, 'announcement')
      await sock.sendMessage(from, { text: '🔇 Grupo silenciado. Apenas admins podem enviar mensagens.' })
    } catch {
      await sock.sendMessage(from, { text: '❌ Não foi possível silenciar. O bot é admin?' }, { quoted: msg })
    }
  },
}
