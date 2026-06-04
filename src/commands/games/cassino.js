const { getUser, updateUser, addGemas, removeGemas, addWin, addLoss, addPontos } = require('../../database/users')
const { gem } = require('../../utils/formatter')
const { checkDailyLimit, handleLimitExceeded, usageFooter } = require('../../utils/dailyLimit')
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

    const limitResult = checkDailyLimit(sender, 'cassino')
    if (!limitResult.allowed) {
      await handleLimitExceeded(sock, from, msg, sender, user.name, limitResult)
      return
    }

    const bet = parseInt(args[0])
    if (!bet || bet < 10) {
      await sock.sendMessage(from, {
        text: `❓ Uso: */cassino <aposta>*\nAposta mínima: 10💎`,
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

    let text
    if (multiplier === 0) {
      removeGemas(sender, bet, `🎰 Cassino — perdeu aposta`)
      addLoss(sender)
      const updated = getUser(sender)
      text = [
        `🎰 *Cassino*`,
        ``,
        `[ ${display} ]`,
        ``,
        `😢 Sem sorte! Perdes ${gem(bet)}.`,
        `💰 Saldo: ${gem(updated.gemas)}`,
        usageFooter(limitResult),
      ].filter(Boolean).join('\n')
    } else {
      const isJackpot = reels[0] === reels[1] && reels[1] === reels[2]
      const gain = Math.floor(bet * multiplier)
      const profit = gain - bet
      addGemas(sender, profit, `🎰 Cassino — ${isJackpot ? 'JACKPOT' : 'combinação'} ×${multiplier}`)
      addWin(sender)
      const pts = isJackpot ? 20 : 5
      addPontos(sender, pts)
      const updated = getUser(sender)
      text = [
        `🎰 *Cassino*`,
        ``,
        `[ ${display} ]`,
        ``,
        isJackpot ? `🎊 *JACKPOT! ${multiplier}x!*` : `✨ *Combinação!*`,
        `💎 Ganhas ${gem(gain)} (lucro: +${gem(profit)})`,
        `🏅 +${pts} pts`,
        `💰 Saldo: ${gem(updated.gemas)}`,
        usageFooter(limitResult),
      ].filter(Boolean).join('\n')
    }

    await sock.sendMessage(from, { text }, { quoted: msg })
  },
}
