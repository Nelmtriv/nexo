const { getUser, addGemas, removeGemas, addWin, addLoss, addPontos, getActiveGame, saveActiveGame, deleteActiveGame } = require('../../database/users')
const { addXP } = require('../../utils/level')
const { checkAndAward } = require('../../utils/achievements')
const { gem } = require('../../utils/formatter')
const { games } = require('../../config')
const { checkDailyLimit, handleLimitExceeded } = require('../../utils/dailyLimit')

const ENTRY_FEE = 5

const WORDS = [
  // Mitologia e história
  { word: 'labirinto',      hint: 'Construção com corredores entrelaçados de onde é difícil sair; na mitologia grega, prendia o Minotauro' },
  { word: 'minotauro',      hint: 'Criatura mitológica com corpo de homem e cabeça de touro, presa num labirinto em Creta' },
  { word: 'oligarquia',     hint: 'Sistema político em que o poder é exercido por um pequeno grupo de pessoas privilegiadas' },
  { word: 'feudalismo',     hint: 'Sistema medieval em que senhores cediam terras a vassalos em troca de serviço e lealdade' },
  { word: 'absolutismo',    hint: 'Regime político em que o monarca detém poder total e ilimitado sobre o Estado' },
  { word: 'iluminismo',     hint: 'Movimento filosófico do século XVIII que valorizava a razão, a ciência e os direitos humanos' },
  { word: 'apartheid',      hint: 'Sistema de segregação racial que vigorou na África do Sul entre 1948 e 1994' },
  { word: 'ditadura',       hint: 'Sistema político em que o poder é exercido por uma única pessoa de forma autoritária' },
  // Física e óptica
  { word: 'refracao',       hint: 'Mudança de direcção da luz ao passar de um meio para outro com diferente densidade óptica' },
  { word: 'difracao',       hint: 'Fenómeno em que ondas de luz ou som se curvam ao passar por uma abertura ou obstáculo' },
  { word: 'polarizacao',    hint: 'Fenómeno em que as oscilações de uma onda ficam restritas a um único plano' },
  { word: 'interferencia',  hint: 'Fenómeno em que duas ondas se sobrepõem e se reforçam ou anulam mutuamente' },
  { word: 'capacitor',      hint: 'Componente electrónico que armazena energia na forma de campo eléctrico entre duas placas' },
  { word: 'inducao',        hint: 'Fenómeno pelo qual uma corrente eléctrica é gerada pela variação de um campo magnético próximo' },
  { word: 'paralaxe',       hint: 'Diferença aparente na posição de um objecto quando observado de dois pontos distintos' },
  // Arquitectura
  { word: 'catedral',       hint: 'Igreja cristã principal de uma diocese, onde reside o bispo, geralmente de grandes dimensões' },
  { word: 'basilica',       hint: 'Edifício religioso de planta rectangular com naves; originalmente um espaço público romano' },
  { word: 'mosaico',        hint: 'Arte decorativa criada com pequenas peças coloridas de vidro, pedra ou cerâmica encaixadas' },
  { word: 'abobada',        hint: 'Estrutura arquitectónica curva em arco usada para cobrir espaços interiores de edifícios' },
  { word: 'minarete',       hint: 'Torre alta e estreita de uma mesquita de onde o muezim chama os fiéis à oração' },
  // Matemática
  { word: 'hipotenusa',     hint: 'Lado oposto ao ângulo recto num triângulo rectângulo; sempre o maior dos três lados' },
  { word: 'circunferencia', hint: 'Linha curva fechada em que todos os pontos estão exactamente à mesma distância do centro' },
  { word: 'parabola',       hint: 'Curva simétrica formada pela trajectória de um projéctil ou pela secção cónica de um cone' },
  { word: 'elipse',         hint: 'Curva oval com dois focos; os planetas descrevem elipses em torno do Sol' },
  // Linguagem e retórica
  { word: 'hiperbole',      hint: 'Figura de linguagem que exagera intencionalmente para criar impacto. Ex: "Estou morto de fome"' },
  { word: 'ironia',         hint: 'Figura de linguagem em que se diz o contrário do que se pensa, com efeito crítico ou humorístico' },
  { word: 'sinestesia',     hint: 'Figura de linguagem que mistura sensações de sentidos diferentes. Ex: "perfume estridente"' },
  { word: 'eufemismo',      hint: 'Expressão mais suave usada para substituir outra considerada ofensiva ou desagradável' },
  { word: 'antitese',       hint: 'Figura de linguagem que coloca ideias opostas em paralelo. Ex: "Amor é fogo que arde sem se ver"' },
  { word: 'polissemia',     hint: 'Propriedade de uma palavra ter múltiplos significados, como "manga" (fruta ou parte da roupa)' },
  // Biologia avançada
  { word: 'crustaceo',      hint: 'Animal artrópode com exoesqueleto duro e rígido, como caranguejos, lagostas e camarões' },
  { word: 'molusco',        hint: 'Animal de corpo mole geralmente protegido por concha, como caracóis, lulas e polvos' },
  { word: 'vertebrado',     hint: 'Animal que possui coluna vertebral interna, como peixes, répteis, aves e mamíferos' },
  { word: 'invertebrado',   hint: 'Animal sem coluna vertebral; representa mais de 95% das espécies animais conhecidas' },
  { word: 'taxonomia',      hint: 'Ciência que classifica e nomeia os seres vivos em categorias como reino, família e espécie' },
  { word: 'genoma',         hint: 'Conjunto completo de informação genética de um organismo, contida no seu ADN' },
  { word: 'fenotipo',       hint: 'Conjunto das características físicas visíveis de um organismo resultantes dos seus genes e ambiente' },
  { word: 'quarentena',     hint: 'Período de isolamento imposto para prevenir a propagação de doenças contagiosas' },
  { word: 'epidemia',       hint: 'Ocorrência de uma doença infecciosa em número anormalmente elevado numa região específica' },
  { word: 'imunidade',      hint: 'Capacidade do organismo de resistir a agentes infecciosos graças ao sistema imunológico' },
  { word: 'hemoglobina',    hint: 'Proteína nos glóbulos vermelhos que transporta oxigénio dos pulmões para os tecidos do corpo' },
  // Tecnologia e informática
  { word: 'criptografia',   hint: 'Técnica de codificar informação para que apenas destinatários autorizados a possam ler' },
  { word: 'protocolo',      hint: 'Conjunto de regras que define como os computadores comunicam e trocam dados numa rede' },
  { word: 'resolucao',      hint: 'Número de píxeis numa imagem digital; quanto maior, mais nítida e detalhada é a imagem' },
  { word: 'compressao',     hint: 'Processo de reduzir o tamanho de ficheiros digitais sem perder a informação essencial' },
  // Economia
  { word: 'inflacao',       hint: 'Aumento generalizado e contínuo dos preços de bens e serviços ao longo do tempo' },
  { word: 'deflacao',       hint: 'Queda generalizada dos preços numa economia, geralmente associada a falta de procura' },
  { word: 'dividendo',      hint: 'Parte do lucro de uma empresa distribuída proporcionalmente aos seus accionistas' },
  { word: 'recessao',       hint: 'Período de declínio económico prolongado, com redução do PIB e aumento do desemprego' },
  // Gastronomia e ciência dos alimentos
  { word: 'caramelizacao',  hint: 'Reacção química ao aquecer açúcar que lhe dá cor dourada e sabor intenso característico' },
  { word: 'pasteurizacao',  hint: 'Processo de aquecimento a temperatura controlada para eliminar microrganismos nocivos em alimentos' },
  { word: 'emulsao',        hint: 'Mistura estável de dois líquidos que normalmente não se misturam, como água e gordura na maionese' },
  // Ecologia e ambiente
  { word: 'ecotono',        hint: 'Zona de transição entre dois ecossistemas distintos, com características e espécies de ambos' },
  { word: 'decomposicao',   hint: 'Processo pelo qual bactérias e fungos decompõem matéria orgânica morta em nutrientes minerais' },
  { word: 'estuario',       hint: 'Zona costeira onde um rio encontra o mar, com mistura de água doce e salgada' },
  { word: 'biodiversidade', hint: 'Variedade total de formas de vida num ecossistema, incluindo espécies, genes e habitats' },
  // Arte e cultura
  { word: 'surrealismo',    hint: 'Movimento artístico do século XX que explorava o subconsciente e os sonhos, como nas obras de Dalí' },
  { word: 'impressionismo', hint: 'Movimento pictórico francês do século XIX focado na captação de luz e momento, como nas obras de Monet' },
  { word: 'arquitetura',    hint: 'Arte e técnica de projectar e construir edifícios e outros espaços para uso humano' },
  { word: 'patrimonio',     hint: 'Conjunto de bens culturais, históricos ou naturais de valor que são preservados para as gerações futuras' },
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

    const limitResult = checkDailyLimit(sender, 'forca')
    if (!limitResult.allowed) {
      await handleLimitExceeded(sock, from, msg, sender, user.name, limitResult)
      return
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
