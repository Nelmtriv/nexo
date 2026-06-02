const { getUser, updateUser, addGemas, removeGemas } = require('../../database/users')
const { checkAndAward } = require('../../utils/achievements')
const { gem, header } = require('../../utils/formatter')

const INTEREST_RATE = 0.02       // 2% por dia
const MAX_BANK = 50_000
const INTEREST_COOLDOWN_MS = 24 * 60 * 60 * 1000

module.exports = {
  name: ['banco', 'bank', 'b', 'poupanca', 'cofre', 'deposito'],
  description: 'Banco: depositar, sacar, saldo, juros',
  category: 'Economia',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const user = getUser(sender, pushName)
    const sub = args[0]?.toLowerCase()

    // /banco or /banco saldo
    if (!sub || sub === 'saldo' || sub === 's') {
      const interest = calcInterest(user)
      await sock.sendMessage(from, {
        text: [
          header('🏦 Banco — ' + user.name),
          ``,
          `💳 *Conta corrente:* ${gem(user.gemas)}`,
          `🏦 *Poupança:*       ${gem(user.bank)}`,
          `💹 *Juros pendentes:* ${gem(interest)} (2%/dia)`,
          ``,
          `💰 *Total:* ${gem(user.gemas + user.bank + interest)}`,
          ``,
          `┣ */banco depositar <val>*`,
          `┣ */banco levantar <val>*`,
          `┗ */banco juros* — cobrar juros`,
        ].join('\n'),
      }, { quoted: msg })
      return
    }

    // /banco depositar <val>
    if (sub === 'depositar' || sub === 'dep' || sub === 'd') {
      const amount = parseAmount(args[1], user.gemas)
      if (!amount) { await usage(sock, from, msg, 'depositar'); return }

      if (user.gemas < amount) {
        await sock.sendMessage(from, { text: `❌ Saldo insuficiente. Tens ${gem(user.gemas)} na carteira.` }, { quoted: msg })
        return
      }
      if (user.bank + amount > MAX_BANK) {
        await sock.sendMessage(from, { text: `❌ Limite do banco atingido (máx ${gem(MAX_BANK)}).` }, { quoted: msg })
        return
      }

      const { getData, save } = require('../../database/db')
      const db = getData()
      db.users[sender].gemas = (db.users[sender].gemas || 0) - amount
      db.users[sender].bank  = (db.users[sender].bank  || 0) + amount
      save()

      const awarded = checkAndAward(sender, 'bank', amount)
      const achText = awarded.length ? `\n\n🏅 Conquista desbloqueada: *${awarded[0].name}*! +${gem(awarded[0].reward)}` : ''
      const updated = getUser(sender)

      await sock.sendMessage(from, {
        text: `✅ Depositaste ${gem(amount)} no banco.\n💳 Carteira: ${gem(updated.gemas)}\n🏦 Banco: ${gem(updated.bank)}${achText}`,
      }, { quoted: msg })
      return
    }

    // /banco levantar <val>
    if (sub === 'sacar' || sub === 'levantar' || sub === 'sak' || sub === 'lev' || sub === 'retirar') {
      const bankBefore = user.bank || 0
      const amount = parseAmount(args[1], bankBefore)
      if (!amount) { await usage(sock, from, msg, 'levantar'); return }

      if (bankBefore < amount) {
        await sock.sendMessage(from, { text: `❌ Saldo bancário insuficiente. Tens ${gem(bankBefore)} no banco.` }, { quoted: msg })
        return
      }

      // update bank and wallet together to avoid inconsistency
      const { getData, save } = require('../../database/db')
      const db = getData()
      db.users[sender].bank = bankBefore - amount
      db.users[sender].gemas = (db.users[sender].gemas || 0) + amount
      save()

      const updated = getUser(sender)

      await sock.sendMessage(from, {
        text: `✅ Levantaste ${gem(amount)} do banco.\n💳 Carteira: ${gem(updated.gemas)}\n🏦 Banco: ${gem(updated.bank)}`,
      }, { quoted: msg })
      return
    }

    // /banco juros
    if (sub === 'juros' || sub === 'j') {
      const interest = calcInterest(user)
      if (interest === 0) {
        await sock.sendMessage(from, {
          text: `⏳ Já cobraste os juros hoje. Volta amanhã!`,
        }, { quoted: msg })
        return
      }

      addGemas(sender, interest)
      updateUser(sender, { last_bank_interest: new Date().toISOString() })

      await sock.sendMessage(from, {
        text: `💹 *Juros cobrados!*\n+${gem(interest)} (2% de ${gem(user.bank)})\n💳 Carteira: ${gem(user.gemas + interest)}`,
      }, { quoted: msg })
      return
    }

    await sock.sendMessage(from, {
      text: `❓ Subcomandos: *saldo | depositar <val> | sacar <val> | juros*`,
    }, { quoted: msg })
  },
}

function calcInterest(user) {
  if (!user.bank || user.bank <= 0) return 0
  const last = user.last_bank_interest ? new Date(user.last_bank_interest) : null
  if (last && Date.now() - last.getTime() < INTEREST_COOLDOWN_MS) return 0
  return Math.floor(user.bank * INTEREST_RATE)
}

function parseAmount(arg, max) {
  if (!arg) return null
  if (arg === 'tudo' || arg === 'all') return max
  const n = parseInt(arg)
  return (!isNaN(n) && n > 0) ? n : null
}

async function usage(sock, from, msg, sub) {
  await sock.sendMessage(from, {
    text: `❓ Uso: */banco ${sub} <valor>* ou */banco ${sub} tudo*`,
  }, { quoted: msg })
}
