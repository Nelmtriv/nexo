const { getUser, updateUser, addGemas, removeGemas, addWin, addLoss, addPontos } = require('../../database/users')
const { gem } = require('../../utils/formatter')
const { formatRemaining } = require('../../utils/cooldown')

const MAX_DAILY = 3
const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣']

function spin() {
  return [0, 1, 2].map(() => symbols[Math.floor(Math.random() * symbols.length)])
}

function calculateMultiplier(reels) {
  const [a, b, c] = reels
  if (a === b && b === c) {
    if (a === '💎') return 10
    if (a === '7️⃣') return 7
    if (a === '⭐') return 5
    return 3
  }
  if (a === b || b === c || a === c) return 1.5
  return 0
}

module.exports = {
  name: ['cassino', 'slots', 'slot', 'girar', 'apostar', 'roleta', 'cas'],
  description: 'Aposta gemas nos slots (máx 3 vezes por dia)',
  category: 'Jogos',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const user = getUser(sender, pushName)

    // daily limit
    const today = new Date().toDateString()
    const isNewDay = user.cassino_today_date !== today
    const cassinoCount = isNewDay ? 0 : (user.cassino_today_count || 0)

    if (cassinoCount >= MAX_DAILY) {
      const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 0)
      await sock.sendMessage(from, {
        text: `🎰 *${user.name}*, já jogaste no cassino *3 vezes hoje*! A casa fechou para ti.\n⏳ Volta em *${formatRemaining(tomorrow - Date.now())}* (meia-noite).`,
      }, { quoted: msg })
      return
    }

    const bet = parseInt(args[0])
    if (!bet || bet < 10) {
      await sock.sendMessage(from, {
        text: `❓ Uso: */cassino <aposta>*\nAposta mínima: 10💎\n🎰 Jogadas hoje: *${cassinoCount}/${MAX_DAILY}*`,
      }, { quoted: msg })
      return
    }

    if (user.gemas < bet) {
      await sock.sendMessage(from, {
        text: `❌ Saldo insuficiente! Tens apenas ${gem(user.gemas)}.`,
      }, { quoted: msg })
      return
    }

    const reels = spin()
    const multiplier = calculateMultiplier(reels)
    const display = reels.join(' | ')
    const jogadasHoje = cassinoCount + 1

    updateUser(sender, {
      cassino_today_count: jogadasHoje,
      cassino_today_date: today,
    })

    let text
    if (multiplier === 0) {
      removeGemas(sender, bet, `🎰 Cassino — perdeu aposta`)
      addLoss(sender)
      const updated = getUser(sender)
      text = [
        `🎰 *Cassino* (${jogadasHoje}/${MAX_DAILY} hoje)`,
        ``,
        `[ ${display} ]`,
        ``,
        `😢 Sem sorte! Perdes ${gem(bet)}.`,
        `💰 Saldo: ${gem(updated.gemas)}`,
        jogadasHoje >= MAX_DAILY ? `⚠️ Última jogada do dia! Volta amanhã.` : ``,
      ].filter(l => l !== '').join('\n')
    } else {
      const gain = Math.floor(bet * multiplier)
      const profit = gain - bet
      addGemas(sender, profit, `🎰 Cassino — ${isJackpot ? 'JACKPOT' : 'combinação'} ×${multiplier}`)
      addWin(sender)
      const isJackpot = reels[0] === reels[1] && reels[1] === reels[2]
      const pts = isJackpot ? 20 : 5
      addPontos(sender, pts)
      const updated = getUser(sender)
      text = [
        `🎰 *Cassino* (${jogadasHoje}/${MAX_DAILY} hoje)`,
        ``,
        `[ ${display} ]`,
        ``,
        isJackpot ? `🎊 *JACKPOT! ${multiplier}x!*` : `✨ *Combinação!*`,
        `💎 Ganhas ${gem(gain)} (lucro: +${gem(profit)})`,
        `🏅 +${pts} pts`,
        `💰 Saldo: ${gem(updated.gemas)}`,
        jogadasHoje >= MAX_DAILY ? `⚠️ Última jogada do dia! Volta amanhã.` : ``,
      ].filter(l => l !== '').join('\n')
    }

    await sock.sendMessage(from, { text }, { quoted: msg })
  },
}
