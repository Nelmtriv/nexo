const { getUser, addGemas, removeGemas, addPontos } = require('../../database/users')
const { addXP } = require('../../utils/level')
const { gem } = require('../../utils/formatter')
const { checkDailyLimit, handleLimitExceeded } = require('../../utils/dailyLimit')

const TICKET_PRICE = 35
const SYMBOLS = ['🍒', '🍋', '🍊', '⭐', '💎', '7️⃣']

const PRIZES = {
  '💎': 500,
  '7️⃣': 300,
  '⭐': 150,
}
const THREE_ANY = 100
const TWO_ANY   = 50

function scratch() {
  return [0, 1, 2].map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
}

module.exports = {
  name: ['raspadinha', 'raspar', 'scratch', 'rascadinha'],
  description: `Raspadinha — ${TICKET_PRICE}💎 por bilhete. Tenta a sorte!`,
  category: 'Jogos',
  async execute({ sock, from, msg, sender, pushName }) {
    const user = getUser(sender, pushName)

    const limitResult = checkDailyLimit(sender, 'raspadinha')
    if (!limitResult.allowed) {
      await handleLimitExceeded(sock, from, msg, sender, user.name, limitResult)
      return
    }

    if (user.gemas < TICKET_PRICE) {
      await sock.sendMessage(from, {
        text: `❌ Precisas de ${gem(TICKET_PRICE)} para comprar uma raspadinha.`,
      }, { quoted: msg }); return
    }

    removeGemas(sender, TICKET_PRICE, '🎟️ Raspadinha')

    const [a, b, c] = scratch()
    let prize = 0
    let resultLine = ''

    if (a === b && b === c) {
      prize = PRIZES[a] ?? THREE_ANY
      resultLine = `🎊 *TRÊS IGUAIS!* ${a}${b}${c}`
    } else if (a === b || b === c || a === c) {
      prize = TWO_ANY
      resultLine = `✨ *Dois iguais!* ${a}${b}${c}`
    } else {
      resultLine = `😞 Sem sorte… ${a}${b}${c}`
    }

    if (prize > 0) {
      addGemas(sender, prize, `🎟️ Raspadinha — prémio`)
      addPontos(sender, 5)
      addXP(sender, 5)
    }

    const updated = getUser(sender)
    const net = prize - TICKET_PRICE

    await sock.sendMessage(from, {
      text: [
        `🎟️ *Raspadinha!*`,
        ``,
        `[ ${a} | ${b} | ${c} ]`,
        ``,
        resultLine,
        prize > 0
          ? `💎 Prémio: *+${gem(prize)}* (lucro: ${net >= 0 ? '+' : ''}${gem(net)})`
          : `💸 Perdeste ${gem(TICKET_PRICE)}`,
        `💳 Saldo: ${gem(updated.gemas)}`,
      ].join('\n'),
    }, { quoted: msg })
  },
}
