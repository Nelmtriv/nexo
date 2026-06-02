const { ownerNumber } = require('../config')

async function isAdmin(sock, groupJid, senderJid) {
  try {
    const meta = await sock.groupMetadata(groupJid)
    const participant = meta.participants.find(p => p.id === senderJid)
    return participant?.admin === 'admin' || participant?.admin === 'superadmin'
  } catch {
    return false
  }
}

function isOwner(senderJid) {
  const number = senderJid.split('@')[0]
  return number === ownerNumber
}

module.exports = { isAdmin, isOwner }
