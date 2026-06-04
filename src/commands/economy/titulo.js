const { getUser } = require('../../database/users')
const { getData, save } = require('../../database/db')
const { gem, header } = require('../../utils/formatter')
const { titles } = require('../../config')

module.exports = {
  name: ['titulo', 'titulos', 'title', 'alcunha', 'tag'],
  description: 'Comprar um título para o teu perfil',
  category: 'Economia',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const user = getUser(sender, pushName)
    const sub = args[0]?.toLowerCase()

    if (!sub || sub === 'ver' || sub === 'lista') {
      const lines = [
        header('🏷️ Títulos Disponíveis'),
        ``,
        ...Object.entries(titles).map(([id, t]) => {
          const owned = user.titulo === id
          return `${owned ? '✅' : '  '} *${t.emoji} ${t.label}* — ${gem(t.price)}${owned ? ' (equipado)' : ''}`
        }),
        ``,
        `Comprar: */titulo comprar <nome>*`,
        `Ex: */titulo comprar guerreiro*`,
      ]
      await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg })
      return
    }

    if (sub === 'comprar' || sub === 'buy' || sub === 'c') {
      const titleId = args[1]?.toLowerCase()
      const title = titles[titleId]

      if (!title) {
        const names = Object.keys(titles).join(' | ')
        await sock.sendMessage(from, {
          text: `❓ Título inválido. Opções: *${names}*`,
        }, { quoted: msg }); return
      }

      if (user.titulo === titleId) {
        await sock.sendMessage(from, { text: `✅ Já tens o título *${title.emoji} ${title.label}* equipado.` }, { quoted: msg }); return
      }

      if (user.gemas < title.price) {
        await sock.sendMessage(from, {
          text: `❌ Precisas de *${gem(title.price)}* para este título.\nTens apenas ${gem(user.gemas)}.`,
        }, { quoted: msg }); return
      }

      const db = getData()
      db.users[sender].gemas = (db.users[sender].gemas || 0) - title.price
      db.users[sender].titulo = titleId
      save()

      const updated = getUser(sender)
      await sock.sendMessage(from, {
        text: [
          `🏷️ *Título adquirido!*`,
          ``,
          `${title.emoji} *${title.label}* está agora no teu perfil!`,
          `💸 Gasto: ${gem(title.price)}`,
          `💳 Saldo: ${gem(updated.gemas)}`,
        ].join('\n'),
      }, { quoted: msg })
      return
    }

    await sock.sendMessage(from, { text: `❓ Uso: */titulo* (ver lista) | */titulo comprar <nome>*` }, { quoted: msg })
  },
}
