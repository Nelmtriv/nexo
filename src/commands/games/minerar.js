const { getUser, addGemas, updateUser, hasItem, useItem, addPontos } = require('../../database/users')
const { gem } = require('../../utils/formatter')
const { checkDailyLimit, handleLimitExceeded, usageFooter } = require('../../utils/dailyLimit')
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

    const limitResult = checkDailyLimit(sender, 'minerar')
    if (!limitResult.allowed) {
      await handleLimitExceeded(sock, from, msg, sender, user.name, limitResult)
      return
    }

    // consume 1 durability
    useItem(sender, 'picareta')
    const updatedUser = getUser(sender)
    const durabilityLeft = updatedUser.inventory?.picareta || 0

    const amount = Math.floor(Math.random() * (economy.mineMax - economy.mineMin + 1)) + economy.mineMin
    addGemas(sender, amount)

    addPontos(sender, 3)
    const { leveledUp, newLevel } = addXP(sender, 5)
    const awarded = checkAndAward(sender, 'mine', null)
    checkAndAward(sender, 'gemas', null)

    const find = finds[Math.floor(Math.random() * finds.length)]
    const final = getUser(sender)

    const lines = [
      `⛏️ *${user.name}* foi minerar...`,
      ``,
      `Encontrou: *${find}*`,
      `💎 +${gem(amount)}`,
      `💳 Saldo: ${gem(final.gemas)}`,
      ``,
      durabilityLeft > 0
        ? `🪓 Picareta: *${durabilityLeft} uso(s)* restantes`
        : `💔 A tua picareta *partiu*! Compra uma nova na */loja*`,
      usageFooter(limitResult),
    ].filter(l => l !== '')
    if (leveledUp) lines.push(``, `🎉 NÍVEL UP! → ${newLevel}`)
    if (awarded.length) lines.push(``, `🏅 Conquista: *${awarded[0].name}*!`)

    await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg })
  },
}
