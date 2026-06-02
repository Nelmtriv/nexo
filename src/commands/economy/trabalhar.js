const { getUser, updateUser, addGemas } = require('../../database/users')
const { checkCooldown, formatRemaining } = require('../../utils/cooldown')
const { addXP, getLevelTitle } = require('../../utils/level')
const { checkAndAward } = require('../../utils/achievements')
const { gem, header } = require('../../utils/formatter')

const JOBS = {
  desempregado: { name: '🪑 Desempregado',   pay: [10, 30],   cooldown: 20 * 60 * 1000, level: 1,  xp: 5  },
  ajudante:     { name: '🧹 Ajudante',        pay: [25, 60],   cooldown: 25 * 60 * 1000, level: 3,  xp: 8  },
  minerador:    { name: '⛏️ Minerador',        pay: [40, 90],   cooldown: 30 * 60 * 1000, level: 5,  xp: 12 },
  comerciante:  { name: '🛒 Comerciante',      pay: [60, 130],  cooldown: 45 * 60 * 1000, level: 8,  xp: 18 },
  hacker:       { name: '💻 Hacker',           pay: [80, 180],  cooldown: 60 * 60 * 1000, level: 12, xp: 25 },
  mercenario:   { name: '⚔️ Mercenário',        pay: [120, 250], cooldown: 90 * 60 * 1000, level: 18, xp: 35 },
  empresario:   { name: '💼 Empresário',        pay: [200, 400], cooldown: 4 * 60 * 60 * 1000, level: 25, xp: 50 },
}

const workScenarios = {
  desempregado: ['Fizeste biscatos no bairro', 'Vendeste jornais na esquina', 'Carregaste sacos no mercado'],
  ajudante:     ['Ajudaste a limpar um escritório', 'Carregaste caixas numa loja', 'Entregaste encomendas'],
  minerador:    ['Encontraste um filão de gemas', 'Trabalhaste na mina o dia todo', 'Extraíste cristais raros'],
  comerciante:  ['Fechaste um bom negócio', 'Vendeste mercadoria no mercado negro', 'Lucro numa troca estratégica'],
  hacker:       ['Invadiste um servidor corporativo', 'Encontraste uma vulnerabilidade e foste pago', 'Bug bounty de uma empresa tech'],
  mercenario:   ['Completaste uma missão de alto risco', 'Escoltaste um VIP com sucesso', 'Eliminaste um alvo difícil'],
  empresario:   ['Fechaste um contrato milionário', 'Investimento numa startup deu retorno', 'Dividendos do teu império'],
}

module.exports = {
  name: ['trabalhar', 'trabalho', 'work', 'emprego', 'turno', 'servico', 'trab'],
  description: 'Trabalha para ganhar gemas. Use /emprego para mudar de profissão.',
  category: 'Economia',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const user = getUser(sender, pushName)
    const sub = args[0]?.toLowerCase()

    // /trabalhar empregos — list jobs
    if (sub === 'empregos' || sub === 'lista') {
      const lines = Object.entries(JOBS).map(([id, j]) => {
        const locked = (user.level || 1) < j.level
        return `${locked ? '🔒' : '✅'} *${j.name}* — ${gem(j.pay[0])}-${gem(j.pay[1])} | Nível ${j.level}${locked ? ' (bloqueado)' : ''}`
      })
      await sock.sendMessage(from, {
        text: [header('💼 Empregos Disponíveis'), '', ...lines, '', `Muda com: */trabalhar mudar <emprego>*`].join('\n'),
      }, { quoted: msg })
      return
    }

    // /trabalhar mudar <job>
    if (sub === 'mudar' || sub === 'trocar') {
      const jobId = args[1]?.toLowerCase()
      const job = JOBS[jobId]
      if (!job) {
        await sock.sendMessage(from, {
          text: `❓ Emprego inválido. Use */trabalhar empregos* para ver a lista.`,
        }, { quoted: msg })
        return
      }
      if ((user.level || 1) < job.level) {
        await sock.sendMessage(from, {
          text: `🔒 Precisas do nível *${job.level}* para este emprego. Tens nível ${user.level || 1}.`,
        }, { quoted: msg })
        return
      }
      updateUser(sender, { job: jobId })
      await sock.sendMessage(from, {
        text: `✅ Agora és *${job.name}*!\nPagamento: ${gem(job.pay[0])}-${gem(job.pay[1])} por turno.`,
      }, { quoted: msg })
      return
    }

    // work
    const MAX_WORK = 5
    const today = new Date().toDateString()
    const isNewDay = user.work_today_date !== today
    const workCount = isNewDay ? 0 : (user.work_today_count || 0)

    if (workCount >= MAX_WORK) {
      const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 0)
      await sock.sendMessage(from, {
        text: `😓 *${user.name}*, já trabalhaste *5 vezes hoje*! Estás esgotado.\n⏳ Volta em *${formatRemaining(tomorrow - Date.now())}* (meia-noite).`,
      }, { quoted: msg })
      return
    }

    const jobId = user.job || 'desempregado'
    const job = JOBS[jobId] || JOBS.desempregado

    const earned = Math.floor(Math.random() * (job.pay[1] - job.pay[0] + 1)) + job.pay[0]
    addGemas(sender, earned)
    updateUser(sender, {
      work_today_count: workCount + 1,
      work_today_date: today,
    })

    const { leveledUp, newLevel } = addXP(sender, job.xp)
    const awarded = checkAndAward(sender, 'work', null)

    const scenarios = workScenarios[jobId] || workScenarios.desempregado
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]
    const updated = getUser(sender)

    const turnosHoje = workCount + 1
    const lines = [
      `${job.name} (${turnosHoje}/${MAX_WORK} turnos hoje)`,
      ``,
      `📋 ${scenario}.`,
      `💰 Recebeste *+${gem(earned)}*`,
      `⭐ +${job.xp} XP`,
      ``,
      `💳 Carteira: ${gem(updated.gemas)}`,
      turnosHoje >= MAX_WORK ? `⚠️ Último turno do dia! Volta amanhã.` : ``,
    ].filter(l => l !== '')
    if (leveledUp) lines.push(``, `🎉 *NÍVEL UP!* Agora és nível ${newLevel} — ${getLevelTitle(newLevel)}!`)
    if (awarded.length) lines.push(``, `🏅 Conquista: *${awarded[0].name}*! +${gem(awarded[0].reward)}`)

    await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg })
  },
}
