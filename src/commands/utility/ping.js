const { botName } = require('../../config')

module.exports = {
  name: ['ping', 'online', 'testar', 'latencia'],
  description: 'Verifica se o bot está online',
  category: 'Utilidade',
  async execute({ sock, from, msg }) {
    const start = Date.now()
    await sock.sendMessage(from, { text: '🏓 Calculando...' }, { quoted: msg })
    const latency = Date.now() - start
    await sock.sendMessage(from, { text: `🏓 *Pong!*\n⚡ Latência: ${latency}ms\n🤖 ${botName} está online!` })
  },
}
