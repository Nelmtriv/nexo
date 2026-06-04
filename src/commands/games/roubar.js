const { getUser, addGemas, removeGemas, updateUser, setLastRob, setRevenge, hasItem, useItem, addPontos } = require('../../database/users')
const { checkDailyLimit, handleLimitExceeded } = require('../../utils/dailyLimit')
const { addXP } = require('../../utils/level')
const { checkAndAward } = require('../../utils/achievements')
const { gem, mention } = require('../../utils/formatter')
const { checkCooldown, formatRemaining } = require('../../utils/cooldown')

const ROB_COOLDOWN_MS = 8 * 60 * 1000
const MIN_VICTIM_GEMAS = 20
const SUCCESS_RATE = 0.30   // sem item — 30% apenas

const successStories = [
  'Aproveitaste um momento de distracção e agiste rápido',
  'Finta, corrida, fuga. Simples mas eficaz.',
  'Nas sombras da noite, ninguém te viu.',
]
const failStories = [
  'A vítima deu conta imediatamente! Fuga mal sucedida.',
  'Escorregaste na fuga. Que vergonha.',
  'Alguém na rua gritou. Correste, mas perdeste o que levaste.',
]

module.exports = {
  name: ['roubar', 'rob', 'furtar', 'surripiar', 'roubo'],
  description: 'Tenta roubar gemas sem item (30% sucesso). Para maior taxa usa /embebedar.',
  category: 'Jogos',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (!mentioned?.length) {
      await sock.sendMessage(from, {
        text: [
          `❓ Uso: */roubar @user*`,
          ``,
          `⚠️ *Sem item* — 30% de sucesso`,
          `💡 Para maior taxa (55%): */embebedar @user* (requer 🍶 Bond7)`,
          `🛡️ Vítimas com Escudo bloqueiam o ataque!`,
          `• Falha = multa + vítima pode vingar-se`,
          `• Cooldown: 30 min`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    const targetJid = mentioned[0]
    if (targetJid === sender) { await sock.sendMessage(from, { text: '😂 Não podes roubar-te a ti mesmo.' }, { quoted: msg }); return }

    const robber = getUser(sender, pushName)

    const limitResult = checkDailyLimit(sender, 'roubar')
    if (!limitResult.allowed) {
      await handleLimitExceeded(sock, from, msg, sender, robber.name, limitResult)
      return
    }

    if (robber.prison_until && new Date(robber.prison_until) > new Date()) {
      await sock.sendMessage(from, { text: `🔒 Estás na prisão!` }, { quoted: msg }); return
    }

    const { ready, remaining } = checkCooldown(robber.last_rob, ROB_COOLDOWN_MS)
    if (!ready) {
      await sock.sendMessage(from, {
        text: `⏳ Ainda és reconhecido pelas ruas! Espera *${formatRemaining(remaining)}*.`,
      }, { quoted: msg }); return
    }

    const victim = getUser(targetJid)
    if (victim.gemas < MIN_VICTIM_GEMAS) {
      await sock.sendMessage(from, {
        text: `😅 ${mention(targetJid)} não tem gemas suficientes (mínimo ${gem(MIN_VICTIM_GEMAS)}).`,
        mentions: [targetJid],
      }, { quoted: msg }); return
    }

    // check insurance (time-based, 1 use)
    const victimFresh = getUser(targetJid)
    if (victimFresh.insurance_until && new Date(victimFresh.insurance_until) > new Date()) {
      const { getData, save } = require('../../database/db')
      const db = getData()
      db.users[targetJid].insurance_until = null
      db.users[sender].gemas = Math.max(0, (db.users[sender].gemas || 0) - Math.floor(robber.gemas * 0.15))
      save()
      setLastRob(sender)
      setRevenge(targetJid, sender, from)
      const updR = getUser(sender)
      await sock.sendMessage(from, {
        text: [
          `🔐 *Seguro activado!*`,
          ``,
          `*${robber.name}* tentou roubar ${mention(targetJid)}, mas o seguro bloqueou e activou um contra-ataque!`,
          `💸 Penalização: *-${gem(Math.floor(robber.gemas * 0.15))}*`,
          `💳 Saldo: ${gem(updR.gemas)}`,
          ``,
          `⚠️ ${mention(targetJid)}, podes vingar-te quando quiseres!`,
        ].join('\n'),
        mentions: [targetJid],
      }); return
    }

    // check shield
    if (hasItem(targetJid, 'escudo')) {
      useItem(targetJid, 'escudo')
      setLastRob(sender)
      const fine = Math.max(10, Math.floor(robber.gemas * (0.12 + Math.random() * 0.08)))
      removeGemas(sender, fine, `🛡️ Penalizado por tentar roubar ${victim.name} (escudo)`)
      addGemas(targetJid, fine, `🛡️ Compensação: ${robber.name} tentou roubar-te`)
      setRevenge(targetJid, sender, from)
      const shieldLeft = getUser(targetJid).inventory?.escudo || 0
      const updatedRobber = getUser(sender)
      await sock.sendMessage(from, {
        text: [
          `🛡️ *Escudo activado!*`,
          ``,
          `*${robber.name}* tentou roubar ${mention(targetJid)}, mas o escudo bloqueou o ataque!`,
          `💸 Penalização: *-${gem(fine)}* (pagos a ${mention(targetJid)})`,
          `💳 Saldo: ${gem(updatedRobber.gemas)}`,
          `🛡️ Escudo de ${mention(targetJid)}: ${shieldLeft} bloqueio(s) restantes`,
          ``,
          `⚠️ ${mention(targetJid)}, podes vingar-te quando quiseres!`,
        ].join('\n'),
        mentions: [targetJid],
      })
      return
    }

    setLastRob(sender)
    const levelAdv = ((robber.level || 1) - (victim.level || 1)) * 0.02
    const rate = Math.min(0.50, Math.max(0.15, SUCCESS_RATE + levelAdv))
    const success = Math.random() < rate

    if (success) {
      const stolen = Math.max(10, Math.floor(victim.gemas * (0.25 + Math.random() * 0.20)))
      removeGemas(targetJid, stolen, `🦹 Roubado por ${robber.name}`)
      addGemas(sender, stolen, `🦹 Roubou ${victim.name}`)
      setRevenge(targetJid, sender, from)
      addXP(sender, 10); addPontos(sender, 3)
      checkAndAward(sender, 'rob', null)
      const updated = getUser(sender)
      const story = successStories[Math.floor(Math.random() * successStories.length)]

      await sock.sendMessage(from, {
        text: [
          `🦹 *Roubo bem-sucedido!* (sem item)`,
          ``, story + '.',
          `*${robber.name}* roubou *${gem(stolen)}* de ${mention(targetJid)}!`,
          `💳 Saldo: ${gem(updated.gemas)}`,
          `⚠️ ${mention(targetJid)}, podes vingar-te quando quiseres!`,
        ].join('\n'),
        mentions: [targetJid],
      })
    } else {
      const fine = Math.max(5, Math.floor(robber.gemas * (0.12 + Math.random() * 0.08)))
      removeGemas(sender, fine, `🚨 Multa por roubo falhado a ${victim.name}`)
      addGemas(targetJid, fine, `🚨 Multa recebida de ${robber.name}`)
      setRevenge(targetJid, sender, from)
      addXP(sender, 2)
      const story = failStories[Math.floor(Math.random() * failStories.length)]
      const updated = getUser(sender)

      const failCount = (robber.stats?.robFails || 0) + 1
      updateUser(sender, { stats: { ...robber.stats, robFails: failCount } })
      let prisonText = ''
      if (failCount >= 3 && Math.random() < 0.4) {
        const prisonMs = 10 * 60 * 1000
        updateUser(sender, { prison_until: new Date(Date.now() + prisonMs).toISOString(), stats: { ...robber.stats, robFails: 0 } })
        prisonText = `\n🔒 Detido! Preso por 10 minutos.`
      }

      await sock.sendMessage(from, {
        text: [
          `🚨 *Apanhado!*`, ``, story + '.',
          `💸 Multa: *-${gem(fine)}* (pagos a ${mention(targetJid)})`,
          `💳 Saldo: ${gem(updated.gemas)}`,
          prisonText,
          `⚠️ ${mention(targetJid)}, podes vingar-te quando quiseres!`,
        ].filter(Boolean).join('\n'),
        mentions: [targetJid],
      })
    }
  },
}
