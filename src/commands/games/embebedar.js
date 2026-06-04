const { getUser, addGemas, removeGemas, updateUser, setLastRob, setRevenge, hasItem, useItem, addPontos } = require('../../database/users')
const { checkDailyLimit, handleLimitExceeded } = require('../../utils/dailyLimit')
const { addXP } = require('../../utils/level')
const { checkAndAward } = require('../../utils/achievements')
const { gem, mention } = require('../../utils/formatter')
const { checkCooldown, formatRemaining } = require('../../utils/cooldown')
const { shop } = require('../../config')

const ROB_COOLDOWN_MS = 10 * 60 * 1000
const MIN_VICTIM_GEMAS = 20
const SUCCESS_RATE = 0.55

const successStories = [
  'Serviste uma bebida "especial". A vítima ficou tonta e tu agiste.',
  'O Bond7 fez efeito imediato. A vítima mal conseguia ver.',
  'Com a vítima desorientada, foi fácil. Saíste rico e sorridente.',
]
const failStories = [
  'A vítima recusou a bebida. Tentaste à força e correste mal.',
  'O Bond7 não fez efeito desta vez. Foste apanhado a registar.',
  'A vítima fingiu estar embebedada e armou-te uma rasteira.',
]

module.exports = {
  name: ['embebedar', 'emb', 'beber', 'bond', 'entortar', 'drogar', 'embond'],
  description: 'Embebeda com 🍶 Bond7 (55% sucesso, carteira). Para 100%+banco usa /streeton.',
  category: 'Jogos',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (!mentioned?.length) {
      await sock.sendMessage(from, {
        text: [
          `❓ Uso: */embebedar @user*`,
          ``,
          `🍶 *Bond7* — 55% de sucesso, rouba apenas carteira`,
          `🛡️ *Escudo bloqueia Bond7!*`,
          ``,
          `🥃 *Para ignorar escudo usa:* */streeton @user*`,
          `  • 100% de sucesso`,
          `  • Rouba carteira + banco`,
          `  • *Ignora escudo!*`,
          ``,
          `Compra Bond7: */loja comprar bond7* (${gem(shop.bond7.price)})`,
          `Compra Streeton: */loja comprar streeton* (${gem(shop.streeton.price)})`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    const targetJid = mentioned[0]
    if (targetJid === sender) { await sock.sendMessage(from, { text: '😂 Não podes embebedar-te a ti mesmo.' }, { quoted: msg }); return }

    const robber = getUser(sender, pushName)

    const limitResult = checkDailyLimit(sender, 'embebedar')
    if (!limitResult.allowed) { await handleLimitExceeded(sock, from, msg, sender, robber.name, limitResult); return }

    if (robber.prison_until && new Date(robber.prison_until) > new Date()) {
      await sock.sendMessage(from, { text: `🔒 Estás na prisão!` }, { quoted: msg }); return
    }

    if (!hasItem(sender, 'bond7')) {
      await sock.sendMessage(from, {
        text: [`🍶 Precisas de *Bond7* para embebedar!`, `Compra: */loja comprar bond7* (${gem(shop.bond7.price)})`].join('\n'),
      }, { quoted: msg }); return
    }

    const { ready, remaining } = checkCooldown(robber.last_rob, ROB_COOLDOWN_MS)
    if (!ready) {
      await sock.sendMessage(from, { text: `⏳ Espera *${formatRemaining(remaining)}*.` }, { quoted: msg }); return
    }

    const victim = getUser(targetJid)
    if (victim.gemas < MIN_VICTIM_GEMAS) {
      await sock.sendMessage(from, {
        text: `😅 ${mention(targetJid)} não tem gemas suficientes (mínimo ${gem(MIN_VICTIM_GEMAS)}).`,
        mentions: [targetJid],
      }, { quoted: msg }); return
    }

    // check insurance
    if (victim.insurance_until && new Date(victim.insurance_until) > new Date()) {
      const penalty = Math.floor(robber.gemas * 0.20)
      const { getData, save } = require('../../database/db')
      const db = getData()
      db.users[sender].gemas = Math.max(0, (db.users[sender].gemas || 0) - penalty)
      save()
      useItem(sender, 'bond7')
      setLastRob(sender)
      setRevenge(targetJid, sender, from)
      const updR = getUser(sender)
      const insLeft = formatRemaining(new Date(victim.insurance_until).getTime() - Date.now())
      await sock.sendMessage(from, {
        text: [
          `🔐 *Seguro activo!*`,
          `*${robber.name}* tentou embebedar ${mention(targetJid)}, mas o seguro bloqueou!`,
          `🍶 Bond7 desperdiçado + 💸 Penalização: *-${gem(penalty)}*`,
          `💳 Saldo: ${gem(updR.gemas)} | ⏳ Seguro activo por mais *${insLeft}*`,
          `⚠️ ${mention(targetJid)}, podes vingar-te!`,
        ].join('\n'),
        mentions: [targetJid],
      }); return
    }

    // check shield — blocks Bond7
    if (hasItem(targetJid, 'escudo')) {
      useItem(targetJid, 'escudo')
      useItem(sender, 'bond7')
      setLastRob(sender)
      const fine = Math.max(15, Math.floor(robber.gemas * (0.15 + Math.random() * 0.10)))
      removeGemas(sender, fine, `🛡️ Penalizado por tentar embebedar ${victim.name} (escudo)`)
      addGemas(targetJid, fine, `🛡️ Compensação de ${robber.name}`)
      setRevenge(targetJid, sender, from)
      const shieldLeft = getUser(targetJid).inventory?.escudo || 0
      const updatedRobber = getUser(sender)
      await sock.sendMessage(from, {
        text: [
          `🛡️ *Escudo activado!*`,
          `*${robber.name}* tentou embebedar ${mention(targetJid)}, mas o escudo bloqueou!`,
          `🍶 Bond7 desperdiçado + 💸 Penalização: *-${gem(fine)}*`,
          `💳 Saldo: ${gem(updatedRobber.gemas)} | 🛡️ Escudo restante: ${shieldLeft}`,
          `⚠️ ${mention(targetJid)}, podes vingar-te!`,
        ].join('\n'),
        mentions: [targetJid],
      }); return
    }

    useItem(sender, 'bond7')
    setLastRob(sender)

    const levelAdv = ((robber.level || 1) - (victim.level || 1)) * 0.02
    const rate = Math.min(0.72, Math.max(0.35, SUCCESS_RATE + levelAdv))
    const success = Math.random() < rate

    if (success) {
      const stolen = Math.max(15, Math.floor(victim.gemas * (0.35 + Math.random() * 0.25)))
      removeGemas(targetJid, stolen, `🍶 Roubado por ${robber.name}`)
      addGemas(sender, stolen, `🍶 Embebedou ${victim.name}`)
      setRevenge(targetJid, sender, from)
      addXP(sender, 14); addPontos(sender, 5)
      checkAndAward(sender, 'rob', null)
      const updated = getUser(sender)
      const story = successStories[Math.floor(Math.random() * successStories.length)]
      await sock.sendMessage(from, {
        text: [
          `🍶 *Embebedamento bem-sucedido!*`,
          ``, story,
          `*${robber.name}* roubou *${gem(stolen)}* de ${mention(targetJid)}!`,
          `💳 Saldo: ${gem(updated.gemas)}`,
          `⚠️ ${mention(targetJid)}, podes vingar-te!`,
        ].join('\n'),
        mentions: [targetJid],
      })
    } else {
      const fine = Math.max(8, Math.floor(robber.gemas * (0.15 + Math.random() * 0.10)))
      removeGemas(sender, fine, `🚨 Multa por falhar embebedar ${victim.name}`)
      addGemas(targetJid, fine, `🚨 Multa de ${robber.name}`)
      setRevenge(targetJid, sender, from)
      addXP(sender, 3)
      const story = failStories[Math.floor(Math.random() * failStories.length)]
      const updated = getUser(sender)
      const failCount = (robber.stats?.robFails || 0) + 1
      updateUser(sender, { stats: { ...robber.stats, robFails: failCount } })
      let prisonText = ''
      if (failCount >= 3 && Math.random() < 0.4) {
        updateUser(sender, { prison_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(), stats: { ...robber.stats, robFails: 0 } })
        prisonText = `\n🔒 Detido! Preso por 15 minutos.`
      }
      await sock.sendMessage(from, {
        text: [
          `🚨 *Apanhado!* (Bond7 desperdiçado...)`,
          ``, story + '.',
          `💸 Multa: *-${gem(fine)}*`,
          `💳 Saldo: ${gem(updated.gemas)}`,
          prisonText,
          `⚠️ ${mention(targetJid)}, podes vingar-te!`,
        ].filter(Boolean).join('\n'),
        mentions: [targetJid],
      })
    }
  },
}
