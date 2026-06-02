const { getUser, addGemas } = require('../../database/users')
const { gem } = require('../../utils/formatter')

module.exports = {
  name: ['darall', 'darATodos', 'distribuir'],
  description: 'Admin: dar gemas a todos os membros do grupo',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg, args }) {
    const amountArg = args.find(a => !isNaN(a) && Number(a) > 0)
    if (!amountArg) {
      await sock.sendMessage(from, { text: '❓ Uso: */darall <valor>*\nExemplo: /darall 50' }, { quoted: msg }); return
    }

    const amount = parseInt(amountArg)
    const meta = await sock.groupMetadata(from)
    const members = meta.participants.map(p => p.id)

    for (const jid of members) {
      getUser(jid)
      addGemas(jid, amount)
    }

    await sock.sendMessage(from, {
      text: `🎁 *${gem(amount)}* distribuídas a todos os *${members.length} membros* do grupo!`,
    })
  },
}
