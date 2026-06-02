const { getUser, addGemas, removeGemas, addWin, addLoss, addPontos, getActiveGame, saveActiveGame, deleteActiveGame } = require('../../database/users')
const { addXP } = require('../../utils/level')
const { checkAndAward } = require('../../utils/achievements')
const { gem } = require('../../utils/formatter')
const { games } = require('../../config')

const ENTRY_FEE = 5

const WORDS = [
  { word: 'fotossintese',   hint: 'Processo pelo qual as plantas produzem energia usando luz solar, água e CO₂' },
  { word: 'gravitacao',     hint: 'Força que atrai corpos com massa entre si, descrita por Newton na sua lei universal' },
  { word: 'evaporacao',     hint: 'Passagem de um líquido para o estado gasoso à superfície, sem atingir o ponto de ebulição' },
  { word: 'metamorfose',    hint: 'Transformação completa de um organismo, como a lagarta que se torna borboleta' },
  { word: 'ecosistema',     hint: 'Conjunto de seres vivos e o ambiente físico em que interagem numa determinada região' },
  { word: 'erupcao',        hint: 'Expulsão violenta de lava, gases e cinzas por um vulcão' },
  { word: 'terremoto',      hint: 'Tremor da crosta terrestre causado pelo movimento de placas tectónicas' },
  { word: 'clorofila',      hint: 'Pigmento verde presente nas plantas responsável pela absorção de luz solar' },
  { word: 'democracia',     hint: 'Sistema político em que o poder emana do povo, que governa direta ou por representação' },
  { word: 'revolucao',      hint: 'Mudança radical e rápida numa sociedade, normalmente por meios violentos ou políticos' },
  { word: 'respiracao',     hint: 'Processo biológico de troca de gases onde o oxigénio é absorvido e o CO₂ é libertado' },
  { word: 'digestao',       hint: 'Processo de decomposição dos alimentos no organismo para absorção de nutrientes' },
  { word: 'combustao',      hint: 'Reação química entre uma substância e oxigénio que produz calor e luz' },
  { word: 'translacao',     hint: 'Movimento da Terra em torno do Sol que dura aproximadamente 365 dias' },
  { word: 'rotacao',        hint: 'Movimento da Terra em torno do seu próprio eixo que determina o dia e a noite' },
  { word: 'hibernacao',     hint: 'Estado de torpor prolongado de alguns animais durante o inverno para conservar energia' },
  { word: 'condensacao',    hint: 'Passagem do estado gasoso para o líquido, como as gotas de água num copo frio' },
  { word: 'magnetismo',     hint: 'Fenômeno físico de atração e repulsão entre materiais como o ferro e o ímã' },
  { word: 'corrosao',       hint: 'Degradação de um material por reação química com o ambiente, como a ferrugem' },
  { word: 'herbivoro',      hint: 'Animal que se alimenta exclusivamente de plantas e vegetais' },
  { word: 'carnivoro',      hint: 'Animal que se alimenta de outros animais como principal fonte de energia' },
  { word: 'onivoro',        hint: 'Animal que consome tanto plantas como outros animais na sua dieta' },
  { word: 'predador',       hint: 'Animal que caça e mata outros animais para se alimentar' },
  { word: 'microorganismo', hint: 'Ser vivo microscópico, como bactérias, vírus e fungos, invisível a olho nu' },
  { word: 'antibiotico',    hint: 'Substância medicamentosa que elimina ou inibe o crescimento de bactérias' },
  { word: 'vacina',         hint: 'Preparado biológico que estimula o sistema imunológico a criar defesas contra doenças' },
  { word: 'cromossomo',     hint: 'Estrutura no núcleo da célula que contém o material genético (ADN) do organismo' },
  { word: 'mutacao',        hint: 'Alteração permanente no ADN de um organismo, podendo ser hereditária' },
  { word: 'evolucao',       hint: 'Processo de mudança gradual das espécies ao longo de gerações por seleção natural' },
  { word: 'continente',     hint: 'Grande extensão contínua de terra. Existem sete no planeta Terra' },
  { word: 'peninsula',      hint: 'Extensão de terra rodeada de água por quase todos os lados, exceto num ponto' },
  { word: 'archipelago',    hint: 'Conjunto de ilhas agrupadas no oceano, como os Açores e as Canárias' },
  { word: 'planalto',       hint: 'Extensão de terra elevada com superfície relativamente plana, também chamado de platô' },
  { word: 'tributario',     hint: 'Rio secundário que desagua noutro rio principal, aumentando o seu caudal' },
  { word: 'republica',      hint: 'Forma de governo em que o chefe de Estado é eleito e tem mandato limitado' },
  { word: 'constituicao',   hint: 'Lei fundamental de um país que define os direitos dos cidadãos e a organização do Estado' },
  { word: 'colonialismo',   hint: 'Sistema pelo qual países poderosos dominaram e exploraram territórios de outros povos' },
  { word: 'escravatura',    hint: 'Sistema social em que seres humanos eram tratados como propriedade de outros' },
  { word: 'industria',      hint: 'Setor da economia responsável pela produção de bens através de máquinas e fábricas' },
  { word: 'tecnologia',     hint: 'Conjunto de conhecimentos e ferramentas criadas pelo homem para resolver problemas' },
  { word: 'algoritmo',      hint: 'Sequência finita de instruções lógicas para resolver um problema ou realizar uma tarefa' },
  { word: 'percentagem',    hint: 'Proporção por cento; forma de expressar uma parte em relação a 100 unidades totais' },
  { word: 'estatistica',    hint: 'Ciência que recolhe, analisa e interpreta dados numéricos de populações ou amostras' },
  { word: 'hipotese',       hint: 'Suposição provisória que serve de base para uma investigação científica' },
  { word: 'experimento',    hint: 'Teste controlado realizado para confirmar ou refutar uma hipótese científica' },
  { word: 'oxigenio',       hint: 'Elemento químico (O₂) essencial para a respiração dos seres vivos e para a combustão' },
  { word: 'nitrogenio',     hint: 'Gás mais abundante na atmosfera terrestre, essencial para proteínas e ADN' },
  { word: 'gravitacional',  hint: 'Relativo à força de atração entre corpos com massa; ex: campo gravitacional terrestre' },
  { word: 'eletricidade',   hint: 'Forma de energia relacionada com cargas elétricas em movimento ou em repouso' },
  { word: 'magnetico',      hint: 'Relativo ao magnetismo; campo que exerce forças sobre materiais ferromagnéticos' },
]

function renderProgress(word, guessed) {
  return word.split('').map(c => (guessed.includes(c) ? `*${c}*` : '\\_')).join(' ')
}

function calcReward(lettersUsed) {
  return Math.max(5, games.forcaBase - lettersUsed * games.forcaPenalty)
}

module.exports = {
  name: ['forca', 'hangman', 'palavra', 'adivinhar', 'fc'],
  description: 'Jogo da Forca educativo. Descobre a palavra com base na dica!',
  category: 'Jogos',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const user = getUser(sender, pushName)
    const existing = getActiveGame(from, 'forca')

    // --- Guess a WORD (more than 1 char) ---
    if (existing && args.length >= 1 && args[0].length > 1) {
      const guess = args.join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      const state = existing.state
      const normalizedWord = state.word.normalize('NFD').replace(/[̀-ͯ]/g, '')

      if (guess === normalizedWord) {
        // correct — win with bonus
        deleteActiveGame(from, 'forca')
        const reward = calcReward(state.lettersUsed || 0) + 15  // +15 bonus for guessing full word
        addGemas(sender, reward)
        addWin(sender)
        addPontos(sender, 15)
        const { leveledUp, newLevel } = addXP(sender, 20)
        const awarded = checkAndAward(sender, 'win', null)
        const updated = getUser(sender)

        const lines = [
          `🎯 *${user.name}* adivinhou a palavra inteira!`,
          `📖 Palavra: *${state.word.toUpperCase()}*`,
          ``,
          `💎 Recompensa: *+${gem(reward)}* (+15 bónus por arriscar!)`,
          `🏅 +15 pontos`,
          `💳 Saldo: ${gem(updated.gemas)}`,
        ]
        if (leveledUp) lines.push(`🎉 NÍVEL UP! → ${newLevel}`)
        if (awarded.length) lines.push(`🏅 Conquista: *${awarded[0].name}*!`)

        await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg })
      } else {
        // wrong — game over immediately
        deleteActiveGame(from, 'forca')
        const fee = Math.min(user.gemas, ENTRY_FEE + 5)
        removeGemas(sender, fee)
        addLoss(sender)
        addXP(sender, 2)
        const updated = getUser(sender)

        await sock.sendMessage(from, {
          text: [
            `💥 *${user.name}* arriscou a palavra e errou!`,
            `❌ Tentativa: *${guess.toUpperCase()}*`,
            `📖 A palavra era: *${state.word.toUpperCase()}*`,
            ``,
            `⚠️ Errar a palavra encerra o jogo!`,
            `💸 -${gem(fee)} | Saldo: ${gem(updated.gemas)}`,
          ].join('\n'),
        }, { quoted: msg })
      }
      return
    }

    // --- Guess a LETTER (single char) ---
    if (existing && args.length === 1 && /^[a-zA-ZÀ-ú]$/.test(args[0])) {
      const letter = args[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      const state = existing.state
      const normalizedWord = state.word.normalize('NFD').replace(/[̀-ͯ]/g, '')

      if (state.guessed.includes(letter)) {
        await sock.sendMessage(from, { text: `❕ A letra *${letter}* já foi tentada!` }, { quoted: msg }); return
      }

      state.guessed.push(letter)
      state.lettersUsed = (state.lettersUsed || 0) + 1

      const isCorrect = normalizedWord.includes(letter)
      if (!isCorrect) state.errors++

      const progress = renderProgress(normalizedWord, state.guessed)
      const won = !progress.includes('\\_')
      const lost = state.errors >= 6
      const reward = calcReward(state.lettersUsed)

      if (won) {
        deleteActiveGame(from, 'forca')
        addGemas(sender, reward)
        addWin(sender)
        addPontos(sender, 10)
        const { leveledUp, newLevel } = addXP(sender, 15)
        const awarded = checkAndAward(sender, 'win', null)
        const updated = getUser(sender)

        const lines = [
          `🎉 *${user.name}* descobriu a palavra!`,
          `📖 Palavra: *${state.word.toUpperCase()}*`,
          ``,
          `💎 Recompensa: *+${gem(reward)}*`,
          `  (${state.lettersUsed} letras usadas — quanto menos, mais gemas!)`,
          `🏅 +10 pontos`,
          `💳 Saldo: ${gem(updated.gemas)}`,
        ]
        if (leveledUp) lines.push(`🎉 NÍVEL UP! → ${newLevel}`)
        if (awarded.length) lines.push(`🏅 Conquista: *${awarded[0].name}*!`)

        await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg })
        return
      }

      if (lost) {
        deleteActiveGame(from, 'forca')
        const fee = Math.min(user.gemas, ENTRY_FEE)
        removeGemas(sender, fee)
        addLoss(sender)
        addXP(sender, 3)
        const updated = getUser(sender)

        await sock.sendMessage(from, {
          text: [
            `💀 *Game Over!* Esgotaste as 6 tentativas.`,
            `📖 A palavra era: *${state.word.toUpperCase()}*`,
            `💡 Dica: ${state.hint}`,
            ``,
            `💸 -${gem(fee)} | Saldo: ${gem(updated.gemas)}`,
          ].join('\n'),
        }, { quoted: msg })
        return
      }

      saveActiveGame(from, 'forca', sender, state)

      await sock.sendMessage(from, {
        text: [
          `🔤 *Jogo da Forca*`,
          `💡 *Dica:* ${state.hint}`,
          ``,
          `📝 ${progress}  (${state.word.length} letras)`,
          ``,
          `❌ Erros: ${'●'.repeat(state.errors)}${'○'.repeat(6 - state.errors)} (${state.errors}/6)`,
          `🔠 Tentadas: ${state.guessed.join(' ') || '—'}`,
          ``,
          `💎 Prémio atual: *${gem(reward)}* (−${gem(games.forcaPenalty)} por letra)`,
          ``,
          `➡️ */fc <letra>* ou */fc <palavra inteira>* (se errar, jogo acaba!)`,
        ].join('\n'),
      }, { quoted: msg })
      return
    }

    // --- Show current game ---
    if (existing && !args.length) {
      const state = existing.state
      const normalizedWord = state.word.normalize('NFD').replace(/[̀-ͯ]/g, '')
      const progress = renderProgress(normalizedWord, state.guessed)
      await sock.sendMessage(from, {
        text: [
          `🔤 *Jogo da Forca em curso*`,
          `💡 *Dica:* ${state.hint}`,
          ``,
          `📝 ${progress}  (${state.word.length} letras)`,
          ``,
          `❌ Erros: ${'●'.repeat(state.errors)}${'○'.repeat(6 - state.errors)} (${state.errors}/6)`,
          `🔠 Tentadas: ${state.guessed.join(' ') || '—'}`,
          `💎 Prémio atual: *${gem(calcReward(state.lettersUsed || 0))}*`,
          ``,
          `➡️ */fc <letra>* ou */fc <palavra inteira>*`,
        ].join('\n'),
      }, { quoted: msg })
      return
    }

    // --- Start new game ---
    if (existing) {
      await sock.sendMessage(from, { text: `❕ Já há um jogo da forca em curso!\n*/fc <letra>* — chutar letra\n*/fc <palavra>* — arriscar tudo!` }, { quoted: msg }); return
    }

    if (user.gemas < ENTRY_FEE) {
      await sock.sendMessage(from, { text: `❌ Precisas de ${gem(ENTRY_FEE)} para entrar no jogo.` }, { quoted: msg }); return
    }

    const entry = WORDS[Math.floor(Math.random() * WORDS.length)]
    saveActiveGame(from, 'forca', sender, {
      word: entry.word,
      hint: entry.hint,
      guessed: [],
      errors: 0,
      lettersUsed: 0,
    })

    const normalizedWord = entry.word.normalize('NFD').replace(/[̀-ͯ]/g, '')
    const progress = renderProgress(normalizedWord, [])

    await sock.sendMessage(from, {
      text: [
        `🔤 *Jogo da Forca!*`,
        `💡 *Dica:* ${entry.hint}`,
        ``,
        `📝 ${progress}  (${entry.word.length} letras)`,
        ``,
        `❌ Erros: ○○○○○○ (0/6)`,
        ``,
        `💎 Prémio máx: *${gem(games.forcaBase)}* (perde ${gem(games.forcaPenalty)} por letra)`,
        `💰 Entrada: ${gem(ENTRY_FEE)}`,
        ``,
        `➡️ */fc <letra>* — chutar letra`,
        `➡️ */fc <palavra>* — arriscar palavra inteira (+15💎 bónus, mas se errar o jogo acaba!)`,
      ].join('\n'),
    }, { quoted: msg })
  },
}
