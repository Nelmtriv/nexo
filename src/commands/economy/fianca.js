const { getUser, updateUser, removeGemas } = require('../../database/users')
const { formatRemaining } = require('../../utils/cooldown')
const { gem } = require('../../utils/formatter')

module.exports = {
  name: ['fianca', 'bail', 'libertar_se', 'sairprisao', 'pagar_fianca', 'soltar_me'],
  description: 'Paga fiança para sair da prisão',
  category: 'Economia',
  async execute({ sock, from, msg, sender, pushName }) {
    const user = getUser(sender, pushName)

    if (!user.prison_until || new Date(user.prison_until) <= new Date()) {
      await sock.sendMessage(from, { text: '😌 Não estás na prisão.' }, { quoted: msg }); return
    }

    const remaining = new Date(user.prison_until).getTime() - Date.now()
    // fiança = 50💎 por cada 10 minutos restantes (mínimo 30💎)
    const fianca = Math.max(30, Math.floor(remaining / (10 * 60 * 1000)) * 50)

    if (user.gemas < fianca) {
      await sock.sendMessage(from, {
        text: [
          `🔒 *${user.name}*, estás preso por mais *${formatRemaining(remaining)}*.`,
          ``,
          `💵 Fiança: ${gem(fianca)}`,
          `❌ Não tens gemas suficientes! Saldo: ${gem(user.gemas)}`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    removeGemas(sender, fianca)
    updateUser(sender, { prison_until: null })

    await sock.sendMessage(from, {
      text: `🔓 *${user.name}* pagou a fiança de ${gem(fianca)} e está livre!\n💳 Saldo: ${gem(user.gemas - fianca)}`,
    }, { quoted: msg })
  },
}
