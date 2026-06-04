const { getUser } = require('../../database/users')
const { gem, header } = require('../../utils/formatter')

module.exports = {
  name: ['impostos', 'imposto', 'taxa', 'taxas', 'governo', 'fisco'],
  description: 'Explica o sistema de impostos de riqueza',
  category: 'Utilidade',
  async execute({ sock, from, msg, sender, pushName }) {
    const user = getUser(sender, pushName)
    const total = (user.gemas || 0) + (user.bank || 0)
    const deveImposto = total > 3000
    const valorImposto = deveImposto ? Math.floor(total * 0.10) : 0

    await sock.sendMessage(from, {
      text: [
        header('🏛️ Imposto de Riqueza'),
        ``,
        `O governo cobra *10%* de imposto a qualquer pessoa com riqueza total superior a *${gem(3000)}*.`,
        ``,
        `📌 *Como funciona:*`,
        `• O imposto é cobrado *a cada 3 dias*, na primeira mensagem após o prazo`,
        `• Aplica-se ao total de *carteira + banco*`,
        `• É descontado primeiro da carteira e o resto do banco`,
        `• Quem tiver ≤ ${gem(3000)} não paga nada`,
        ``,
        `📊 *Exemplo:*`,
        `  1500💎 carteira + 2500💎 banco = 4000💎 total`,
        `  Imposto: 10% × 4000 = *400💎* cobrados`,
        ``,
        `─────────────────────`,
        `👤 *O teu estado hoje:*`,
        `  💳 Carteira: ${gem(user.gemas || 0)}`,
        `  🏦 Banco:    ${gem(user.bank || 0)}`,
        `  📦 Total:    ${gem(total)}`,
        ``,
        deveImposto
          ? `⚠️ A tua riqueza ultrapassa ${gem(3000)}.\n   Se ainda não pagaste hoje, serão cobrados *${gem(valorImposto)}*.`
          : `✅ Estás abaixo do limite. Não pagas imposto hoje.`,
      ].join('\n'),
    }, { quoted: msg })
  },
}
