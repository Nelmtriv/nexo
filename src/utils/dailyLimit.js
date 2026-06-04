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

// These games block silently — no count shown, no message when limit is hit
const SILENT_GAMES = new Set(['quiz', 'forca', 'blackjack', 'ppt'])

function checkDailyLimit(sender, game) {
  const limit = LIMITS[game]
  const user = getUser(sender)
  const today = new Date().toDateString()

  const dailyGames = user.daily_games || {}
  const gameData = dailyGames[game] || { count: 0, date: '' }
  const isNewDay = gameData.date !== today
  const count = isNewDay ? 0 : gameData.count

  if (count < limit) {
    updateUser(sender, {
      daily_games: { ...dailyGames, [game]: { count: count + 1, date: today } },
    })
    return {
      allowed:   true,
      used:      count + 1,
      remaining: limit - count - 1,
      limit,
      silent:    SILENT_GAMES.has(game),
    }
  }

  return {
    allowed:   false,
    used:      count,
    remaining: 0,
    limit,
    silent:    SILENT_GAMES.has(game),
  }
}

async function handleLimitExceeded(sock, from, msg, sender, userName, result) {
  if (result.silent) return  // quiz/forca/bj/ppt — block silently

  const tomorrow = new Date()
  tomorrow.setHours(24, 0, 0, 0)
  const ms = tomorrow.getTime() - Date.now()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)

  await sock.sendMessage(from, {
    text: `⛔ *${userName}*, já usaste os *${result.limit}* usos diários para este jogo.\n⏳ Volta em *${h}h ${m}m* (meia-noite).`,
  }, { quoted: msg })
}

// Helper: returns a short "(X/Y hoje)" line for non-silent games
function usageFooter(result) {
  if (result.silent) return ''
  if (result.remaining === 0) return `⚠️ Último uso de hoje! (${result.used}/${result.limit})`
  return `📊 Usos hoje: ${result.used}/${result.limit} — restam *${result.remaining}*`
}

module.exports = { checkDailyLimit, handleLimitExceeded, usageFooter, LIMITS }
