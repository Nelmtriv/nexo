const { getUser } = require('../../database/users')
const { getData, save } = require('../../database/db')
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

    const targetJid = mentioned[0]
    const amount = parseInt(amountArg)

    const db = getData()

    if (!db.users[targetJid]) {
      await sock.sendMessage(from, { text: '❌ Utilizador não encontrado.' }, { quoted: msg })
      return
    }

    const targetBefore = db.users[targetJid].gemas || 0
    const actual = Math.min(amount, targetBefore)

    if (actual <= 0) {
      await sock.sendMessage(from, { text: `❌ ${mention(targetJid)} não tem gemas suficientes.`, mentions: [targetJid] }, { quoted: msg })
      return
    }

    // gems are destroyed — removed from economy
    db.users[targetJid].gemas = targetBefore - actual
    save()

    const target = getUser(targetJid)

    await sock.sendMessage(from, {
      text: [
        `🏛️ *O governo confiscou gemas!*`,
        ``,
        `${mention(targetJid)} perdeu *${gem(actual)}* por ordem do governo.`,
        `💳 Saldo de ${target.name}: ${gem(target.gemas)}`,
      ].join('\n'),
      mentions: [targetJid],
    }, { quoted: msg })
  },
}
