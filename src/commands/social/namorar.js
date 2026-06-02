const { getUser, setRelationship, clearRelationship, setProposal, getProposal, clearProposal } = require('../../database/users')
const { mention } = require('../../utils/formatter')

const proposalTimers = {}

module.exports = {
  name: ['namorar', 'namoro', 'pedirNamoro'],
  description: 'Pede alguém em namoro! /namorar @user | /namorar aceitar | /namorar recusar',
  category: 'Social',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const sub = args[0]?.toLowerCase()
    const you = getUser(sender, pushName)

    // --- Accept ---
    if (sub === 'aceitar' || sub === 'sim' || sub === 'accept') {
      const proposal = getProposal(sender)
      if (!proposal || proposal.type !== 'namorar') {
        await sock.sendMessage(from, { text: '❕ Não tens nenhum pedido de namoro pendente.' }, { quoted: msg }); return
      }

      const fromUser = getUser(proposal.from)
      if (fromUser.relationship_status !== 'solteiro') {
        clearProposal(sender)
        await sock.sendMessage(from, { text: `😅 ${fromUser.name} já não está solteiro(a)!` }, { quoted: msg }); return
      }
      if (you.relationship_status !== 'solteiro') {
        clearProposal(sender)
        await sock.sendMessage(from, { text: `❕ Já estás num relacionamento! Termina primeiro.` }, { quoted: msg }); return
      }

      clearTimeout(proposalTimers[sender])
      clearProposal(sender)
      setRelationship(sender, proposal.from, 'namorando')

      await sock.sendMessage(from, {
        text: [
          `💑 *É OFICIAL!*`,
          ``,
          `💕 ${mention(proposal.from)} e ${mention(sender)} estão a *namorar*!`,
          ``,
          `Que a felicidade dure! 🥰`,
        ].join('\n'),
        mentions: [proposal.from, sender],
      })
      return
    }

    // --- Refuse ---
    if (sub === 'recusar' || sub === 'nao' || sub === 'refuse') {
      const proposal = getProposal(sender)
      if (!proposal || proposal.type !== 'namorar') {
        await sock.sendMessage(from, { text: '❕ Não tens nenhum pedido pendente.' }, { quoted: msg }); return
      }
      clearTimeout(proposalTimers[sender])
      clearProposal(sender)
      await sock.sendMessage(from, {
        text: `💔 ${mention(sender)} recusou o pedido de namoro de ${mention(proposal.from)}. Que pena! 😢`,
        mentions: [sender, proposal.from],
      })
      return
    }

    // --- Terminar ---
    if (sub === 'terminar' || sub === 'acabar') {
      if (you.relationship_status === 'solteiro' || !you.partner) {
        await sock.sendMessage(from, { text: '❕ Já estás solteiro(a)!' }, { quoted: msg }); return
      }
      if (you.relationship_status === 'casado') {
        await sock.sendMessage(from, { text: '⚠️ Estás casado(a)! Usa */divorciar* para terminar.' }, { quoted: msg }); return
      }
      const partner = getUser(you.partner)
      clearRelationship(sender)
      await sock.sendMessage(from, {
        text: `💔 *${you.name}* terminou o namoro com *${partner.name}*. Fim de uma era... 😢`,
        mentions: [sender, you.partner],
      })
      return
    }

    // --- Propose ---
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (!mentioned?.length) {
      await sock.sendMessage(from, {
        text: [
          `💘 *Namoro*`,
          ``,
          `Pedir: */namorar @user*`,
          `Aceitar: */namorar aceitar*`,
          `Recusar: */namorar recusar*`,
          `Terminar: */namorar terminar*`,
        ].join('\n'),
      }, { quoted: msg }); return
    }

    const targetJid = mentioned[0]
    if (targetJid === sender) { await sock.sendMessage(from, { text: '😂 Não podes namorar contigo mesmo(a).' }, { quoted: msg }); return }

    if (you.relationship_status !== 'solteiro') {
      await sock.sendMessage(from, { text: `❕ Já estás num relacionamento! Termina primeiro.` }, { quoted: msg }); return
    }

    const target = getUser(targetJid)
    if (target.relationship_status !== 'solteiro') {
      await sock.sendMessage(from, {
        text: `💔 ${target.name} já está ${target.relationship_status === 'casado' ? 'casado(a)' : 'a namorar'}! Respeita! 😤`,
        mentions: [targetJid],
      }, { quoted: msg }); return
    }

    if (getProposal(targetJid)) {
      await sock.sendMessage(from, { text: `❕ ${target.name} já tem um pedido pendente! Aguarda.` }, { quoted: msg }); return
    }

    setProposal(targetJid, sender, 'namorar', from)

    await sock.sendMessage(from, {
      text: [
        `💌 *Pedido de Namoro!*`,
        ``,
        `${mention(sender)} pediu ${mention(targetJid)} em namoro! 💕`,
        ``,
        `${mention(targetJid)}, tens *60 segundos* para decidir!`,
        `✅ */namorar aceitar*`,
        `❌ */namorar recusar*`,
      ].join('\n'),
      mentions: [sender, targetJid],
    })

    proposalTimers[targetJid] = setTimeout(async () => {
      if (getProposal(targetJid)) {
        clearProposal(targetJid)
        await sock.sendMessage(from, {
          text: `⏰ ${mention(targetJid)} não respondeu ao pedido de namoro. Pedido expirado! 💨`,
          mentions: [targetJid],
        })
      }
      delete proposalTimers[targetJid]
    }, 60_000)
  },
}
