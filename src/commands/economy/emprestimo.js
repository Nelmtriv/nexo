const { getUser } = require('../../database/users')
const { getData, save } = require('../../database/db')
const { gem, header } = require('../../utils/formatter')
const { formatRemaining } = require('../../utils/cooldown')

const MAX_LOAN   = 500
const INTEREST   = 0.25   // 25%
const DUE_MS     = 24 * 60 * 60 * 1000

module.exports = {
  name: ['emprestimo', 'emprestar', 'loan', 'credito', 'divida', 'emp'],
  description: 'Pedir empréstimo ao banco (máx 500💎, 25% juros, 24h)',
  category: 'Economia',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const user = getUser(sender, pushName)
    const sub = args[0]?.toLowerCase()

    // /emprestimo ver
    if (!sub || sub === 'ver' || sub === 'estado') {
      if (!user.loan?.active) {
        await sock.sendMessage(from, {
          text: [
            header('🏦 Empréstimo'),
            ``,
            `Não tens nenhum empréstimo activo.`,
            ``,
            `*/emprestimo pedir <valor>* (máx ${gem(MAX_LOAN)})`,
            `Juros: 25% — Prazo: 24h`,
            `⚠️ Se não pagares a tempo, vais preso 1 hora!`,
          ].join('\n'),
        }, { quoted: msg }); return
      }

      const remaining = new Date(user.loan.due).getTime() - Date.now()
      const overdue = remaining < 0
      await sock.sendMessage(from, {
        text: [
          header('🏦 Empréstimo Activo'),
          ``,
          `💰 Valor emprestado: ${gem(user.loan.amount)}`,
          `💸 Total a pagar (c/ juros): *${gem(user.loan.total)}*`,
          overdue
            ? `🔴 *VENCIDO!* Paga imediatamente ou serás preso.`
            : `⏳ Prazo: *${formatRemaining(remaining)}*`,
          ``,
          `*/emprestimo pagar* — pagar agora`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    // /emprestimo pedir <valor>
    if (sub === 'pedir' || sub === 'solicitar' || sub === 'p') {
      if (user.loan?.active) {
        await sock.sendMessage(from, { text: `❌ Já tens um empréstimo activo. Paga primeiro com */emprestimo pagar*.` }, { quoted: msg }); return
      }

      if (user.prison_until && new Date(user.prison_until) > new Date()) {
        await sock.sendMessage(from, { text: `🔒 Não podes pedir empréstimo enquanto estás preso.` }, { quoted: msg }); return
      }

      const amount = parseInt(args[1])
      if (!amount || amount < 10 || amount > MAX_LOAN) {
        await sock.sendMessage(from, { text: `❓ Valor entre 10 e ${gem(MAX_LOAN)}. Ex: */emprestimo pedir 300*` }, { quoted: msg }); return
      }

      const total = Math.ceil(amount * (1 + INTEREST))
      const due   = new Date(Date.now() + DUE_MS).toISOString()

      const db = getData()
      db.users[sender].gemas = (db.users[sender].gemas || 0) + amount
      db.users[sender].loan  = { active: true, amount, total, due }
      save()

      const updated = getUser(sender)
      await sock.sendMessage(from, {
        text: [
          `🏦 *Empréstimo aprovado!*`,
          ``,
          `💰 Recebeste *+${gem(amount)}*`,
          `💸 Total a devolver (25% juros): *${gem(total)}*`,
          `⏳ Prazo: *24 horas*`,
          ``,
          `⚠️ Se não pagares a tempo, vais preso 1 hora!`,
          `💳 Carteira: ${gem(updated.gemas)}`,
          ``,
          `*/emprestimo pagar* para liquidar`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    // /emprestimo pagar
    if (sub === 'pagar' || sub === 'liquidar' || sub === 'pag') {
      if (!user.loan?.active) {
        await sock.sendMessage(from, { text: `✅ Não tens nenhum empréstimo activo.` }, { quoted: msg }); return
      }

      const total = user.loan.total
      if (user.gemas < total) {
        await sock.sendMessage(from, {
          text: `❌ Não tens ${gem(total)} para pagar o empréstimo.\nTens ${gem(user.gemas)} na carteira.`,
        }, { quoted: msg }); return
      }

      const db = getData()
      db.users[sender].gemas = (db.users[sender].gemas || 0) - total
      db.users[sender].loan  = { active: false, amount: 0, total: 0, due: null }
      save()

      const updated = getUser(sender)
      await sock.sendMessage(from, {
        text: [
          `✅ *Empréstimo liquidado!*`,
          ``,
          `💸 Pagaste *${gem(total)}* ao banco (incluindo 25% de juros).`,
          `💳 Saldo: ${gem(updated.gemas)}`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    await sock.sendMessage(from, {
      text: `❓ Uso: */emprestimo pedir <val>* | */emprestimo pagar* | */emprestimo ver*`,
    }, { quoted: msg })
  },
}
