const { prefix } = require('../../config')

module.exports = {
  name: ['ranking', 'top', 'leaderboard'],
  description: 'Ver rankings. Use /rankinggema ou /rankingpontos',
  category: 'Economia',
  async execute({ sock, from, msg }) {
    const p = prefix
    await sock.sendMessage(from, {
      text: [
        `📊 *Rankings Disponíveis*`,
        ``,
        `💎 *${p}rankinggema* — Top 10 mais ricos`,
        `🏆 *${p}rankingpontos* — Top 10 por pontos de jogo`,
      ].join('\n'),
    }, { quoted: msg })
  },
}
