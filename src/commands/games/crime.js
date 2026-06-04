const { getUser, updateUser, addGemas, removeGemas, addPontos, bankHeist } = require('../../database/users')
const { checkDailyLimit, handleLimitExceeded, usageFooter } = require('../../utils/dailyLimit')
const { checkCooldown, formatRemaining } = require('../../utils/cooldown')
const { addXP } = require('../../utils/level')
const { checkAndAward } = require('../../utils/achievements')
const { gem } = require('../../utils/formatter')

const CRIME_COOLDOWN_MS = 15 * 60 * 1000

const CRIMES = [
  {
    id: 'furto',
    name: '🕵️ Furto Simples',
    desc: 'Roubar uma carteira numa praça movimentada',
    successRate: 0.70,
    reward: [80, 200],
    fine: [20, 60],
    prisonMin: 0,
    xp: 8,
    successStories: [
      'Mergulhaste na multidão e saíste com uma carteira gorda',
      'Distraíste a vítima e levaste o que precisavas',
      'Execução perfeita. Ninguém te viu.',
    ],
    failStories: [
      'A vítima sentiu a tua mão no bolso! Apanhado!',
      'Uma câmara de segurança registou tudo',
      'Um policial estava mesmo ao lado. Péssimo timing.',
    ],
  },
  {
    id: 'assalto',
    name: '🔫 Assalto',
    desc: 'Assaltar uma loja com arma de pressão',
    successRate: 0.55,
    reward: [250, 500],
    fine: [60, 120],
    prisonMin: 15 * 60 * 1000,
    xp: 15,
    successStories: [
      'Entraste, apontaste, saíste. Limpo e rápido.',
      'A caixeira ficou em pânico. Levaste tudo e fugiste.',
      'Em 30 segundos fizeste fortuna.',
    ],
    failStories: [
      'O segurança deu sinal de alarme antes que te virasses',
      'A polícia chegou muito rápido. Foste rodeado.',
      'A arma de pressão não convenceu ninguém. Detido.',
    ],
  },
  {
    id: 'fraude',
    name: '💳 Fraude Bancária',
    desc: 'Clonar cartões e aceder a contas bancárias',
    successRate: 0.45,
    reward: [500, 900],
    fine: [100, 200],
    prisonMin: 30 * 60 * 1000,
    xp: 25,
    successStories: [
      'Clonaste com sucesso vários cartões. Transferências feitas.',
      'O sistema bancário tinha uma brecha. Exploraste-a.',
      'Phishing de elite. Acedeste a contas sem levantar suspeitas.',
    ],
    failStories: [
      'O sistema de segurança bloqueou a tua tentativa e alertou as autoridades',
      'Um especialista em cibersegurança rastreou o teu IP',
      'A transação foi marcada como suspeita. Estás exposto.',
    ],
  },
  {
    id: 'roubo_armado',
    name: '🏦 Roubo a Banco',
    desc: 'Assaltar um banco com uma equipa',
    successRate: 0.30,
    reward: [1000, 2500],
    fine: [200, 500],
    prisonMin: 60 * 60 * 1000,
    xp: 50,
    successStories: [
      'Plano executado na perfeição. Cofre aberto, dinheiro assegurado.',
      'Entraste pelo telhado, saíste pela saída de emergência. Lendário.',
      'Equipa sincronizada ao segundo. A maior operação da cidade.',
    ],
    failStories: [
      'A polícia foi alertada antes mesmo de chegares. Armadilha!',
      'O sistema de segurança biométrico bloqueou o cofre',
      'Alguém da equipa cantou. Foste o primeiro a ser apanhado.',
    ],
  },
]

module.exports = {
  name: ['crime', 'cometer', 'crimes', 'delito', 'criminoso', 'cr'],
  description: 'Comete um crime para ganhar gemas (risco de prisão!)',
  category: 'Jogos',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const user = getUser(sender, pushName)

    // check prison
    if (user.prison_until && new Date(user.prison_until) > new Date()) {
      const remaining = new Date(user.prison_until).getTime() - Date.now()
      await sock.sendMessage(from, {
        text: `🔒 *${user.name}*, estás na prisão!\nSaes em *${formatRemaining(remaining)}*.\n\nUsa */fianca* para sair mais cedo!`,
      }, { quoted: msg }); return
    }

    // list crimes
    const sub = args[0]?.toLowerCase()
    if (!sub || sub === 'lista') {
      const lines = CRIMES.map((c, i) =>
        `*${i + 1}.* ${c.name}\n   └ Chance: ${Math.round(c.successRate * 100)}% | 💎 ${c.reward[0]}-${c.reward[1]} | ${c.prisonMin > 0 ? `⚠️ Prisão possível` : `✅ Sem prisão`}`
      )
      await sock.sendMessage(from, {
        text: [`🦹 *Crimes Disponíveis*`, ``, ...lines, ``, `Usa: */crime <número>*`].join('\n'),
      }, { quoted: msg }); return
    }

    const crimeIndex = parseInt(sub) - 1
    if (isNaN(crimeIndex) || crimeIndex < 0 || crimeIndex >= CRIMES.length) {
      await sock.sendMessage(from, { text: `❓ Usa */crime lista* para ver os crimes disponíveis.` }, { quoted: msg }); return
    }

    const limitResult = checkDailyLimit(sender, 'crime')
    if (!limitResult.allowed) {
      await handleLimitExceeded(sock, from, msg, sender, user.name, limitResult)
      return
    }

    const { ready, remaining } = checkCooldown(user.last_crime, CRIME_COOLDOWN_MS)
    if (!ready) {
      await sock.sendMessage(from, {
        text: `⏳ Ainda és muito reconhecível pelas ruas. Espera *${formatRemaining(remaining)}*.`,
      }, { quoted: msg }); return
    }

    const crime = CRIMES[crimeIndex]
    updateUser(sender, { last_crime: new Date().toISOString() })

    const success = Math.random() < crime.successRate

    if (success) {
      const earned = Math.floor(Math.random() * (crime.reward[1] - crime.reward[0] + 1)) + crime.reward[0]

      let actualEarned = earned
      let heistInfo = null

      if (crime.id === 'roubo_armado') {
        heistInfo = bankHeist(sender, earned)
        actualEarned = heistInfo.stolen
      } else {
        addGemas(sender, earned, `🦹 ${crime.name} — sucesso`)
      }

      addPontos(sender, crime.xp)
      const { leveledUp, newLevel } = addXP(sender, crime.xp)
      const awarded = checkAndAward(sender, 'crime', null)
      checkAndAward(sender, 'gemas', null)
      const updated = getUser(sender)

      const story = crime.successStories[Math.floor(Math.random() * crime.successStories.length)]
      const lines = [
        `✅ *${crime.name} — SUCESSO!*`,
        ``,
        `📖 ${story}.`,
        ``,
      ]

      if (heistInfo) {
        if (heistInfo.stolen === 0) {
          lines.push(`💸 Os bancos do grupo estavam vazios! Não conseguiste roubar nada.`)
        } else {
          lines.push(`💎 Roubaste *+${gem(heistInfo.stolen)}* dos bancos do grupo!`)
          lines.push(`👥 *${heistInfo.victims}* poupança(s) afectada(s) (−${gem(heistInfo.sharePerPerson)} cada)`)
        }
      } else {
        lines.push(`💎 Ganhou: *+${gem(actualEarned)}*`)
      }

      lines.push(`⭐ +${crime.xp} XP`, `💳 Saldo: ${gem(updated.gemas)}`)
      if (leveledUp) lines.push(``, `🎉 *NÍVEL UP!* Nível ${newLevel}!`)
      if (awarded.length) lines.push(``, `🏅 Conquista: *${awarded[0].name}*!`)
      if (usageFooter(limitResult)) lines.push(``, usageFooter(limitResult))

      await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg })
    } else {
      const fine = Math.floor(Math.random() * (crime.fine[1] - crime.fine[0] + 1)) + crime.fine[0]
      removeGemas(sender, fine, `🚨 ${crime.name} — multado`)

      let prisonText = ''
      if (crime.prisonMin > 0) {
        const extra = Math.floor(Math.random() * crime.prisonMin)
        const prisonMs = crime.prisonMin + extra
        const until = new Date(Date.now() + prisonMs).toISOString()
        updateUser(sender, { prison_until: until })
        prisonText = `\n🔒 Foste preso por *${formatRemaining(prisonMs)}*!\nUsa */fianca* para sair mais cedo.`
      }

      const updated = getUser(sender)
      const story = crime.failStories[Math.floor(Math.random() * crime.failStories.length)]

      await sock.sendMessage(from, {
        text: [
          `🚨 *${crime.name} — FALHADO!*`,
          ``,
          `📖 ${story}.`,
          ``,
          `💸 Multa: *-${gem(fine)}*`,
          `💳 Saldo: ${gem(updated.gemas)}`,
          prisonText,
        ].filter(Boolean).join('\n'),
      }, { quoted: msg })
    }
  },
}
