const { getUser, addGemas, removeGemas, addWin, addLoss, addPontos, getActiveGame, saveActiveGame, deleteActiveGame } = require('../../database/users')
const { addXP, getLevelTitle } = require('../../utils/level')
const { checkAndAward } = require('../../utils/achievements')
const { gem } = require('../../utils/formatter')

const SUITS = ['♠️', '♥️', '♦️', '♣️']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

function createDeck() {
  const deck = []
  for (const suit of SUITS)
    for (const rank of RANKS)
      deck.push({ suit, rank })
  return shuffle(deck)
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function cardValue(rank) {
  if (['J', 'Q', 'K'].includes(rank)) return 10
  if (rank === 'A') return 11
  return parseInt(rank)
}

function handValue(hand) {
  let total = hand.reduce((s, c) => s + cardValue(c.rank), 0)
  let aces = hand.filter(c => c.rank === 'A').length
  while (total > 21 && aces > 0) { total -= 10; aces-- }
  return total
}

function cardStr(card) { return `${card.rank}${card.suit}` }
function handStr(hand, hideSecond = false) {
  if (hideSecond && hand.length >= 2)
    return `${cardStr(hand[0])} ??`
  return hand.map(cardStr).join(' ')
}

function renderTable(state, showDealer = false) {
  const pVal = handValue(state.player)
  const dVal = showDealer ? handValue(state.dealer) : '?'
  return [
    `🃏 *Blackjack*`,
    ``,
    `🤖 Dealer: ${handStr(state.dealer, !showDealer)} ${showDealer ? `(${dVal})` : ''}`,
    `👤 Tu:     ${handStr(state.player)} (${pVal})`,
    `💰 Aposta: ${gem(state.bet)}`,
  ].join('\n')
}

module.exports = {
  name: ['blackjack', 'bj', '21', 'cartas', 'black'],
  description: 'Blackjack contra o dealer. /bj <aposta> | /bj hit | /bj stand | /bj double',
  category: 'Jogos',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const user = getUser(sender, pushName)
    const sub = args[0]?.toLowerCase()
    const existing = getActiveGame(from + sender, 'blackjack')

    // --- Actions on existing game ---
    if (existing && (sub === 'hit' || sub === 'h' || sub === 'carta')) {
      if (existing.player_jid !== sender) { await sock.sendMessage(from, { text: '❕ Não és tu que estás a jogar!' }, { quoted: msg }); return }
      const state = existing.state
      state.player.push(state.deck.pop())
      const pVal = handValue(state.player)

      if (pVal > 21) {
        deleteActiveGame(from + sender, 'blackjack')
        removeGemas(sender, state.bet); addLoss(sender)
        const updated = getUser(sender)
        await sock.sendMessage(from, {
          text: `${renderTable(state, true)}\n\n💥 *Bust!* Passaste de 21.\n💸 -${gem(state.bet)} | Saldo: ${gem(updated.gemas)}`,
        }, { quoted: msg })
        return
      }

      if (pVal === 21) {
        return await resolveStand(sock, from, msg, sender, state)
      }

      saveActiveGame(from + sender, 'blackjack', sender, state)
      await sock.sendMessage(from, {
        text: `${renderTable(state)}\n\n➡️ */bj hit* — mais uma carta\n➡️ */bj stand* — parar\n➡️ */bj double* — dobrar aposta`,
      }, { quoted: msg })
      return
    }

    if (existing && (sub === 'stand' || sub === 's' || sub === 'parar')) {
      if (existing.player_jid !== sender) { await sock.sendMessage(from, { text: '❕ Não és tu que estás a jogar!' }, { quoted: msg }); return }
      return await resolveStand(sock, from, msg, sender, existing.state)
    }

    if (existing && (sub === 'double' || sub === 'd' || sub === 'dobrar')) {
      if (existing.player_jid !== sender) { await sock.sendMessage(from, { text: '❕ Não és tu que estás a jogar!' }, { quoted: msg }); return }
      const state = existing.state
      if (user.gemas < state.bet) {
        await sock.sendMessage(from, { text: `❌ Não tens gemas para dobrar a aposta.` }, { quoted: msg })
        return
      }
      state.bet *= 2
      state.player.push(state.deck.pop())
      const pVal = handValue(state.player)
      if (pVal > 21) {
        deleteActiveGame(from + sender, 'blackjack')
        removeGemas(sender, state.bet); addLoss(sender)
        const updated = getUser(sender)
        await sock.sendMessage(from, {
          text: `${renderTable(state, true)}\n\n💥 *Bust!* Passaste de 21 com aposta dobrada.\n💸 -${gem(state.bet)} | Saldo: ${gem(updated.gemas)}`,
        }, { quoted: msg })
        return
      }
      return await resolveStand(sock, from, msg, sender, state)
    }

    // show current game
    if (existing && !['hit','h','carta','stand','s','parar','double','d','dobrar'].includes(sub)) {
      await sock.sendMessage(from, {
        text: `${renderTable(existing.state)}\n\n*/bj hit* | */bj stand* | */bj double*`,
      }, { quoted: msg }); return
    }

    // --- Start new game ---
    if (existing) {
      await sock.sendMessage(from, { text: `❕ Já tens um jogo em curso! */bj hit* ou */bj stand*` }, { quoted: msg }); return
    }

    const bet = parseInt(args[0])
    if (!bet || bet < 10) {
      await sock.sendMessage(from, {
        text: `❓ Uso: */blackjack <aposta>*\nAposta mínima: 10💎\n\nDurante o jogo:\n*/bj hit* — mais carta\n*/bj stand* — parar\n*/bj double* — dobrar aposta`,
      }, { quoted: msg }); return
    }
    if (user.gemas < bet) {
      await sock.sendMessage(from, { text: `❌ Saldo insuficiente! Tens ${gem(user.gemas)}.` }, { quoted: msg }); return
    }

    const deck = createDeck()
    const player = [deck.pop(), deck.pop()]
    const dealer = [deck.pop(), deck.pop()]
    const state = { player, dealer, deck, bet }

    const pVal = handValue(player)
    // natural blackjack
    if (pVal === 21) {
      const dVal = handValue(dealer)
      if (dVal === 21) {
        await sock.sendMessage(from, {
          text: `${renderTable(state, true)}\n\n🤝 *Empate de Blackjacks!* Aposta devolvida.`,
        }, { quoted: msg }); return
      }
      const winnings = Math.floor(bet * 1.5)
      addGemas(sender, winnings); addWin(sender)
      addPontos(sender, 25)
      addXP(sender, 40)
      const updated = getUser(sender)
      await sock.sendMessage(from, {
        text: `${renderTable(state, true)}\n\n🃏 *BLACKJACK!* Ganhas ${gem(bet + winnings)}! | 🏅 +25 pts\n💳 Saldo: ${gem(updated.gemas)}`,
      }, { quoted: msg }); return
    }

    saveActiveGame(from + sender, 'blackjack', sender, state)
    await sock.sendMessage(from, {
      text: `${renderTable(state)}\n\n*/bj hit* — mais carta\n*/bj stand* — parar\n*/bj double* — dobrar aposta`,
    }, { quoted: msg })
  },
}

async function resolveStand(sock, from, msg, sender, state) {
  deleteActiveGame(from + sender, 'blackjack')

  // dealer plays: hits until 17+
  while (handValue(state.dealer) < 17) {
    state.dealer.push(state.deck.pop())
  }

  const pVal = handValue(state.player)
  const dVal = handValue(state.dealer)
  const updated = getUser(sender)

  let resultLine
  if (dVal > 21 || pVal > dVal) {
    addGemas(sender, state.bet); addWin(sender)
    addPontos(sender, 10)
    const { leveledUp, newLevel } = addXP(sender, 30)
    const awarded = checkAndAward(sender, 'win', null)
    checkAndAward(sender, 'gemas', null)
    const u2 = getUser(sender)
    resultLine = `🎉 *Vitória!* +${gem(state.bet)} | 🏅 +10 pts | Saldo: ${gem(u2.gemas)}`
    if (leveledUp) resultLine += `\n🎉 Nível UP! → ${newLevel}`
    if (awarded.length) resultLine += `\n🏅 ${awarded[0].name}!`
  } else if (pVal === dVal) {
    resultLine = `🤝 *Empate!* Aposta devolvida.`
  } else {
    removeGemas(sender, state.bet); addLoss(sender)
    addXP(sender, 5)
    const u2 = getUser(sender)
    resultLine = `😢 *Dealer ganhou.* -${gem(state.bet)} | Saldo: ${gem(u2.gemas)}`
  }

  await sock.sendMessage(from, {
    text: `${renderTable(state, true)}\n\n🤖 Dealer: ${dVal} | 👤 Tu: ${pVal}\n\n${resultLine}`,
  }, { quoted: msg })
}
