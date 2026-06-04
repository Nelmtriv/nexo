const fs = require('fs')
const path = require('path')
const { getData } = require('../../database/db')

module.exports = {
  name: ['resetdb', 'resetardb', 'limpardb'],
  description: 'Admin: resetar toda a base de dados (CUIDADO!)',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg, sender }) {
    const db = getData()
    const userCount = Object.keys(db.users).length
    
    await sock.sendMessage(from, {
      text: [
        `⚠️ *ATENÇÃO!*`,
        ``,
        `Vai ser deletado:`,
        `• ${userCount} perfis de usuários`,
        `• Todas as gemas, dinheiro, itens`,
        `• Todos os dados de jogos e estatísticas`,
        ``,
        `*Digite a confirmação para resetar:*`,
        `*/confirmar_reset*`,
      ].join('\n'),
    }, { quoted: msg })
  },
}
