const { getUser, addGemas, removeGemas, getRevenge, clearRevenge, setLastRob, hasItem, useItem, addPontos } = require('../../database/users')
const { getData, save } = require('../../database/db')
const { addXP } = require('../../utils/level')
const { checkAndAward } = require('../../utils/achievements')
const { gem, mention } = require('../../utils/formatter')
const { shop } = require('../../config')

module.exports = {
  name: ['vingar', 'vinganca', 'revenge', 'retaliar', 'contra', 'represalia'],
  description: 'Vinga-te de quem te roubou. Usa 💜 VingançaPremium ou 💠 VingançaGema.',
  category: 'Jogos',
  async execute({ sock, from, msg, sender, pushName }) {
    const user = getUser(sender, pushName)

    const revenge = getRevenge(sender)
    if (!revenge) {
      await sock.sendMessage(from, {
        text: [
          `😌 Não tens nenhuma vingança pendente.`,
          ``,
          `Só podes vingar-te de alguém que te roubou!`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    const hasPremium = hasItem(sender, 'vingancapremium')
    const hasNormal  = hasItem(sender, 'vingancagema')

    if (!hasPremium && !hasNormal) {
      await sock.sendMessage(from, {
        text: [
          `Precisas de um item para te vingares:`,
          ``,
          `💠 *VingançaGema* (${gem(shop.vingancagema.price)}) — sempre dá certo, recupera algo da carteira`,
          `💜 *VingançaPremium* (${gem(shop.vingancapremium.price)}, 3 usos) — sempre dá certo, recupera da carteira + banco, pode recuperar mais do que foi roubado`,
          ``,
          `Compra: */loja comprar vingancagema* ou */loja comprar vingancapremium*`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    clearRevenge(sender)
    setLastRob(sender)

    const target = getUser(revenge.robberJid)

    // ── PREMIUM: 100% success, wallet + bank, can exceed stolen ────────────
    if (hasPremium) {
      useItem(sender, 'vingancapremium')

      const targetTotal = (target.gemas || 0) + (target.bank || 0)
      const pct = 0.20 + Math.random() * 0.35          // 20-55% — can be more than stolen
      const stealTarget = Math.max(10, Math.floor(targetTotal * pct))
      const fromWallet = Math.min(stealTarget, target.gemas || 0)
      const fromBank   = Math.min(stealTarget - fromWallet, target.bank || 0)
      const totalStolen = fromWallet + fromBank

      const db = getData()
      db.users[revenge.robberJid].gemas = (target.gemas || 0) - fromWallet
      db.users[revenge.robberJid].bank  = (target.bank  || 0) - fromBank
      db.users[sender].gemas            = (user.gemas   || 0) + totalStolen
      save()

      addXP(sender, 20); addPontos(sender, 10)
      checkAndAward(sender, 'revenge', null)
      const updated = getUser(sender)
      const inv = (getUser(sender).inventory?.vingancapremium || 0)

      const lines = [
        `💜 *Vingança Premium executada!*`,
        ``,
        `*${user.name}* vingou-se de ${mention(revenge.robberJid)} e recuperou *${gem(totalStolen)}*! 💥`,
        fromBank > 0
          ? `  └ ${gem(fromWallet)} da carteira + ${gem(fromBank)} do banco`
          : `  └ ${gem(fromWallet)} da carteira`,
        `💳 Saldo: ${gem(updated.gemas)}`,
        `💜 Usos Premium restantes: ${inv}`,
      ]
      checkAndAward(sender, 'gemas', null)
      await sock.sendMessage(from, { text: lines.join('\n'), mentions: [revenge.robberJid] })
      return
    }

    // ── NORMAL: 100% success, wallet only, partial recovery ────────────────
    useItem(sender, 'vingancagema')

    const walletOnly = target.gemas || 0
    const pct = 0.10 + Math.random() * 0.20            // 10-30% of wallet only
    const stolen = Math.max(5, Math.floor(walletOnly * pct))

    removeGemas(revenge.robberJid, stolen, `💠 Vingança de ${user.name}`)
    addGemas(sender, stolen, `💠 Vingança contra ${target.name}`)
    addXP(sender, 15); addPontos(sender, 8)
    checkAndAward(sender, 'revenge', null)
    const updated = getUser(sender)

    await sock.sendMessage(from, {
      text: [
        `⚔️ *Vingança executada!*`,
        `💠 A VingançaGema brilhou...`,
        ``,
        `*${user.name}* recuperou *${gem(stolen)}* da carteira de ${mention(revenge.robberJid)}`,
        `💳 Saldo: ${gem(updated.gemas)}`,
      ].join('\n'),
      mentions: [revenge.robberJid],
    })
  },
}
