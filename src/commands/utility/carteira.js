const { getUser } = require('../../database/users')
const { gem, line } = require('../../utils/formatter')
const { getLevelTitle, xpBar } = require('../../utils/level')
const { formatRemaining } = require('../../utils/cooldown')

const JOBS_DISPLAY = {
  desempregado: '🪑 Desempregado', ajudante: '🧹 Ajudante',
  minerador: '⛏️ Minerador', comerciante: '🛒 Comerciante',
  hacker: '💻 Hacker', mercenario: '⚔️ Mercenário', empresario: '💼 Empresário',
}

module.exports = {
  name: ['carteira', 'wallet', 'car', 'conta', 'stats', 'status'],
  description: 'Ver a tua carteira completa',
  category: 'Utilidade',
  async execute({ sock, from, msg, sender, pushName }) {
    const user = getUser(sender, pushName)
    const level = user.level || 1
    const title = getLevelTitle(level)
    const xpBarStr = xpBar(user.xp || 0, level)
    const total = (user.gemas || 0) + (user.bank || 0)
    const winRate = (user.games || 0) > 0 ? (((user.wins || 0) / user.games) * 100).toFixed(1) : '0.0'
    const job = JOBS_DISPLAY[user.job] || '🪑 Desempregado'
    const streak = user.streak || 0

    const achCount = Object.keys(user.achievements || {}).length

    let prisonText = ''
    if (user.prison_until && new Date(user.prison_until) > new Date()) {
      const rem = new Date(user.prison_until).getTime() - Date.now()
      prisonText = `\n🔒 *Preso:* ${formatRemaining(rem)} restantes`
    }

    const text = [
      `╔══════════════════════╗`,
      `║   💼 *CARTEIRA*        ║`,
      `╚══════════════════════╝`,
      ``,
      `👤 *${user.name}*  ${title}`,
      `💼 ${job}  |  🔥 Streak: ${streak} dia(s)`,
      ``,
      `⚡ *Nível ${level}*`,
      `${xpBarStr}`,
      ``,
      `💳 *Carteira:*  ${gem(user.gemas)}`,
      `🏦 *Banco:*     ${gem(user.bank || 0)}`,
      `💰 *Total:*     ${gem(total)}`,
      ``,
      `📊 *Stats*`,
      `┣ 🏆 Vitórias: ${user.wins || 0}  💀 Derrotas: ${user.losses || 0}`,
      `┣ 🎮 Total jogos: ${user.games || 0}  📈 ${winRate}% taxa`,
      `┗ 🏅 Conquistas: ${achCount}`,
      prisonText,
      ``,
      line(),
    ].filter(l => l !== '').join('\n')

    await sock.sendMessage(from, { text }, { quoted: msg })
  },
}
