const { getUser, addGemas, removeGemas, addWin, addLoss, addPontos, getActiveGame, saveActiveGame, deleteActiveGame } = require('../../database/users')
const { addXP } = require('../../utils/level')
const { gem, mention } = require('../../utils/formatter')
const { games } = require('../../config')

const choices = ['pedra', 'papel', 'tesoura']
const emoji = { pedra: '🪨', papel: '📄', tesoura: '✂️' }
const pptTimers = {}
const TIMEOUT_MS = 60_000

function beats(a, b) {
  return (a === 'pedra' && b === 'tesoura') ||
         (a === 'papel' && b === 'pedra') ||
         (a === 'tesoura' && b === 'papel')
}

module.exports = {
  name: ['ppt', 'rps', 'jokenpo', 'pedrapapeltesoura', 'escolha'],
  description: 'Pedra Papel Tesoura vs outro membro. /ppt @user <pedra|papel|tesoura> <aposta>',
  category: 'Jogos',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const user = getUser(sender, pushName)
    const sub = args[0]?.toLowerCase()
    const existing = getActiveGame(from, 'ppt')

    // --- Respond to challenge ---
    if (existing && choices.includes(sub)) {
      if (existing.state.challengerJid === sender) {
        await sock.sendMessage(from, { text: `😅 Não podes responder ao teu próprio desafio!` }, { quoted: msg }); return
      }
      if (existing.state.challengedJid && existing.state.challengedJid !== sender) {
        await sock.sendMessage(from, { text: `❕ Este desafio não é para ti.` }, { quoted: msg }); return
      }

      clearTimeout(pptTimers[from])
      delete pptTimers[from]
      deleteActiveGame(from, 'ppt')

      const state = existing.state
      const challenger = getUser(state.challengerJid)
      const challenged = getUser(sender, pushName)

      if (challenged.gemas < state.bet) {
        await sock.sendMessage(from, { text: `❌ Não tens ${gem(state.bet)} para aceitar.` }, { quoted: msg }); return
      }

      const cChoice = state.challengerChoice
      const dChoice = sub

      let resultLine, winnerId, loserId
      if (beats(cChoice, dChoice)) {
        winnerId = state.challengerJid; loserId = sender
        resultLine = `🏆 *${challenger.name}* ganhou!`
      } else if (beats(dChoice, cChoice)) {
        winnerId = sender; loserId = state.challengerJid
        resultLine = `🏆 *${challenged.name}* ganhou!`
      } else {
        resultLine = `🤝 *Empate!* As gemas ficam no lugar.`
      }

      if (winnerId) {
        addGemas(winnerId, state.bet)
        removeGemas(loserId, state.bet)
        addWin(winnerId); addLoss(loserId)
        addPontos(winnerId, 5)
        addXP(winnerId, 8); addXP(loserId, 2)
      }

      const winnerUpdated = winnerId ? getUser(winnerId) : null

      await sock.sendMessage(from, {
        text: [
          `🪨📄✂️ *Pedra Papel Tesoura — Resultado!*`,
          ``,
          `${emoji[cChoice]} *${challenger.name}*: ${cChoice}`,
          `${emoji[dChoice]} *${challenged.name}*: ${dChoice}`,
          ``,
          resultLine,
          winnerUpdated ? `💎 +${gem(state.bet)} | Saldo: ${gem(winnerUpdated.gemas)}` : ``,
        ].filter(l => l !== '').join('\n'),
        mentions: [state.challengerJid, sender],
      })
      return
    }

    // --- Challenge someone ---
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    const choiceArg = args.find(a => choices.includes(a?.toLowerCase()))
    const betArg = args.find(a => !isNaN(a) && Number(a) >= games.pptBet)

    if (!mentioned?.length || !choiceArg) {
      await sock.sendMessage(from, {
        text: [
          `🪨📄✂️ *Pedra Papel Tesoura*`,
          ``,
          `Desafio: */ppt @user <pedra|papel|tesoura> <aposta>*`,
          `Aposta mínima: ${gem(games.pptBet)}`,
          ``,
          `A tua escolha fica secreta até o adversário jogar!`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    const targetJid = mentioned[0]
    if (targetJid === sender) { await sock.sendMessage(from, { text: '😂 Não podes jogar contra ti mesmo.' }, { quoted: msg }); return }

    const bet = betArg ? parseInt(betArg) : games.pptBet
    if (user.gemas < bet) { await sock.sendMessage(from, { text: `❌ Precisas de ${gem(bet)} para apostar.` }, { quoted: msg }); return }

    if (existing) { await sock.sendMessage(from, { text: `❕ Já há um PPT em curso no grupo.` }, { quoted: msg }); return }

    const choice = choiceArg.toLowerCase()
    saveActiveGame(from, 'ppt', sender, { challengerJid: sender, challengerChoice: choice, challengedJid: targetJid, bet })

    await sock.sendMessage(from, {
      text: [
        `⚔️ *Desafio PPT!*`,
        ``,
        `${mention(sender)} desafiou ${mention(targetJid)}!`,
        `💰 Aposta: ${gem(bet)}`,
        `🤫 Escolha do desafiante: *secreta*`,
        ``,
        `${mention(targetJid)}, tens *60s* para responder!`,
        `➡️ */ppt pedra* | */ppt papel* | */ppt tesoura*`,
      ].join('\n'),
      mentions: [sender, targetJid],
    })

    pptTimers[from] = setTimeout(async () => {
      if (getActiveGame(from, 'ppt')) {
        deleteActiveGame(from, 'ppt')
        await sock.sendMessage(from, {
          text: `⏰ ${mention(targetJid)} não respondeu. Desafio cancelado.`,
          mentions: [targetJid],
        })
      }
      delete pptTimers[from]
    }, TIMEOUT_MS)
  },
}
