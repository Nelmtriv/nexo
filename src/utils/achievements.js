const { getData, save } = require('../database/db')

const ACHIEVEMENTS = {
  primeiraVitoria:  { name: '🏆 Primeira Vitória',    desc: 'Ganhar o primeiro jogo',         reward: 50  },
  apostador:        { name: '🎰 Apostador',            desc: 'Jogar 50 jogos',                 reward: 100 },
  rico:             { name: '💰 Rico',                 desc: 'Ter 500 gemas ao mesmo tempo',   reward: 150 },
  milionario:       { name: '💎 Milionário',           desc: 'Ter 1000 gemas ao mesmo tempo',  reward: 300 },
  minerador:        { name: '⛏️ Minerador',            desc: 'Minerar 20 vezes',               reward: 80  },
  criminoso:        { name: '🦹 Criminoso',            desc: 'Completar 10 crimes com sucesso',reward: 100 },
  vingador:         { name: '⚔️ Vingador',             desc: 'Vingar-se com sucesso',          reward: 75  },
  banqueiro:        { name: '🏦 Banqueiro',            desc: 'Depositar 500💎 no banco',        reward: 100 },
  level10:          { name: '⭐ Nível 10',             desc: 'Atingir o nível 10',             reward: 200 },
  level25:          { name: '🌟 Nível 25',             desc: 'Atingir o nível 25',             reward: 500 },
  ladraoMestre:     { name: '🎭 Ladrão Mestre',        desc: 'Roubar 5 vezes com sucesso',     reward: 120 },
  duelista:         { name: '🗡️ Duelista',             desc: 'Vencer 10 duelos',               reward: 150 },
  streakSemanal:    { name: '🔥 Sequência Semanal',    desc: 'Daily 7 dias seguidos',          reward: 200 },
  empregado:        { name: '💼 Trabalhador',          desc: 'Trabalhar 10 vezes',             reward: 80  },
}

function checkAndAward(jid, trigger, value) {
  const db = getData()
  const user = db.users[jid]
  if (!user) return []

  if (!user.achievements) user.achievements = {}
  if (!user.stats) user.stats = {}

  const awarded = []

  function award(id) {
    if (user.achievements[id]) return
    const ach = ACHIEVEMENTS[id]
    user.achievements[id] = new Date().toISOString()
    user.gemas = (user.gemas || 0) + ach.reward
    awarded.push(ach)
  }

  switch (trigger) {
    case 'win':
      user.stats.wins = (user.stats.wins || 0) + 1
      if (user.stats.wins >= 1)  award('primeiraVitoria')
      if (user.stats.wins >= 50) award('apostador')
      break
    case 'game':
      user.stats.games = (user.stats.games || 0) + 1
      if (user.stats.games >= 50) award('apostador')
      break
    case 'gemas':
      if (user.gemas >= 500)  award('rico')
      if (user.gemas >= 1000) award('milionario')
      break
    case 'mine':
      user.stats.mines = (user.stats.mines || 0) + 1
      if (user.stats.mines >= 20) award('minerador')
      break
    case 'crime':
      user.stats.crimes = (user.stats.crimes || 0) + 1
      if (user.stats.crimes >= 10) award('criminoso')
      break
    case 'revenge':
      award('vingador')
      break
    case 'bank':
      user.stats.bankDeposited = (user.stats.bankDeposited || 0) + value
      if (user.stats.bankDeposited >= 500) award('banqueiro')
      break
    case 'level':
      if (value >= 10) award('level10')
      if (value >= 25) award('level25')
      break
    case 'rob':
      user.stats.robs = (user.stats.robs || 0) + 1
      if (user.stats.robs >= 5) award('ladraoMestre')
      break
    case 'duel':
      user.stats.duels = (user.stats.duels || 0) + 1
      if (user.stats.duels >= 10) award('duelista')
      break
    case 'work':
      user.stats.works = (user.stats.works || 0) + 1
      if (user.stats.works >= 10) award('empregado')
      break
    case 'streak':
      if (value >= 7) award('streakSemanal')
      break
  }

  if (awarded.length) save()
  return awarded
}

function getAchievementList(user) {
  if (!user.achievements) return []
  return Object.keys(user.achievements).map(id => ACHIEVEMENTS[id]).filter(Boolean)
}

module.exports = { checkAndAward, getAchievementList, ACHIEVEMENTS }
