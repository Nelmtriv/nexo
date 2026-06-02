const { getUser, addGemas, removeGemas } = require('../../database/users')
const { gem, mention } = require('../../utils/formatter')

module.exports = {
  name: ['transferir', 'pagar', 'send', 'enviar', 'pix', 'tf'],
  description: 'Transfere gemas para outro membro',
  category: 'Economia',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    const amountArg = args.find(a => !isNaN(a) && Number(a) > 0)

    if (!mentioned?.length || !amountArg) {
      await sock.sendMessage(from, {
        text: '❓ Uso: */transferir @user <valor>*\nExemplo: /transferir @João 100',
      }, { quoted: msg })
      return
    }

    const targetJid = mentioned[0]
    const amount = parseInt(amountArg)

    if (targetJid === sender) {
      await sock.sendMessage(from, { text: '😅 Não podes transferir gemas para ti mesmo.' }, { quoted: msg })
      return
    }

    const fromUser = getUser(sender, pushName)
    if (fromUser.gemas < amount) {
      await sock.sendMessage(from, {
        text: `❌ Saldo insuficiente! Tens apenas ${gem(fromUser.gemas)}.`,
      }, { quoted: msg })
      return
    }

    const toUser = getUser(targetJid)
    removeGemas(sender, amount)
    addGemas(targetJid, amount)

    await sock.sendMessage(from, {
      text: `✅ ${mention(sender)} transferiu ${gem(amount)} para ${mention(targetJid)}!`,
      mentions: [sender, targetJid],
    }, { quoted: msg })
  },
}
