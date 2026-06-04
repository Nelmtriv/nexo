const { getUser, updateUser } = require('../database/users')

const LIMITS = {
  quiz:       30,
  forca:      30,
  ppt:        30,
  velha:      30,
  blackjack:  30,
  duelo:      30,
  cassino:     3,
  minerar:     3,
  trabalhar:   5,
  roubar:     15,
  embebedar:  10,
  crime:       8,
  raspadinha:  5,
  roleta:     10,
}

function checkDailyLimit(sender, game) {
  const limit = LIMITS[game]
  const user = getUser(sender)
  const today = new Date().toDateString()

  const dailyGames = user.daily_games || {}
  const gameData = dailyGames[game] || { count: 0, date: '', warned: false }
  const isNewDay = gameData.date !== today
  const count = isNewDay ? 0 : gameData.count
  const warned = isNewDay ? false : (gameData.warned || false)

  if (count < limit) {
    updateUser(sender, {
      daily_games: { ...dailyGames, [game]: { count: count + 1, date: today, warned } },
    })
    return { allowed: true }
  }

  if (!warned) {
    const newWarnings = (user.warnings || 0) + 1
    updateUser(sender, {
      warnings: newWarnings,
      daily_games: { ...dailyGames, [game]: { count, date: today, warned: true } },
    })
    return { allowed: false, newWarning: true, warnings: newWarnings }
  }

  return { allowed: false, newWarning: false, warnings: user.warnings || 0 }
}

async function handleLimitExceeded(sock, from, msg, sender, userName, result) {
  if (!result.newWarning) return

  if (result.warnings >= 3) {
    await sock.sendMessage(from, {
      text: `🚫 *${userName}* acumulou *3 advertências* por excesso de jogo e foi expulso do grupo!`,
    }, { quoted: msg })
    await sock.groupParticipantsUpdate(from, [sender], 'remove').catch(() => {})
  } else {
    await sock.sendMessage(from, {
      text: `⚠️ *Advertência ${result.warnings}/3* — *${userName}*, atingiste o limite diário para este jogo.`,
    }, { quoted: msg })
  }
}

module.exports = { checkDailyLimit, handleLimitExceeded, LIMITS }
