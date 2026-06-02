const { getUser, addGemas, removeGemas, addWin, addLoss, addPontos, getActiveGame, saveActiveGame, deleteActiveGame } = require('../../database/users')
const { addXP, getLevelTitle } = require('../../utils/level')
const { checkAndAward } = require('../../utils/achievements')
const { gem, mention } = require('../../utils/formatter')

const DUEL_TIMEOUT_MS = 60_000
const duelTimers = {}

const WEAPONS   = ['🗡️', '⚔️', '🏹', '🔱', '🪃', '🪓', '💣']
const SHIELDS   = ['🛡️', '🧱', '🪬', '💨']
const CRITS     = ['💥 CRÍTICO!', '🔥 DEVASTADOR!', '⚡ DESTRUIDOR!']
const MISSES    = ['💨 Errou!', '😅 Esquivou-se!', '🌀 Defletido!']

function simulateFight(a, b) {
  let aHP = 100 + (a.level || 1) * 3
  let bHP = 100 + (b.level || 1) * 3
  const maxHP_a = aHP, maxHP_b = bHP
  const rounds = []
  let turn = 0

  while (aHP > 0 && bHP > 0 && rounds.length < 12) {
    const attacker = turn % 2 === 0 ? a : b
    const defender  = turn % 2 === 0 ? b : a
    const levelBonus = ((attacker.level || 1) - (defender.level || 1)) * 2
    const base = Math.floor(Math.random() * 25) + 10 + Math.max(0, levelBonus)
    const roll = Math.random()

    if (roll < 0.15) {
      rounds.push(`${MISSES[Math.floor(Math.random() * MISSES.length)]} *${attacker.name}* falhou!`)
    } else if (roll > 0.80) {
      const dmg = Math.floor(base * 1.8)
      if (turn % 2 === 0) bHP -= dmg; else aHP -= dmg
      rounds.push(`${WEAPONS[Math.floor(Math.random() * WEAPONS.length)]} *${attacker.name}* — ${CRITS[Math.floor(Math.random() * CRITS.length)]} *-${dmg} HP*`)
    } else {
      if (turn % 2 === 0) bHP -= base; else aHP -= base
      const shield = Math.random() > 0.7 ? ` ${SHIELDS[Math.floor(Math.random() * SHIELDS.length)]}` : ''
      rounds.push(`${WEAPONS[Math.floor(Math.random() * WEAPONS.length)]} *${attacker.name}* causou *-${base} HP*${shield}`)
    }

    rounds.push(`   › ${a.name}: ${Math.max(0, aHP)}❤️  |  ${b.name}: ${Math.max(0, bHP)}❤️`)
    turn++
    if (aHP <= 0 || bHP <= 0) break
  }

  const winner = aHP > bHP ? a : (bHP > aHP ? b : null)
  return { rounds, winner, aHP: Math.max(0, aHP), bHP: Math.max(0, bHP) }
}

module.exports = {
  name: ['duelo', 'duel', 'desafio', 'lutar', 'batalha', 'fight'],
  description: 'Desafia alguém para um duelo PvP. /duelo @user <aposta>',
  category: 'Jogos',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const sub = args[0]?.toLowerCase()
    const user = getUser(sender, pushName)

    // /duelo aceitar — accept challenge
    if (sub === 'aceitar' || sub === 'accept' || sub === 'a') {
      const pending = getActiveGame(from, 'duelo')
      if (!pending) {
        await sock.sendMessage(from, { text: '❕ Não há nenhum duelo pendente no grupo.' }, { quoted: msg }); return
      }
      if (pending.player_jid === sender) {
        await sock.sendMessage(from, { text: '😅 Não podes aceitar o teu próprio duelo.' }, { quoted: msg }); return
      }

      const challenger = getUser(pending.player_jid)
      const challenged = getUser(sender, pushName)
      const bet = pending.state.bet

      if (challenged.gemas < bet) {
        await sock.sendMessage(from, { text: `❌ Não tens ${gem(bet)} para aceitar o duelo.` }, { quoted: msg }); return
      }

      clearTimeout(duelTimers[from])
      delete duelTimers[from]
      deleteActiveGame(from, 'duelo')

      const { rounds, winner, aHP, bHP } = simulateFight(challenger, challenged)
      const loser = winner?.jid === challenger.jid ? challenged : challenger

      const lines = [
        `⚔️ *DUELO!* ${challenger.name} vs ${challenged.name}`,
        `💰 Aposta: ${gem(bet)}`,
        ``,
        `─── Combate ───`,
        ...rounds,
        ``,
        `─── Resultado ───`,
      ]

      if (!winner) {
        lines.push(`🤝 *EMPATE!* Ninguém leva as gemas.`)
      } else {
        const gain = bet * 2
        addGemas(winner.jid, gain)
        removeGemas(loser.jid, bet)
        addWin(winner.jid); addLoss(loser.jid)
        addPontos(winner.jid, 20)
        const { leveledUp, newLevel } = addXP(winner.jid, 35)
        addXP(loser.jid, 10)
        const awarded = checkAndAward(winner.jid, 'duel', null)
        const winnerUpdated = getUser(winner.jid)

        lines.push(`🏆 *${winner.name}* VENCEU o duelo!`)
        lines.push(`💎 +${gem(gain)} | Saldo: ${gem(winnerUpdated.gemas)}`)
        if (leveledUp) lines.push(`🎉 *${winner.name}* subiu para nível ${newLevel}!`)
        if (awarded.length) lines.push(`🏅 Conquista: *${awarded[0].name}*!`)
      }

      await sock.sendMessage(from, {
        text: lines.join('\n'),
        mentions: [challenger.jid, challenged.jid],
      })
      return
    }

    // /duelo recusar
    if (sub === 'recusar' || sub === 'negar' || sub === 'r') {
      const pending = getActiveGame(from, 'duelo')
      if (!pending || pending.state.challengedJid !== sender) {
        await sock.sendMessage(from, { text: '❕ Não há duelo para recusar.' }, { quoted: msg }); return
      }
      clearTimeout(duelTimers[from])
      deleteActiveGame(from, 'duelo')
      await sock.sendMessage(from, {
        text: `🏳️ *${user.name}* recusou o duelo!`,
        mentions: [pending.player_jid],
      })
      return
    }

    // /duelo @user <bet> — challenge
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    const betArg = args.find(a => !isNaN(a) && Number(a) >= 20)

    if (!mentioned?.length || !betArg) {
      await sock.sendMessage(from, {
        text: [
          `⚔️ *Duelo*`,
          ``,
          `Desafio: */duelo @user <aposta>*`,
          `Aceitar: */duelo aceitar*`,
          `Recusar: */duelo recusar*`,
          ``,
          `Aposta mínima: ${gem(20)}`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    const targetJid = mentioned[0]
    if (targetJid === sender) { await sock.sendMessage(from, { text: '😂 Não podes desafiar-te a ti mesmo.' }, { quoted: msg }); return }

    const bet = parseInt(betArg)
    if (user.gemas < bet) { await sock.sendMessage(from, { text: `❌ Não tens ${gem(bet)} para apostar.` }, { quoted: msg }); return }

    if (getActiveGame(from, 'duelo')) {
      await sock.sendMessage(from, { text: '❕ Já há um duelo pendente no grupo. Aguarda.' }, { quoted: msg }); return
    }

    saveActiveGame(from, 'duelo', sender, { bet, challengedJid: targetJid })

    await sock.sendMessage(from, {
      text: [
        `⚔️ *DESAFIO DE DUELO!*`,
        ``,
        `${mention(sender)} desafiou ${mention(targetJid)}!`,
        `💰 Aposta: ${gem(bet)}`,
        ``,
        `${mention(targetJid)}, tens *60 segundos* para responder!`,
        `➡️ */duelo aceitar* — aceitar o combate`,
        `➡️ */duelo recusar* — recusar`,
      ].join('\n'),
      mentions: [sender, targetJid],
    })

    duelTimers[from] = setTimeout(async () => {
      if (getActiveGame(from, 'duelo')) {
        deleteActiveGame(from, 'duelo')
        await sock.sendMessage(from, {
          text: `⏰ ${mention(targetJid)} não respondeu ao duelo. Desafio cancelado.`,
          mentions: [targetJid],
        })
      }
      delete duelTimers[from]
    }, DUEL_TIMEOUT_MS)
  },
}
