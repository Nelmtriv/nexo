const { getUser } = require('../../database/users')
const { gem, header } = require('../../utils/formatter')

module.exports = {
  name: ['saldo', 'bal', 'gemas', 'coins', 'moedas', 'dinheiro'],
  description: 'Ver o teu saldo de gemas',
  category: 'Economia',
  async execute({ sock, from, msg, sender, pushName }) {
    const user = getUser(sender, pushName)
    await sock.sendMessage(from, {
      text: `💎 *${user.name}*, tens *${gem(user.gemas)}* no teu saldo.`,
    }, { quoted: msg })
  },
}
