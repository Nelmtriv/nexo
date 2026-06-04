const { getUser, addGemas, addWin, addPontos } = require('../../database/users')
const { getActiveGame, saveActiveGame, deleteActiveGame } = require('../../database/users')
const { addXP } = require('../../utils/level')
const { gem } = require('../../utils/formatter')
const { games } = require('../../config')
const { checkDailyLimit, handleLimitExceeded } = require('../../utils/dailyLimit')

let questions
try { questions = require('../../../data/quiz.json') } catch { questions = [] }

const timers = {}

module.exports = {
  name: ['quiz', 'trivia', 'pergunta', 'q'],
  description: 'Inicia uma pergunta de trivia no grupo',
  category: 'Jogos',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const existing = getActiveGame(from, 'quiz')

    if (existing && args.length > 0) {
      const answer = args.join(' ').trim().toLowerCase()
      if (answer === existing.state.answer.toLowerCase()) {
        clearTimeout(timers[from])
        delete timers[from]
        deleteActiveGame(from, 'quiz')
        addGemas(sender, games.quizReward)
        addWin(sender)
        addPontos(sender, 15)
        addXP(sender, 20)
        const user = getUser(sender, pushName)
        await sock.sendMessage(from, {
          text: `✅ *${user.name}* acertou! A resposta era: *${existing.state.answer}*\n🎁 +${gem(games.quizReward)} | 🏅 +15 pts`,
        }, { quoted: msg })
      } else {
        const user = getUser(sender, pushName)
        await sock.sendMessage(from, {
          text: `❌ *${user.name}*, essa não é a resposta correcta! Tenta outra vez.`,
        }, { quoted: msg })
      }
      return
    }

    if (existing) {
      await sock.sendMessage(from, {
        text: `❓ Já há um quiz activo!\n\n*${existing.state.question}*\n\nResponde com */quiz <resposta>*`,
      }, { quoted: msg })
      return
    }

    if (!questions.length) {
      await sock.sendMessage(from, { text: '❌ Banco de perguntas vazio.' }, { quoted: msg })
      return
    }

    const limitResult = checkDailyLimit(sender, 'quiz')
    if (!limitResult.allowed) {
      await handleLimitExceeded(sock, from, msg, sender, getUser(sender).name, limitResult)
      return
    }

    const q = questions[Math.floor(Math.random() * questions.length)]
    saveActiveGame(from, 'quiz', sender, { question: q.question, answer: q.answer })

    await sock.sendMessage(from, {
      text: [
        `🧠 *Quiz!*`,
        ``,
        `❓ ${q.question}`,
        ``,
        `🏆 Recompensa: ${gem(games.quizReward)}`,
        `⏳ Tens *30 segundos*!`,
        ``,
        `Responde com: */quiz <resposta>*`,
      ].join('\n'),
    })

    timers[from] = setTimeout(async () => {
      const still = getActiveGame(from, 'quiz')
      if (still) {
        deleteActiveGame(from, 'quiz')
        await sock.sendMessage(from, {
          text: `⏰ Tempo esgotado! A resposta era: *${still.state.answer}*`,
        })
      }
      delete timers[from]
    }, games.quizTimeoutMs)
  },
}
