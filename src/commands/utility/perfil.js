const { getUser } = require('../../database/users')
const { gem, header, durabilityBar } = require('../../utils/formatter')
const { shop } = require('../../config')
const { getLevelTitle, xpBar } = require('../../utils/level')
const { getAchievementList } = require('../../utils/achievements')

module.exports = {
  name: ['perfil', 'profile', 'p', 'eu', 'info', 'conquistas', 'nivel'],
  description: 'Ver perfil e conquistas',
  category: 'Utilidade',
  async execute({ sock, from, msg, sender, pushName }) {
    let targetJid = sender
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (mentioned?.length) targetJid = mentioned[0]

    const user = getUser(targetJid, targetJid === sender ? pushName : null)
    const level = user.level || 1
    const title = getLevelTitle(level)
    const winRate = (user.games || 0) > 0 ? (((user.wins || 0) / user.games) * 100).toFixed(1) : '0.0'
    const total = (user.gemas || 0) + (user.bank || 0)
    const achs = getAchievementList(user)

    const achLines = achs.length
      ? achs.map(a => `  ${a.name}`).join('\n')
      : '  Sem conquistas ainda'

    const inv = user.inventory || {}
    const picareta = inv.picareta || 0
    const escudo   = inv.escudo   || 0
    const invLines = [
      `  🪓 *Picareta*`,
      picareta > 0
        ? `  ${durabilityBar(picareta, shop.picareta.durability)} usos`
        : `  ❌ Sem stock — */loja comprar picareta*`,
      ``,
      `  🛡️ *Escudo*`,
      escudo > 0
        ? `  ${durabilityBar(escudo, shop.escudo.durability)} bloqueios`
        : `  ❌ Sem stock — */loja comprar escudo*`,
      ``,
      `  🍶 *Bond7:*         ${inv.bond7 || 0} unidade(s)`,
      `  💠 *VingançaGema:*  ${inv.vingancagema || 0} unidade(s)`,
    ].join('\n')

    const relStatus = user.relationship_status || 'solteiro'
    const relEmoji = { solteiro: '💔', namorando: '💑', casado: '💍' }
    const relLabel = { solteiro: 'Solteiro(a)', namorando: 'Namorando', casado: 'Casado(a)' }
    let relLine = `${relEmoji[relStatus]} *${relLabel[relStatus]}*`
    if (user.partner) {
      const partner = getUser(user.partner)
      relLine += `  com *${partner.name}*`
    }

    const text = [
      header(`👤 ${user.name}`),
      ``,
      `${title}  •  Nível ${level}`,
      `${xpBar(user.xp || 0, level)}`,
      ``,
      relLine,
      ``,
      `💎 *Riqueza total:* ${gem(total)}`,
      `   ┣ Carteira: ${gem(user.gemas || 0)}`,
      `   ┗ Banco: ${gem(user.bank || 0)}`,
      ``,
      `🎮 *Jogos:* ${user.games || 0}  |  🏆 ${user.wins || 0}V  💀 ${user.losses || 0}D  |  ${winRate}%`,
      `🔥 *Streak diário:* ${user.streak || 0} dia(s)`,
      ``,
      `🎒 *Inventário:*`,
      invLines,
      ``,
      `🏅 *Conquistas (${achs.length}):*`,
      achLines,
    ].join('\n')

    await sock.sendMessage(from, { text }, { quoted: msg })
  },
}
