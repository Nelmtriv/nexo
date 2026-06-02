const { getUser } = require('../../database/users')
const { header } = require('../../utils/formatter')

module.exports = {
  name: ['historico', 'log', 'transacoes', 'extrato', 'hist'],
  description: 'Ver o histórico das últimas transações de gemas',
  category: 'Utilidade',
  async execute({ sock, from, msg, sender, pushName }) {
    const user = getUser(sender, pushName)
    const hist = user.historico || []

    if (!hist.length) {
      await sock.sendMessage(from, {
        text: `📭 *${user.name}*, ainda não há transações registadas.`,
      }, { quoted: msg })
      return
    }

    const lines = hist.map((t, i) => {
      const sign = t.amount >= 0 ? '+' : ''
      const emoji = t.amount >= 0 ? '🟢' : '🔴'
      const time = new Date(t.ts).toLocaleString('pt-PT', {
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
      return `${emoji} ${sign}${t.amount}💎  ${t.reason}\n   └ Saldo: ${t.balance}💎 | ${time}`
    })

    const text = [
      header(`📋 Histórico — ${user.name}`),
      `💎 Saldo actual: ${user.gemas}💎`,
      ``,
      ...lines,
    ].join('\n')

    await sock.sendMessage(from, { text }, { quoted: msg })
  },
}
