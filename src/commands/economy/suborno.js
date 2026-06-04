const { getUser, updateUser } = require('../../database/users')
const { getData, save } = require('../../database/db')
const { gem } = require('../../utils/formatter')
const { formatRemaining } = require('../../utils/cooldown')

const BRIBE_COST = 200

module.exports = {
  name: ['suborno', 'subornar', 'bribe', 'corromprer', 'suborn'],
  description: `Paga ${BRIBE_COST}💎 para reduzir o tempo de prisão a metade`,
  category: 'Economia',
  async execute({ sock, from, msg, sender, pushName }) {
    const user = getUser(sender, pushName)

    if (!user.prison_until || new Date(user.prison_until) <= new Date()) {
      await sock.sendMessage(from, {
        text: `😅 *${user.name}*, não estás na prisão! O suborno não tem utilidade agora.`,
      }, { quoted: msg }); return
    }

    const remaining = new Date(user.prison_until).getTime() - Date.now()
    const half = Math.floor(remaining / 2)

    if (user.gemas < BRIBE_COST) {
      await sock.sendMessage(from, {
        text: [
          `💸 Não tens ${gem(BRIBE_COST)} para subornar o guarda.`,
          `🔒 Tempo restante: *${formatRemaining(remaining)}*`,
          `💳 Saldo: ${gem(user.gemas)}`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    const db = getData()
    db.users[sender].gemas = (db.users[sender].gemas || 0) - BRIBE_COST
    db.users[sender].prison_until = new Date(Date.now() + half).toISOString()
    save()

    const updated = getUser(sender)

    await sock.sendMessage(from, {
      text: [
        `🤫 *Suborno aceite!*`,
        ``,
        `O guarda embolsou *${gem(BRIBE_COST)}* e fechou os olhos...`,
        `⏳ Tempo de prisão reduzido para: *${formatRemaining(half)}*`,
        `💳 Saldo: ${gem(updated.gemas)}`,
      ].join('\n'),
    }, { quoted: msg })
  },
}
