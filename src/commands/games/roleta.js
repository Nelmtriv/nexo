const { getUser, addGemas, removeGemas, addWin, addLoss, addPontos } = require('../../database/users')
const { addXP } = require('../../utils/level')
const { gem } = require('../../utils/formatter')
const { checkDailyLimit, handleLimitExceeded } = require('../../utils/dailyLimit')

const RED   = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36])
const BLACK = new Set([2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35])

function spin() { return Math.floor(Math.random() * 37) } // 0-36

function colorOf(n) {
  if (n === 0) return '🟢'
  return RED.has(n) ? '🔴' : '⚫'
}

module.exports = {
  name: ['roleta', 'roulette', 'girarroleta', 'rl'],
  description: 'Roleta — /roleta <aposta> <numero|vermelho|preto|par|impar>',
  category: 'Jogos',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const user = getUser(sender, pushName)

    if (args.length < 2) {
      await sock.sendMessage(from, {
        text: [
          `🎡 *Roleta* — Como jogar:`,
          ``,
          `*/roleta <aposta> <opção>*`,
          ``,
          `Opções:`,
          `  • *vermelho* / *preto* → paga 2×`,
          `  • *par* / *impar* → paga 2×`,
          `  • *<número 0-36>* → paga 35×`,
          ``,
          `Exemplos:`,
          `  /roleta 50 vermelho`,
          `  /roleta 100 par`,
          `  /roleta 30 14`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    const bet = parseInt(args[0])
    if (!bet || bet < 10) {
      await sock.sendMessage(from, { text: `❌ Aposta mínima: ${gem(10)}` }, { quoted: msg }); return
    }
    if (user.gemas < bet) {
      await sock.sendMessage(from, { text: `❌ Saldo insuficiente. Tens ${gem(user.gemas)}.` }, { quoted: msg }); return
    }

    const limitResult = checkDailyLimit(sender, 'roleta')
    if (!limitResult.allowed) {
      await handleLimitExceeded(sock, from, msg, sender, user.name, limitResult)
      return
    }

    const choice = args[1].toLowerCase()
    const result = spin()
    const color  = colorOf(result)
    const isRed  = RED.has(result)
    const isEven = result !== 0 && result % 2 === 0
    const isZero = result === 0

    let won = false
    let multiplier = 0
    let choiceLabel = choice

    const numChoice = parseInt(choice)
    if (!isNaN(numChoice) && numChoice >= 0 && numChoice <= 36) {
      won = result === numChoice
      multiplier = 35
      choiceLabel = `número ${numChoice}`
    } else if (choice === 'vermelho') {
      won = isRed
      multiplier = 2
    } else if (choice === 'preto') {
      won = BLACK.has(result)
      multiplier = 2
    } else if (choice === 'par') {
      won = isEven
      multiplier = 2
    } else if (choice === 'impar') {
      won = !isEven && !isZero
      multiplier = 2
    } else {
      await sock.sendMessage(from, { text: `❓ Opção inválida. Usa: vermelho, preto, par, impar, ou um número (0-36)` }, { quoted: msg }); return
    }

    removeGemas(sender, bet, `🎡 Roleta — aposta em ${choiceLabel}`)

    if (won) {
      const profit = bet * multiplier - bet
      addGemas(sender, bet * multiplier, `🎡 Roleta — ganhou (${choiceLabel}) ×${multiplier}`)
      addWin(sender)
      addPontos(sender, multiplier > 2 ? 20 : 5)
      addXP(sender, multiplier > 2 ? 25 : 8)
    } else {
      addLoss(sender)
      addXP(sender, 2)
    }

    const updated = getUser(sender)
    const net = won ? bet * multiplier - bet : -bet

    await sock.sendMessage(from, {
      text: [
        `🎡 *Roleta!*`,
        ``,
        `A bola caiu no: *${result}* ${color}${isZero ? ' (zero!)' : ''}`,
        ``,
        won
          ? `🎉 *Ganhaste!* ×${multiplier} → *+${gem(bet * multiplier - bet)}* de lucro`
          : `😢 Perdeste! (apostaste em ${choiceLabel})`,
        `💳 Saldo: ${gem(updated.gemas)}`,
      ].join('\n'),
    }, { quoted: msg })
  },
}
