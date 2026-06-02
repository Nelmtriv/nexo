const { getUser, addGemas, removeGemas, updateUser, setLastRob, setRevenge, hasItem, useItem, addPontos } = require('../../database/users')
const { addXP } = require('../../utils/level')
const { checkAndAward } = require('../../utils/achievements')
const { gem, mention } = require('../../utils/formatter')
const { checkCooldown, formatRemaining } = require('../../utils/cooldown')
const { shop } = require('../../config')

const ROB_COOLDOWN_MS = 10 * 60 * 1000
const MIN_VICTIM_GEMAS = 20
const SUCCESS_RATE = 0.55   // com Bond7 — 55%

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
  name: ['embebedar', 'emb', 'beber', 'bond', 'entortar', 'drogar'],
  description: 'Embebeda a vítima com Bond7 para roubar (55% sucesso). Requer 🍶 Bond7.',
  category: 'Jogos',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (!mentioned?.length) {
      await sock.sendMessage(from, {
        text: [
          `❓ Uso: */embebedar @user*`,
          ``,
          `🍶 Requer *Bond7* — 55% de sucesso`,
          `💡 Sem item usa */roubar* (30% sucesso)`,
          `🛡️ Vítimas com Escudo bloqueiam o ataque!`,
          `Compra Bond7: */loja comprar bond7* (${gem(shop.bond7.price)})`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    const targetJid = mentioned[0]
    if (targetJid === sender) { await sock.sendMessage(from, { text: '😂 Não podes embebedar-te a ti mesmo.' }, { quoted: msg }); return }

    const robber = getUser(sender, pushName)

    if (robber.prison_until && new Date(robber.prison_until) > new Date()) {
      await sock.sendMessage(from, { text: `🔒 Estás na prisão!` }, { quoted: msg }); return
    }

    // require Bond7
    if (!hasItem(sender, 'bond7')) {
      await sock.sendMessage(from, {
        text: [
          `🍶 Precisas de *Bond7* para embebedar!`,
          `Compra na loja: */loja comprar bond7*`,
          `Preço: ${gem(shop.bond7.price)}`,
        ].join('\n'),
      }, { quoted: msg }); return
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

    // check shield — shield blocks even Bond7!
    if (hasItem(targetJid, 'escudo')) {
      useItem(targetJid, 'escudo')
      // Bond7 also consumed (victim refused / was immune)
      useItem(sender, 'bond7')
      setLastRob(sender)
      const fine = Math.max(15, Math.floor(robber.gemas * (0.15 + Math.random() * 0.10)))
      removeGemas(sender, fine, `🛡️ Penalizado por tentar embebedar ${victim.name} (escudo)`)
      addGemas(targetJid, fine, `🛡️ Compensação: ${robber.name} tentou embebedar-te`)
      setRevenge(targetJid, sender, from)
      const shieldLeft = getUser(targetJid).inventory?.escudo || 0
      const updatedRobber = getUser(sender)

      await sock.sendMessage(from, {
        text: [
          `🛡️ *Escudo activado!*`,
          ``,
          `*${robber.name}* tentou embebedar ${mention(targetJid)}, mas o escudo neutralizou o Bond7!`,
          `🍶 Bond7 desperdiçado + 💸 Penalização: *-${gem(fine)}* (pagos a ${mention(targetJid)})`,
          `💳 Saldo: ${gem(updatedRobber.gemas)}`,
          `🛡️ Escudo de ${mention(targetJid)}: ${shieldLeft} bloqueio(s) restantes`,
          ``,
          `⚠️ ${mention(targetJid)}, podes vingar-te em 2h!`,
        ].join('\n'),
        mentions: [targetJid],
      })
      return
    }

    // consume Bond7
    useItem(sender, 'bond7')
    setLastRob(sender)

    const levelAdv = ((robber.level || 1) - (victim.level || 1)) * 0.02
    const rate = Math.min(0.72, Math.max(0.35, SUCCESS_RATE + levelAdv))
    const success = Math.random() < rate

    if (success) {
      const stolen = Math.max(15, Math.floor(victim.gemas * (0.35 + Math.random() * 0.25)))
      removeGemas(targetJid, stolen, `🍶 Embebedado e roubado por ${robber.name}`)
      addGemas(sender, stolen, `🍶 Embebedou e roubou ${victim.name}`)
      setRevenge(targetJid, sender, from)
      addXP(sender, 14); addPontos(sender, 5)
      checkAndAward(sender, 'rob', null)
      const updated = getUser(sender)
      const story = successStories[Math.floor(Math.random() * successStories.length)]

      await sock.sendMessage(from, {
        text: [
          `🍶 *Embebedamento bem-sucedido!*`,
          ``, story,
          `*${robber.name}* roubou *${gem(stolen)}* de ${mention(targetJid)}! 💨`,
          `💳 Saldo: ${gem(updated.gemas)}`,
          ``,
          `⚠️ ${mention(targetJid)}, podes vingar-te em 2h!`,
        ].join('\n'),
        mentions: [targetJid],
      })
    } else {
      const fine = Math.max(8, Math.floor(robber.gemas * (0.15 + Math.random() * 0.10)))
      removeGemas(sender, fine, `🚨 Multa por embebedamento falhado a ${victim.name}`)
      addGemas(targetJid, fine, `🚨 Multa recebida de ${robber.name}`)
      setRevenge(targetJid, sender, from)
      addXP(sender, 3)
      const story = failStories[Math.floor(Math.random() * failStories.length)]
      const updated = getUser(sender)

      const failCount = (robber.stats?.robFails || 0) + 1
      updateUser(sender, { stats: { ...robber.stats, robFails: failCount } })
      let prisonText = ''
      if (failCount >= 3 && Math.random() < 0.4) {
        const prisonMs = 15 * 60 * 1000
        updateUser(sender, { prison_until: new Date(Date.now() + prisonMs).toISOString(), stats: { ...robber.stats, robFails: 0 } })
        prisonText = `\n🔒 Detido! Preso por 15 minutos. (E o Bond7 foi desperdiçado)`
      }

      await sock.sendMessage(from, {
        text: [
          `🚨 *Apanhado!* (Bond7 desperdiçado...)`,
          ``, story + '.',
          `💸 Multa: *-${gem(fine)}* (pagos a ${mention(targetJid)})`,
          `💳 Saldo: ${gem(updated.gemas)}`,
          prisonText,
          ``,
          `⚠️ ${mention(targetJid)}, podes vingar-te em 2h!`,
        ].filter(Boolean).join('\n'),
        mentions: [targetJid],
      })
    }
  },
}
