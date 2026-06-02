const { getData, save } = require('../database/db')

const XP_PER_LEVEL = 150  // multiplied by current level

function xpNeeded(level) {
  return level * XP_PER_LEVEL
}

function addXP(jid, amount) {
  const db = getData()
  const user = db.users[jid]
  if (!user) return { leveledUp: false }

  user.xp = (user.xp || 0) + amount
  let leveledUp = false
  let newLevel = user.level || 1

  while (user.xp >= xpNeeded(newLevel)) {
    user.xp -= xpNeeded(newLevel)
    newLevel++
    leveledUp = true
  }

  user.level = newLevel
  save()
  return { leveledUp, newLevel }
}

function getLevelTitle(level) {
  if (level >= 50) return '👑 Lendário'
  if (level >= 30) return '💎 Mestre'
  if (level >= 20) return '🔥 Elite'
  if (level >= 15) return '⚡ Experiente'
  if (level >= 10) return '🏅 Veterano'
  if (level >= 5)  return '⚔️ Guerreiro'
  if (level >= 3)  return '🌱 Aprendiz'
  return '🐣 Novato'
}

function xpBar(xp, level) {
  const needed = xpNeeded(level)
  const filled = Math.min(10, Math.round((xp / needed) * 10))
  const empty = 10 - filled
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${xp}/${needed} XP`
}

module.exports = { addXP, xpNeeded, getLevelTitle, xpBar }
