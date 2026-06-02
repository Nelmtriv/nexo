const { deleteActiveGame } = require('../../database/users')

const GAME_TYPES = ['forca', 'velha', 'quiz', 'ppt', 'duelo', 'blackjack']

module.exports = {
  name: ['fecharjogo', 'stopjogo', 'cancelarjogo', 'fj'],
  description: 'Admin: encerrar jogo activo no grupo',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg, args }) {
    const type = args[0]?.toLowerCase()

    if (type && GAME_TYPES.includes(type)) {
      deleteActiveGame(from, type)
      await sock.sendMessage(from, { text: `✅ Jogo *${type}* encerrado pelo admin.` }, { quoted: msg })
      return
    }

    // close all active games in this group
    let closed = 0
    for (const t of GAME_TYPES) {
      const { getData } = require('../../database/db')
      const db = getData()
      if (db.active_games[`${from}__${t}`]) {
        deleteActiveGame(from, t)
        closed++
      }
    }
    // also close blackjack games (keyed differently)
    const { getData } = require('../../database/db')
    const db = getData()
    for (const key of Object.keys(db.active_games || {})) {
      if (key.includes('blackjack') && key.startsWith(from)) {
        delete db.active_games[key]
        require('../../database/db').save && require('../../database/db').save()
        closed++
      }
    }

    await sock.sendMessage(from, {
      text: closed > 0
        ? `✅ ${closed} jogo(s) encerrado(s) pelo admin.\nUsa */fecharjogo <tipo>* para fechar um específico.\nTipos: ${GAME_TYPES.join(', ')}`
        : `❕ Nenhum jogo activo no grupo.`,
    }, { quoted: msg })
  },
}
