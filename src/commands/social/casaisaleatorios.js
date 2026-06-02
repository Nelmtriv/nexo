const { header } = require('../../utils/formatter')

const coracoes = ['❤️', '🧡', '💛', '💚', '💙', '💜', '🩷', '🩵', '🤍', '💕', '💞', '💗']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

module.exports = {
  name: ['casaisaleatorios', 'casais', 'shipall', 'ship', 'sortearCasais', 'formarCasais'],
  description: 'Forma casais aleatórios com os membros do grupo!',
  category: 'Social',
  async execute({ sock, from, msg }) {
    const meta = await sock.groupMetadata(from)
    const botJid = sock.user.id.replace(/:\d+/, '') // normaliza JID do bot
    const members = meta.participants
      .map(p => p.id)
      .filter(jid => jid.replace(/:\d+/, '') !== botJid)

    if (members.length < 2) {
      await sock.sendMessage(from, { text: '❕ Precisas de pelo menos 2 membros para formar casais.' }, { quoted: msg })
      return
    }

    const shuffled = shuffle(members)
    const couples = []
    const mentions = []

    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      couples.push([shuffled[i], shuffled[i + 1]])
      mentions.push(shuffled[i], shuffled[i + 1])
    }

    const leftover = shuffled.length % 2 !== 0 ? shuffled[shuffled.length - 1] : null
    if (leftover) mentions.push(leftover)

    const lines = [
      header('💘 Casais Aleatórios do Grupo'),
      ``,
    ]

    couples.forEach(([a, b], i) => {
      const cor = coracoes[i % coracoes.length]
      const numA = a.split('@')[0]
      const numB = b.split('@')[0]
      lines.push(`${cor} @${numA}  ×  @${numB}`)
    })

    if (leftover) {
      lines.push(``, `💔 @${leftover.split('@')[0]} ficou sem par desta vez! 😢`)
    }

    lines.push(``, `_Baseado em sorteio aleatório puro_ 🎲`)

    await sock.sendMessage(from, {
      text: lines.join('\n'),
      mentions,
    })
  },
}
