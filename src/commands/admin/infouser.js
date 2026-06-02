const { getUser } = require('../../database/users')
const { gem, header, durabilityBar } = require('../../utils/formatter')
const { getLevelTitle, xpBar } = require('../../utils/level')
const { formatRemaining } = require('../../utils/cooldown')
const { shop } = require('../../config')

module.exports = {
  name: ['infouser', 'veruser', 'playerinfo', 'ui'],
  description: 'Admin: ver informação completa de um utilizador',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (!mentioned?.length) {
      await sock.sendMessage(from, { text: '❓ Uso: */infouser @user*' }, { quoted: msg }); return
    }

    const jid = mentioned[0]
    const user = getUser(jid)
    const level = user.level || 1
    const inv = user.inventory || {}

    const prisonText = user.prison_until && new Date(user.prison_until) > new Date()
      ? `🔒 Preso: ${formatRemaining(new Date(user.prison_until) - Date.now())}`
      : `✅ Livre`

    const text = [
      header(`🔍 Info Admin — ${user.name}`),
      ``,
      `📱 JID: ${jid}`,
      `⚡ Nível ${level} — ${getLevelTitle(level)}`,
      `${xpBar(user.xp || 0, level)}`,
      ``,
      `💰 *Economia*`,
      `  💎 Carteira: ${gem(user.gemas || 0)}`,
      `  🏦 Banco:    ${gem(user.bank || 0)}`,
      `  💰 Total:    ${gem((user.gemas || 0) + (user.bank || 0))}`,
      ``,
      `🎮 *Jogos*`,
      `  🏆 Vitórias: ${user.wins || 0}  💀 Derrotas: ${user.losses || 0}`,
      `  🎯 Pontos:   ${user.pontos || 0}`,
      `  🔥 Streak:   ${user.streak || 0} dia(s)`,
      ``,
      `⚠️ *Avisos:* ${user.warnings || 0}/3`,
      `🏛️ *Prisão:* ${prisonText}`,
      `💼 *Emprego:* ${user.job || 'desempregado'}`,
      ``,
      `🎒 *Inventário*`,
      `  🪓 Picareta: ${durabilityBar(inv.picareta || 0, shop.picareta.durability)}`,
      `  🛡️ Escudo:   ${durabilityBar(inv.escudo || 0, shop.escudo.durability)}`,
      `  🍶 Bond7:    ${inv.bond7 || 0}`,
      `  💠 VingGema: ${inv.vingancagema || 0}`,
      ``,
      `🏅 *Conquistas:* ${Object.keys(user.achievements || {}).length}`,
    ].join('\n')

    await sock.sendMessage(from, { text }, { quoted: msg })
  },
}
