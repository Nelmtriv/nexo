const { getUser, removeGemas, setRelationship, clearRelationship, setProposal, getProposal, clearProposal } = require('../../database/users')
const { gem, mention } = require('../../utils/formatter')

const WEDDING_COST = 100
const DIVORCE_COST = 80
const proposalTimers = {}

module.exports = {
  name: ['casar', 'casamento', 'proposta', 'noivado'],
  description: 'Pede alguém em casamento! /casar @user | /casar aceitar | /divorciar',
  category: 'Social',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const sub = args[0]?.toLowerCase()
    const you = getUser(sender, pushName)

    // --- Accept marriage ---
    if (sub === 'aceitar' || sub === 'sim') {
      const proposal = getProposal(sender)
      if (!proposal || proposal.type !== 'casar') {
        await sock.sendMessage(from, { text: '❕ Não tens nenhum pedido de casamento pendente.' }, { quoted: msg }); return
      }

      const fromUser = getUser(proposal.from)
      if (fromUser.gemas < WEDDING_COST) {
        clearProposal(sender)
        await sock.sendMessage(from, { text: `💸 ${fromUser.name} já não tem ${gem(WEDDING_COST)} para o casamento!` }, { quoted: msg }); return
      }

      clearTimeout(proposalTimers[sender])
      clearProposal(sender)
      removeGemas(proposal.from, WEDDING_COST)
      setRelationship(sender, proposal.from, 'casado')

      await sock.sendMessage(from, {
        text: [
          `💒 *CASAMENTO!* 🎊🎊🎊`,
          ``,
          `👰 ${mention(proposal.from)} e 🤵 ${mention(sender)}`,
          `estão agora oficialmente *CASADOS*! 💍`,
          ``,
          `💸 Custo do casamento: ${gem(WEDDING_COST)}`,
          ``,
          `Parabéns ao casal! Que sejam muito felizes! 🥂`,
        ].join('\n'),
        mentions: [proposal.from, sender],
      })
      return
    }

    // --- Refuse marriage ---
    if (sub === 'recusar' || sub === 'nao') {
      const proposal = getProposal(sender)
      if (!proposal || proposal.type !== 'casar') {
        await sock.sendMessage(from, { text: '❕ Não tens nenhum pedido de casamento.' }, { quoted: msg }); return
      }
      clearTimeout(proposalTimers[sender])
      clearProposal(sender)
      await sock.sendMessage(from, {
        text: `💔 ${mention(sender)} recusou o pedido de casamento de ${mention(proposal.from)}! Que drama! 😢`,
        mentions: [sender, proposal.from],
      })
      return
    }

    // --- Divorce ---
    if (sub === 'divorciar' || sub === 'divorcio' || sub === 'separar') {
      if (you.relationship_status !== 'casado') {
        await sock.sendMessage(from, { text: '❕ Não estás casado(a)!' }, { quoted: msg }); return
      }
      if (you.gemas < DIVORCE_COST) {
        await sock.sendMessage(from, { text: `❌ O divórcio custa ${gem(DIVORCE_COST)}. Tens apenas ${gem(you.gemas)}.` }, { quoted: msg }); return
      }
      const partner = getUser(you.partner)
      removeGemas(sender, DIVORCE_COST)
      clearRelationship(sender)
      await sock.sendMessage(from, {
        text: [
          `📄 *DIVÓRCIO*`,
          ``,
          `*${you.name}* e *${partner.name}* divorciaram-se. 😢`,
          `💸 Custas do divórcio: ${gem(DIVORCE_COST)}`,
          ``,
          `Ambos estão agora solteiros.`,
        ].join('\n'),
        mentions: [sender, you.partner],
      })
      return
    }

    // --- Propose marriage ---
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (!mentioned?.length) {
      await sock.sendMessage(from, {
        text: [
          `💍 *Casamento*`,
          ``,
          `Proposta: */casar @user* (custa ${gem(WEDDING_COST)})`,
          `Aceitar: */casar aceitar*`,
          `Recusar: */casar recusar*`,
          `Divórcio: */casar divorciar* (custa ${gem(DIVORCE_COST)})`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    const targetJid = mentioned[0]
    if (targetJid === sender) { await sock.sendMessage(from, { text: '😂 Não podes casar contigo mesmo(a).' }, { quoted: msg }); return }

    if (you.gemas < WEDDING_COST) {
      await sock.sendMessage(from, { text: `❌ Precisas de ${gem(WEDDING_COST)} para o casamento!` }, { quoted: msg }); return
    }

    if (you.relationship_status === 'casado') {
      await sock.sendMessage(from, { text: `⚠️ Já estás casado(a)! Divorcia-te primeiro.` }, { quoted: msg }); return
    }

    const target = getUser(targetJid)
    if (target.relationship_status === 'casado') {
      await sock.sendMessage(from, { text: `💔 ${target.name} já está casado(a)! Respeita! 😤` }, { quoted: msg }); return
    }

    if (getProposal(targetJid)) {
      await sock.sendMessage(from, { text: `❕ ${target.name} já tem um pedido pendente!` }, { quoted: msg }); return
    }

    setProposal(targetJid, sender, 'casar', from)

    await sock.sendMessage(from, {
      text: [
        `💍 *Pedido de Casamento!*`,
        ``,
        `${mention(sender)} ajoelhou-se e pediu ${mention(targetJid)} em casamento! 💍✨`,
        ``,
        `💰 Custo do casamento: ${gem(WEDDING_COST)}`,
        ``,
        `${mention(targetJid)}, tens *60 segundos*!`,
        `✅ */casar aceitar*`,
        `❌ */casar recusar*`,
      ].join('\n'),
      mentions: [sender, targetJid],
    })

    proposalTimers[targetJid] = setTimeout(async () => {
      if (getProposal(targetJid)) {
        clearProposal(targetJid)
        await sock.sendMessage(from, {
          text: `⏰ ${mention(targetJid)} deixou o pedido de casamento expirar! 💔`,
          mentions: [targetJid],
        })
      }
      delete proposalTimers[targetJid]
    }, 60_000)
  },
}
