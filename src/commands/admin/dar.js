const { getUser, addGemas } = require('../../database/users')
const { gem, mention } = require('../../utils/formatter')

module.exports = {
  name: ['dar'],
  description: 'Admin: dar gemas a um membro',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg, args, sender }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    const amountArg = args.find(a => !isNaN(a) && Number(a) > 0)

    if (!amountArg) {
      await sock.sendMessage(from, {
        text: '❓ Uso: */dar @user <valor>* ou */dar <valor>* (para ti mesmo)',
      }, { quoted: msg })
      return
    }

    const targetJid = mentioned?.[0] || sender
    const amount = parseInt(amountArg)
    const user = getUser(targetJid)
    addGemas(targetJid, amount)
    const updated = getUser(targetJid)

    await sock.sendMessage(from, {
      text: `✅ ${gem(amount)} adicionados a ${mention(targetJid)}!\n💰 Novo saldo: ${gem(updated.gemas)}`,
      mentions: [targetJid],
    }, { quoted: msg })
  },
}
