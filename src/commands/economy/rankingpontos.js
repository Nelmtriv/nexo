const { getRankingPontos } = require('../../database/users')
const { header } = require('../../utils/formatter')

const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

module.exports = {
  name: ['rankingpontos', 'toppontos', 'rankpontos', 'pontos', 'pts', 'topjogadores'],
  description: 'Top 10 jogadores com mais pontos (ganhos em jogos)',
  category: 'Economia',
  async execute({ sock, from, msg }) {
    const users = getRankingPontos(10)
    if (!users.length) { await sock.sendMessage(from, { text: '📭 Nenhum jogador ainda.' }, { quoted: msg }); return }

    const lines = users.map((u, i) =>
      `${medals[i]} *${u.name}* — ${u.pontos || 0} pts  (${u.wins || 0}V / ${u.losses || 0}D)`
    )

    await sock.sendMessage(from, {
      text: [header('🏆 Ranking Pontos — Top 10'), '', ...lines, '', '💡 Pontos ganhos jogando'].join('\n'),
    }, { quoted: msg })
  },
}
