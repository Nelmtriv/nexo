const { getUser, addGemas, updateUser } = require('../../database/users')
const { gem } = require('../../utils/formatter')
const { checkCooldown, formatRemaining } = require('../../utils/cooldown')
const { addXP, getLevelTitle } = require('../../utils/level')
const { checkAndAward } = require('../../utils/achievements')
const { economy } = require('../../config')

module.exports = {
  name: ['diario', 'daily', 'bonus', 'recompensa', 'dia'],
  description: 'Recebe o teu bónus diário de gemas',
  category: 'Economia',
  async execute({ sock, from, msg, sender, pushName }) {
    const user = getUser(sender, pushName)
    const { ready, remaining } = checkCooldown(user.last_daily, economy.dailyCooldownMs)

    if (!ready) {
      await sock.sendMessage(from, {
        text: `⏳ Já recolheste o teu bónus hoje!\nVolta em *${formatRemaining(remaining)}*.\n🔥 Streak actual: *${user.streak || 0} dia(s)*`,
      }, { quoted: msg })
      return
    }

    // streak logic
    const lastDaily = user.last_daily ? new Date(user.last_daily) : null
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
    let newStreak = 1
    if (lastDaily && lastDaily >= twoDaysAgo) {
      newStreak = (user.streak || 0) + 1
    }

    // base + streak bonus (max +200% at 30 days)
    const streakMultiplier = Math.min(3.0, 1 + newStreak * 0.07)
    const total = Math.floor(economy.dailyAmount * streakMultiplier)
    const bonus = total - economy.dailyAmount

    addGemas(sender, total, `🎁 /diario (streak ${newStreak})`)
    updateUser(sender, {
      last_daily: new Date().toISOString(),
      streak: newStreak,
    })

    const { leveledUp, newLevel } = addXP(sender, 10 + Math.floor(newStreak / 5) * 5)
    const awarded = checkAndAward(sender, 'streak', newStreak)
    checkAndAward(sender, 'gemas', null)
    const updated = getUser(sender)

    const lines = [
      `🎁 *Bónus Diário!*`,
      ``,
      `💎 Base: ${gem(economy.dailyAmount)}`,
      bonus > 0 ? `🔥 Streak ×${streakMultiplier.toFixed(1)}: *+${gem(bonus)}*` : '',
      ``,
      `*Total recebido: +${gem(total)}*`,
      `💳 Saldo: ${gem(updated.gemas)}`,
      ``,
      `🔥 Streak: *${newStreak} dia(s)* ${newStreak >= 7 ? '🏆' : ''}`,
    ].filter(l => l !== '')

    if (leveledUp) lines.push(``, `🎉 *NÍVEL UP!* Agora és nível ${newLevel} — ${getLevelTitle(newLevel)}!`)
    if (awarded.length) lines.push(``, `🏅 Conquista: *${awarded[0].name}*! +${gem(awarded[0].reward)}`)

    await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg })
  },
}
