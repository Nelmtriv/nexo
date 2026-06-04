const { getUser, setLastRob, setRevenge, hasItem, useItem, addPontos } = require('../../database/users')
const { getData, save } = require('../../database/db')
const { checkDailyLimit, handleLimitExceeded } = require('../../utils/dailyLimit')
const { addXP } = require('../../utils/level')
const { checkAndAward } = require('../../utils/achievements')
const { gem, mention } = require('../../utils/formatter')
const { checkCooldown, formatRemaining } = require('../../utils/cooldown')
const { shop } = require('../../config')

const ROB_COOLDOWN_MS = 10 * 60 * 1000

const stories = [
  'Administraste o Streeton com precisão cirúrgica. Efeito imediato.',
  'A vítima nem percebeu o que aconteceu. Dinheiro transferido silenciosamente.',
  'Streeton é infalível. Saíste com tudo o que havia disponível.',
]

module.exports = {
  name: ['streeton', 'str', 'streton', 'embebedar-streeton', 'embstreeton'],
  description: 'Usa 🥃 Streeton para roubar com 100% de sucesso — carteira e banco. Escudo não bloqueia.',
  category: 'Jogos',
  async execute({ sock, from, msg, sender, pushName }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (!mentioned?.length) {
      await sock.sendMessage(from, {
        text: [
          `❓ Uso: */streeton @user*`,
          ``,
          `🥃 *Streeton* — 100% sucesso garantido`,
          `• Rouba 35-55% da riqueza total (carteira + banco)`,
          `• *🛡️ Ignora Escudo — funciona mesmo com escudo!*`,
          `• Seguro de Roubo ainda bloqueia`,
          `Compra: */loja comprar streeton* (${gem(shop.streeton.price)})`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    const targetJid = mentioned[0]
    if (targetJid === sender) { await sock.sendMessage(from, { text: '😂 Não podes usar Streeton em ti mesmo.' }, { quoted: msg }); return }

    const robber = getUser(sender, pushName)

    const limitResult = checkDailyLimit(sender, 'embebedar')
    if (!limitResult.allowed) { await handleLimitExceeded(sock, from, msg, sender, robber.name, limitResult); return }

    if (robber.prison_until && new Date(robber.prison_until) > new Date()) {
      await sock.sendMessage(from, { text: `🔒 Estás na prisão!` }, { quoted: msg }); return
    }

    if (!hasItem(sender, 'streeton')) {
      await sock.sendMessage(from, {
        text: [`🥃 Precisas de *Streeton* para este ataque!`, `Compra: */loja comprar streeton* (${gem(shop.streeton.price)})`].join('\n'),
      }, { quoted: msg }); return
    }

    const { ready, remaining } = checkCooldown(robber.last_rob, ROB_COOLDOWN_MS)
    if (!ready) {
      await sock.sendMessage(from, { text: `⏳ Espera *${formatRemaining(remaining)}*.` }, { quoted: msg }); return
    }

    const victim = getUser(targetJid)
    const victimTotal = (victim.gemas || 0) + (victim.bank || 0)
    if (victimTotal < 20) {
      await sock.sendMessage(from, {
        text: `😅 ${mention(targetJid)} não tem riqueza suficiente.`,
        mentions: [targetJid],
      }, { quoted: msg }); return
    }

    // check insurance — blocks even Streeton
    if (victim.insurance_until && new Date(victim.insurance_until) > new Date()) {
      const penalty = Math.floor(robber.gemas * 0.25)
      const db = getData()
      db.users[sender].gemas = Math.max(0, (db.users[sender].gemas || 0) - penalty)
      save()
      useItem(sender, 'streeton')
      setLastRob(sender)
      setRevenge(targetJid, sender, from)
      const updR = getUser(sender)
      const insLeft = formatRemaining(new Date(victim.insurance_until).getTime() - Date.now())
      await sock.sendMessage(from, {
        text: [
          `🔐 *Seguro activo — Streeton neutralizado!*`,
          `O seguro da vítima bloqueou até o Streeton!`,
          `🥃 Streeton perdido + 💸 Penalização: *-${gem(penalty)}*`,
          `💳 Saldo: ${gem(updR.gemas)} | ⏳ Seguro activo por mais *${insLeft}*`,
          `⚠️ ${mention(targetJid)}, podes vingar-te!`,
        ].join('\n'),
        mentions: [targetJid],
      }); return
    }

    // NO escudo check — Streeton ignores shields

    useItem(sender, 'streeton')
    setLastRob(sender)

    const pct = 0.35 + Math.random() * 0.20
    const stealTarget = Math.max(20, Math.floor(victimTotal * pct))
    const fromWallet = Math.min(stealTarget, victim.gemas || 0)
    const fromBank   = Math.min(stealTarget - fromWallet, victim.bank || 0)
    const totalStolen = fromWallet + fromBank

    const db = getData()
    db.users[targetJid].gemas = (victim.gemas || 0) - fromWallet
    db.users[targetJid].bank  = (victim.bank  || 0) - fromBank
    db.users[sender].gemas    = (robber.gemas || 0) + totalStolen
    save()

    setRevenge(targetJid, sender, from)
    addXP(sender, 20); addPontos(sender, 8)
    checkAndAward(sender, 'rob', null)

    const updated = getUser(sender)
    const story = stories[Math.floor(Math.random() * stories.length)]

    await sock.sendMessage(from, {
      text: [
        `🥃 *Streeton — 100% garantido!*`,
        ``, story,
        `*${robber.name}* roubou *${gem(totalStolen)}* de ${mention(targetJid)}!`,
        fromBank > 0
          ? `  └ ${gem(fromWallet)} da carteira + ${gem(fromBank)} do banco`
          : `  └ ${gem(fromWallet)} da carteira`,
        `💳 Saldo: ${gem(updated.gemas)}`,
        `⚠️ ${mention(targetJid)}, podes vingar-te!`,
      ].filter(Boolean).join('\n'),
      mentions: [targetJid],
    })
  },
}
