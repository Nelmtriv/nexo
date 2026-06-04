const { getUser } = require('../../database/users')
const { getData, save } = require('../../database/db')
const { gem, header, mention } = require('../../utils/formatter')

const TICKET_PRICE = 60

function getLotaria(db) {
  if (!db.lotaria) db.lotaria = { pool: 0, tickets: {} }
  return db.lotaria
}

module.exports = {
  name: ['lotaria', 'loto', 'loteria', 'bilhete', 'lottery'],
  description: 'Comprar bilhetes de lotaria. Admin sorteia o vencedor.',
  category: 'Economia',
  async execute({ sock, from, msg, sender, pushName, args, isAdmin }) {
    const user = getUser(sender, pushName)
    const sub = args[0]?.toLowerCase()
    const db = getData()
    const lotaria = getLotaria(db)

    // /lotaria ver
    if (!sub || sub === 'ver' || sub === 'info') {
      const totalTickets = Object.values(lotaria.tickets).reduce((s, n) => s + n, 0)
      const myTickets = lotaria.tickets[sender] || 0
      await sock.sendMessage(from, {
        text: [
          header('🎟️ Lotaria'),
          ``,
          `💰 *Prize pool:* ${gem(lotaria.pool)}`,
          `🎫 *Bilhetes vendidos:* ${totalTickets}`,
          `👤 *Os teus bilhetes:* ${myTickets}`,
          ``,
          `Preço por bilhete: ${gem(TICKET_PRICE)}`,
          `*/lotaria bilhete* — comprar 1 bilhete`,
          `*/lotaria bilhete 5* — comprar 5 bilhetes`,
          isAdmin ? `*/lotaria sortear* — sortear vencedor (admin)` : ``,
        ].filter(l => l !== '').join('\n'),
      }, { quoted: msg }); return
    }

    // /lotaria bilhete [qty]
    if (sub === 'bilhete' || sub === 'comprar' || sub === 'buy' || sub === 'b') {
      const qty = Math.min(10, Math.max(1, parseInt(args[1]) || 1))
      const cost = qty * TICKET_PRICE

      if (user.gemas < cost) {
        await sock.sendMessage(from, {
          text: `❌ Precisas de ${gem(cost)} para ${qty} bilhete(s). Tens ${gem(user.gemas)}.`,
        }, { quoted: msg }); return
      }

      db.users[sender].gemas = (db.users[sender].gemas || 0) - cost
      lotaria.pool += cost
      lotaria.tickets[sender] = (lotaria.tickets[sender] || 0) + qty
      save()

      const updated = getUser(sender)
      await sock.sendMessage(from, {
        text: [
          `🎟️ *${qty} bilhete(s) comprado(s)!*`,
          ``,
          `💸 Gasto: ${gem(cost)}`,
          `💰 Prize pool: ${gem(lotaria.pool)}`,
          `🎫 Os teus bilhetes: ${lotaria.tickets[sender]}`,
          `💳 Saldo: ${gem(updated.gemas)}`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    // /lotaria sortear — admin only
    if (sub === 'sortear' || sub === 'sorteio' || sub === 'draw') {
      if (!isAdmin) {
        await sock.sendMessage(from, { text: `🔒 Apenas admins podem sortear.` }, { quoted: msg }); return
      }

      const entries = Object.entries(lotaria.tickets)
      if (entries.length === 0 || lotaria.pool === 0) {
        await sock.sendMessage(from, { text: `❌ Nenhum bilhete vendido ainda.` }, { quoted: msg }); return
      }

      // weighted random draw
      const pool = []
      for (const [jid, count] of entries) {
        for (let i = 0; i < count; i++) pool.push(jid)
      }
      const winnerJid = pool[Math.floor(Math.random() * pool.length)]

      const prize = lotaria.pool
      db.users[winnerJid].gemas = (db.users[winnerJid].gemas || 0) + prize
      db.lotaria = { pool: 0, tickets: {} }
      save()

      const winner = getUser(winnerJid)
      const totalTickets = pool.length

      await sock.sendMessage(from, {
        text: [
          `🎊 *SORTEIO DA LOTARIA!*`,
          ``,
          `🎫 Bilhetes totais: ${totalTickets}`,
          `💰 Prize pool: ${gem(prize)}`,
          ``,
          `🏆 *VENCEDOR: ${mention(winnerJid)}*`,
          `💎 Ganhou *${gem(prize)}*!`,
        ].join('\n'),
        mentions: [winnerJid],
      }); return
    }

    await sock.sendMessage(from, { text: `❓ Uso: */lotaria* | */lotaria bilhete [qty]*` }, { quoted: msg })
  },
}
