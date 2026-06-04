const { getUser, addGemas, removeGemas, getRevenge, clearRevenge, setLastRob, hasItem, useItem, addPontos } = require('../../database/users')
const { addXP } = require('../../utils/level')
const { checkAndAward } = require('../../utils/achievements')
const { gem, mention } = require('../../utils/formatter')
const { shop } = require('../../config')

const REVENGE_SUCCESS_RATE = 0.65

module.exports = {
  name: ['vingar', 'vinganca', 'revenge', 'retaliar', 'contra', 'represalia'],
  description: 'Vinga-te de quem te roubou. Requer 💠 VingançaGema + ter sido roubado (2h).',
  category: 'Jogos',
  async execute({ sock, from, msg, sender, pushName }) {
    const user = getUser(sender, pushName)

    // check if there's a revenge target
    const revenge = getRevenge(sender)
    if (!revenge) {
      await sock.sendMessage(from, {
        text: [
          `😌 Não tens nenhuma vingança pendente.`,
          ``,
          `Só podes vingar-te de alguém que te roubou!`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    // require VingançaGema
    if (!hasItem(sender, 'vingancagema')) {
      await sock.sendMessage(from, {
        text: [
          `💠 Precisas de uma *VingançaGema* para te vingares!`,
          ``,
          `Compra na loja: */loja comprar vingancagema*`,
          `Preço: ${gem(shop.vingancagema.price)}`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    // consume item and clear revenge
    useItem(sender, 'vingancagema')
    clearRevenge(sender)
    setLastRob(sender)

    const target = getUser(revenge.robberJid)
    const success = Math.random() < REVENGE_SUCCESS_RATE

    if (success) {
      const pct = 0.15 + Math.random() * 0.20
      const stolen = Math.max(5, Math.floor(target.gemas * pct))
      removeGemas(revenge.robberJid, stolen)
      addGemas(sender, stolen)
      addXP(sender, 15)
      addPontos(sender, 8)
      const awarded = checkAndAward(sender, 'revenge', null)
      const updated = getUser(sender)

      const lines = [
        `⚔️ *Vingança executada!*`,
        `💠 A VingançaGema brilhou e guiou-te...`,
        ``,
        `*${user.name}* vingou-se de ${mention(revenge.robberJid)} e recuperou *${gem(stolen)}*! 🎯`,
        `💳 Saldo: ${gem(updated.gemas)}`,
      ]
      if (awarded.length) lines.push(``, `🏅 Conquista: *${awarded[0].name}*!`)

      await sock.sendMessage(from, {
        text: lines.join('\n'),
        mentions: [revenge.robberJid],
      })
    } else {
      const fine = Math.max(5, Math.floor(user.gemas * 0.10))
      removeGemas(sender, fine)
      addGemas(revenge.robberJid, fine)
      addXP(sender, 3)
      const updated = getUser(sender)

      await sock.sendMessage(from, {
        text: [
          `😬 *Vingança falhada!* (E a VingançaGema foi consumida...)`,
          ``,
          `*${user.name}* tentou vingar-se de ${mention(revenge.robberJid)} mas correu mal...`,
          `💸 Perdeu *${gem(fine)}* na tentativa.`,
          `💳 Saldo: ${gem(updated.gemas)}`,
        ].join('\n'),
        mentions: [revenge.robberJid],
      })
    }
  },
}
