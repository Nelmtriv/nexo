const { ownerNumber } = require('../config')
const { getUser } = require('../database/users')

async function isAdmin(sock, groupJid, senderJid) {
  try {
    // Verificar se é admin do banco de dados (promovido automaticamente)
    const user = getUser(senderJid)
    if (user.is_admin) return true
    
    // Verificar se é admin do grupo
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
