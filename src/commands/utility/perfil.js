const { getUser } = require('../../database/users')
const { gem, header, durabilityBar } = require('../../utils/formatter')
const { shop, titles } = require('../../config')
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
    const invLines = []
    
    // Mostrar todos os itens de forma organizada
    const itemConfigs = {
      picareta:        { emoji: '🪓', label: 'Picareta',        showBar: true },
      escudo:          { emoji: '🛡️', label: 'Escudo',          showBar: true },
      bond7:           { emoji: '🍶', label: 'Bond7',           showBar: false },
      vingancagema:    { emoji: '💠', label: 'VingançaGema',    showBar: false },
      seguro:          { emoji: '🔐', label: 'Seguro de Roubo', showBar: false },
      streeton:        { emoji: '🥃', label: 'Streeton',        showBar: false },
      vingancapremium: { emoji: '💜', label: 'VingançaPremium', showBar: false },
    }
    
    Object.entries(itemConfigs).forEach(([key, config]) => {
      const qty = inv[key] || 0
      if (config.showBar && shop[key].durability) {
        const bar = durabilityBar(qty, shop[key].durability)
        invLines.push(`  ${config.emoji} *${config.label}:* ${bar}`)
      } else {
        invLines.push(`  ${config.emoji} *${config.label}:* ${qty} unidade(s)`)
      }
    })

    const relStatus = user.relationship_status || 'solteiro'
    const relEmoji = { solteiro: '💔', namorando: '💑', casado: '💍' }
    const relLabel = { solteiro: 'Solteiro(a)', namorando: 'Namorando', casado: 'Casado(a)' }
    let relLine = `${relEmoji[relStatus]} *${relLabel[relStatus]}*`
    if (user.partner) {
      const partner = getUser(user.partner)
      relLine += `  com *${partner.name}*`
    }

    const tituloData = user.titulo ? titles[user.titulo] : null
    const tituloLine = tituloData ? `${tituloData.emoji} *${tituloData.label}*  •  ` : ''

    const text = [
      header(`👤 ${user.name}`),
      ``,
      `${tituloLine}${title}  •  Nível ${level}`,
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
      invLines.join('\n'),
      ``,
      `🏅 *Conquistas (${achs.length}):*`,
      achLines,
    ].join('\n')

    await sock.sendMessage(from, { text }, { quoted: msg })
  },
}
