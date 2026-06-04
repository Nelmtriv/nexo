const { getUser, updateUser } = require('../../database/users')
const { gem } = require('../../utils/formatter')

const GEMAS_REQUIRED = 5000
const PONTOS_REQUIRED = 1500

module.exports = {
  name: ['checkpromocao', 'verificarpromocao', 'meurank'],
  description: 'Verificar se atingiu requisitos para ser admin (5000 gemas + 1500 pontos)',
  category: 'Utilidade',
  async execute({ sock, from, msg, sender, pushName }) {
    const user = getUser(sender, pushName)
    const gemas = user.gemas || 0
    const pontos = user.pontos || 0
    
    const hasGemas = gemas >= GEMAS_REQUIRED
    const hasPontos = pontos >= PONTOS_REQUIRED
    const isAdmin = user.is_admin || false
    
    // Se já é admin, não precisa verificar
    if (isAdmin) {
      await sock.sendMessage(from, {
        text: `👑 Já és admin! Parabéns!`,
      }, { quoted: msg }); return
    }
    
    // Se atingiu os requisitos, promove automaticamente
    if (hasGemas && hasPontos) {
      updateUser(sender, { is_admin: true })
      const updated = getUser(sender)
      await sock.sendMessage(from, {
        text: [
          `🎉 *PARABÉNS!*`,
          ``,
          `*${user.name}* atingiu os requisitos e virou *ADMIN*! 👑`,
          ``,
          `✅ ${gem(GEMAS_REQUIRED)} de gemas`,
          `✅ ${PONTOS_REQUIRED} pontos`,
          ``,
          `Agora podes usar comandos de admin!`,
        ].join('\n'),
      }, { quoted: msg }); return
    }
    
    // Se não atingiu, mostra progresso
    const gemesLeft = Math.max(0, GEMAS_REQUIRED - gemas)
    const pontosLeft = Math.max(0, PONTOS_REQUIRED - pontos)
    
    await sock.sendMessage(from, {
      text: [
        `📊 *Progresso para Admin:*`,
        ``,
        `💎 Gemas: ${gem(gemas)} / ${gem(GEMAS_REQUIRED)}`,
        gemesLeft > 0 ? `   └ Faltam: ${gem(gemesLeft)}` : `   ✅ Completo!`,
        ``,
        `⭐ Pontos: ${pontos} / ${PONTOS_REQUIRED}`,
        pontosLeft > 0 ? `   └ Faltam: ${pontosLeft}` : `   ✅ Completo!`,
      ].join('\n'),
    }, { quoted: msg })
  },
}
