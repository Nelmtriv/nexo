const { getUser, addGemas, updateUser, hasItem, useItem, addPontos } = require('../../database/users')
const { gem } = require('../../utils/formatter')
const { checkCooldown, formatRemaining } = require('../../utils/cooldown')
const { addXP } = require('../../utils/level')
const { checkAndAward } = require('../../utils/achievements')
const { economy } = require('../../config')

const finds = [
  '🪨 Granito comum', '💎 Fragmento de diamante', '🔮 Cristal bruto',
  '🪙 Pepita de ouro', '🌟 Mineral raro', '🦴 Fóssil preservado',
  '🟣 Ametista', '🔵 Safira bruta', '🟢 Esmeralda lascada',
]

module.exports = {
  name: ['minerar', 'mine', 'mina', 'escavar', 'picar', 'mn'],
  description: 'Minera gemas (requer 🪓 Picareta da loja, cooldown 1h)',
  category: 'Jogos',
  async execute({ sock, from, msg, sender, pushName }) {
    const user = getUser(sender, pushName)

    // require pickaxe
    if (!hasItem(sender, 'picareta')) {
      await sock.sendMessage(from, {
        text: [
          `🪓 Precisas de uma *Picareta* para minerar!`,
          ``,
          `Compra na loja: */loja comprar picareta*`,
          `Preço: ${gem(require('../../config').shop.picareta.price)}`,
        ].join('\n'),
      }, { quoted: msg })
      return
    }

    // daily limit: 3 mines per day
    const MAX_DAILY = 3
    const today = new Date().toDateString()
    const isNewDay = user.mine_today_date !== today
    const mineCount = isNewDay ? 0 : (user.mine_today_count || 0)

    if (mineCount >= MAX_DAILY) {
      const tomorrow = new Date()
      tomorrow.setHours(24, 0, 0, 0)
      const msUntilTomorrow = tomorrow.getTime() - Date.now()
      await sock.sendMessage(from, {
        text: `⛏️ *${user.name}*, já mineraste *3 vezes hoje*! Limite diário atingido.\n⏳ Volta em *${formatRemaining(msUntilTomorrow)}* (meia-noite).`,
      }, { quoted: msg })
      return
    }

    // consume 1 durability
    useItem(sender, 'picareta')
    const updatedUser = getUser(sender)
    const durabilityLeft = updatedUser.inventory?.picareta || 0

    const amount = Math.floor(Math.random() * (economy.mineMax - economy.mineMin + 1)) + economy.mineMin
    addGemas(sender, amount)
    updateUser(sender, {
      mine_today_count: mineCount + 1,
      mine_today_date: today,
    })

    addPontos(sender, 3)
    const { leveledUp, newLevel } = addXP(sender, 5)
    const awarded = checkAndAward(sender, 'mine', null)
    checkAndAward(sender, 'gemas', null)

    const find = finds[Math.floor(Math.random() * finds.length)]
    const final = getUser(sender)

    const minesToday = mineCount + 1
    const lines = [
      `⛏️ *${user.name}* foi minerar... (${minesToday}/${MAX_DAILY} hoje)`,
      ``,
      `Encontrou: *${find}*`,
      `💎 +${gem(amount)}`,
      `💳 Saldo: ${gem(final.gemas)}`,
      ``,
      durabilityLeft > 0
        ? `🪓 Picareta: *${durabilityLeft} uso(s)* restantes`
        : `💔 A tua picareta *partiu*! Compra uma nova na */loja*`,
      minesToday >= MAX_DAILY ? `⚠️ Atingiste o limite diário! Volta amanhã.` : ``,
    ].filter(l => l !== '')
    if (leveledUp) lines.push(``, `🎉 NÍVEL UP! → ${newLevel}`)
    if (awarded.length) lines.push(``, `🏅 Conquista: *${awarded[0].name}*!`)

    await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg })
  },
}
