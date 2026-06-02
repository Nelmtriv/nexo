const { getUser, addGemas, removeGemas, addWin, addLoss, addPontos, getActiveGame, saveActiveGame, deleteActiveGame } = require('../../database/users')
const { addXP } = require('../../utils/level')
const { checkAndAward } = require('../../utils/achievements')
const { gem, mention } = require('../../utils/formatter')

const BET = 10
const EMPTY = '⬜'
const velhaTimers = {}
const TIMEOUT_MS = 60_000

function renderBoard(board, p1Mark, p2Mark) {
  const nums = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣']
  return [0, 3, 6].map(r =>
    board.slice(r, r + 3).map((c, i) => c === EMPTY ? nums[r + i] : c).join('')
  ).join('\n')
}

function checkWinner(board, mark) {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
  return wins.some(([a,b,c]) => board[a] === mark && board[b] === mark && board[c] === mark)
}

module.exports = {
  name: ['velha', 'tictactoe', 'ttt', '3x3', 'jogodavelha'],
  description: 'Jogo da Velha contra outro membro! /velha @user <aposta>',
  category: 'Jogos',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const user = getUser(sender, pushName)
    const sub = args[0]?.toLowerCase()
    const existing = getActiveGame(from, 'velha')

    // --- Accept challenge ---
    if (sub === 'aceitar' || sub === 'accept') {
      if (!existing) { await sock.sendMessage(from, { text: `❕ Não há nenhum desafio pendente.` }, { quoted: msg }); return }
      if (existing.state.challengerJid === sender) { await sock.sendMessage(from, { text: `😅 Não podes aceitar o teu próprio desafio.` }, { quoted: msg }); return }
      if (existing.state.challengedJid !== sender) { await sock.sendMessage(from, { text: `❕ Este desafio não é para ti.` }, { quoted: msg }); return }

      const bet = existing.state.bet
      if (user.gemas < bet) { await sock.sendMessage(from, { text: `❌ Não tens ${gem(bet)} para aceitar.` }, { quoted: msg }); return }

      clearTimeout(velhaTimers[from])
      delete velhaTimers[from]

      const challenger = getUser(existing.state.challengerJid)
      saveActiveGame(from, 'velha', existing.player_jid, {
        ...existing.state,
        board: Array(9).fill(EMPTY),
        currentTurn: existing.state.challengerJid,
        status: 'playing',
      })

      await sock.sendMessage(from, {
        text: [
          `🎮 *Jogo da Velha começou!*`,
          ``,
          `${mention(existing.state.challengerJid)} ❌ vs ⭕ ${mention(sender)}`,
          `💰 Aposta: ${gem(bet)}`,
          ``,
          `${renderBoard(Array(9).fill(EMPTY))}`,
          ``,
          `Vez de ${mention(existing.state.challengerJid)}! ➡️ */velha <1-9>*`,
        ].join('\n'),
        mentions: [existing.state.challengerJid, sender],
      })
      return
    }

    // --- Refuse challenge ---
    if (sub === 'recusar') {
      if (!existing || existing.state.challengedJid !== sender) { await sock.sendMessage(from, { text: `❕ Não há desafio para recusar.` }, { quoted: msg }); return }
      clearTimeout(velhaTimers[from])
      deleteActiveGame(from, 'velha')
      await sock.sendMessage(from, {
        text: `🏳️ *${user.name}* recusou o desafio de velha.`,
        mentions: [existing.state.challengerJid],
      })
      return
    }

    // --- Make a move ---
    if (existing?.state?.status === 'playing' && args[0] && !isNaN(args[0])) {
      const state = existing.state
      if (state.currentTurn !== sender) {
        await sock.sendMessage(from, { text: `❕ Não é a tua vez! Aguarda.` }, { quoted: msg }); return
      }

      const pos = parseInt(args[0]) - 1
      if (isNaN(pos) || pos < 0 || pos > 8) { await sock.sendMessage(from, { text: `❕ Posição inválida (1-9).` }, { quoted: msg }); return }
      if (state.board[pos] !== EMPTY) { await sock.sendMessage(from, { text: `❕ Posição ocupada!` }, { quoted: msg }); return }

      const isChallenger = sender === state.challengerJid
      const myMark = isChallenger ? '❌' : '⭕'
      const opponent = isChallenger ? state.challengedJid : state.challengerJid

      state.board[pos] = myMark

      const won = checkWinner(state.board, myMark)
      const draw = !won && !state.board.includes(EMPTY)

      const board = renderBoard(state.board)

      if (won) {
        deleteActiveGame(from, 'velha')
        const winAmount = state.bet * 2
        addGemas(sender, state.bet)
        removeGemas(opponent, state.bet)
        addWin(sender); addLoss(opponent)
        addPontos(sender, 12)
        const { leveledUp, newLevel } = addXP(sender, 18)
        addXP(opponent, 5)
        const awarded = checkAndAward(sender, 'win', null)
        const winnerUpdated = getUser(sender)

        const lines = [
          board,
          ``,
          `🏆 *${user.name}* VENCEU o Jogo da Velha!`,
          `💎 +${gem(state.bet)} | Saldo: ${gem(winnerUpdated.gemas)}`,
          `🏅 +12 pontos`,
        ]
        if (leveledUp) lines.push(`🎉 Nível UP! → ${newLevel}`)
        if (awarded.length) lines.push(`🏅 Conquista: *${awarded[0].name}*!`)

        await sock.sendMessage(from, { text: lines.join('\n'), mentions: [sender, opponent] })
        return
      }

      if (draw) {
        deleteActiveGame(from, 'velha')
        await sock.sendMessage(from, {
          text: `${board}\n\n🤝 *Empate!* As gemas ficam no lugar.`,
          mentions: [sender, opponent],
        })
        return
      }

      state.currentTurn = opponent
      saveActiveGame(from, 'velha', existing.player_jid, state)

      await sock.sendMessage(from, {
        text: [
          board,
          ``,
          `Vez de ${mention(opponent)}! ➡️ */velha <1-9>*`,
        ].join('\n'),
        mentions: [opponent],
      })
      return
    }

    // --- Show current game ---
    if (existing?.state?.status === 'playing') {
      const state = existing.state
      await sock.sendMessage(from, {
        text: `${renderBoard(state.board)}\n\nVez de ${mention(state.currentTurn)}!`,
        mentions: [state.currentTurn],
      }, { quoted: msg }); return
    }

    // --- Start challenge ---
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (!mentioned?.length) {
      await sock.sendMessage(from, {
        text: `❓ Uso: */velha @user <aposta>*\nAposta mínima: ${gem(BET)}`,
      }, { quoted: msg }); return
    }

    const targetJid = mentioned[0]
    if (targetJid === sender) { await sock.sendMessage(from, { text: `😂 Não podes jogar contra ti mesmo.` }, { quoted: msg }); return }

    const betArg = args.find(a => !isNaN(a) && Number(a) >= BET)
    const bet = betArg ? parseInt(betArg) : BET

    if (user.gemas < bet) { await sock.sendMessage(from, { text: `❌ Precisas de ${gem(bet)} para apostar.` }, { quoted: msg }); return }
    if (existing) { await sock.sendMessage(from, { text: `❕ Já há um jogo em curso no grupo.` }, { quoted: msg }); return }

    saveActiveGame(from, 'velha', sender, {
      challengerJid: sender,
      challengedJid: targetJid,
      bet,
      board: Array(9).fill(EMPTY),
      currentTurn: sender,
      status: 'waiting',
    })

    await sock.sendMessage(from, {
      text: [
        `🎮 *Desafio — Jogo da Velha!*`,
        ``,
        `${mention(sender)} desafiou ${mention(targetJid)}!`,
        `💰 Aposta: ${gem(bet)}`,
        ``,
        `${mention(targetJid)}, tens *60s*!`,
        `➡️ */velha aceitar*`,
        `➡️ */velha recusar*`,
      ].join('\n'),
      mentions: [sender, targetJid],
    })

    velhaTimers[from] = setTimeout(async () => {
      if (getActiveGame(from, 'velha')) {
        deleteActiveGame(from, 'velha')
        await sock.sendMessage(from, {
          text: `⏰ ${mention(targetJid)} não respondeu. Desafio cancelado.`,
          mentions: [targetJid],
        })
      }
      delete velhaTimers[from]
    }, TIMEOUT_MS)
  },
}
