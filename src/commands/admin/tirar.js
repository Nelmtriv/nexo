const { getUser, removeGemas, addGemas } = require('../../database/users')
const { gem, mention } = require('../../utils/formatter')

module.exports = {
  name: ['tirar'],
  description: 'Admin: remover gemas de um membro (vão para a tua conta)',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg, args, sender, pushName }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    const amountArg = args.find(a => !isNaN(a) && Number(a) > 0)

    if (!mentioned?.length || !amountArg) {
      await sock.sendMessage(from, { text: '❓ Uso: */tirar @user <valor>*' }, { quoted: msg })
      return
    }

    const targetJid = mentioned?.[0] || sender

    const amount = parseInt(amountArg)
    const before = getUser(targetJid).gemas
    const actual = Math.min(amount, before)

    const isSelf = targetJid === sender

    removeGemas(targetJid, actual, isSelf ? '🔧 Admin removeu gemas da própria conta' : `🔧 Admin retirou gemas de ${getUser(targetJid).name}`)
    if (!isSelf) addGemas(sender, actual, `🔧 Transferência forçada de ${getUser(targetJid).name}`)

    const target = getUser(targetJid)
    const admin = getUser(sender, pushName)

    if (isSelf) {
      await sock.sendMessage(from, {
        text: [
          `✅ Removeste ${gem(actual)} da tua conta.`,
          `💳 Saldo actual: ${gem(admin.gemas)}`,
        ].join('\n'),
      }, { quoted: msg })
    } else {
      await sock.sendMessage(from, {
        text: [
          `✅ Transferência forçada!`,
          ``,
          `💸 ${gem(actual)} retirados de ${mention(targetJid)}`,
          `💰 Foram para a tua conta`,
          ``,
          `📊 ${mention(targetJid)}: ${gem(target.gemas)}`,
          `📊 Tu: ${gem(admin.gemas)}`,
        ].join('\n'),
        mentions: [targetJid],
      }, { quoted: msg })
    }
  },
}
