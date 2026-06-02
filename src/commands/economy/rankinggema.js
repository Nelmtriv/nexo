const { getRankingGemas } = require('../../database/users')
const { gem, header } = require('../../utils/formatter')

const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

module.exports = {
  name: ['rankinggema', 'topgemas', 'rankgema', 'rico', 'ricos', 'maisoricos'],
  description: 'Top 10 jogadores com mais gemas (carteira + banco)',
  category: 'Economia',
  async execute({ sock, from, msg }) {
    const users = getRankingGemas(10)
    if (!users.length) { await sock.sendMessage(from, { text: '📭 Nenhum jogador ainda.' }, { quoted: msg }); return }

    const lines = users.map((u, i) => {
      const total = (u.gemas || 0) + (u.bank || 0)
      const detail = u.bank > 0 ? ` (${gem(u.gemas)} + 🏦${gem(u.bank)})` : ''
      return `${medals[i]} *${u.name}* — ${gem(total)}${detail}`
    })

    await sock.sendMessage(from, {
      text: [header('💎 Ranking Gemas — Top 10'), '', ...lines].join('\n'),
    }, { quoted: msg })
  },
}
