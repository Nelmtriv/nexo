const { botName } = require('../../config')

module.exports = {
  name: ['anuncio', 'announce'],
  description: 'Admin: enviar anúncio com destaque',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg, args }) {
    const text = args.join(' ')
    if (!text) {
      await sock.sendMessage(from, { text: '❓ Uso: */anuncio <mensagem>*' }, { quoted: msg })
      return
    }

    const announcement = [
      `📢 *━━━━━ ANÚNCIO ━━━━━*`,
      ``,
      text,
      ``,
      `*━━━━━━━━━━━━━━━━━━━*`,
      `🤖 ${botName}`,
    ].join('\n')

    await sock.sendMessage(from, { text: announcement })
  },
}
