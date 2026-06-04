const fs = require('fs')
const path = require('path')

module.exports = {
  name: ['confirmar_reset'],
  description: 'Admin: confirmar reset da base de dados',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg, sender }) {
    const dataDir = path.join(__dirname, '..', '..', '..', 'data')
    const DB_FILE = path.join(dataDir, 'bot.json')
    
    try {
      // Delete o arquivo se existir
      if (fs.existsSync(DB_FILE)) {
        fs.unlinkSync(DB_FILE)
      }
      
      // Criar novo arquivo vazio
      const defaultData = { users: {}, active_games: {} }
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2))
      
      await sock.sendMessage(from, {
        text: `🔄 *Base de dados resetada com sucesso!*\n\n✅ Arquivo limpo\n✅ Todos os dados deletados\n\n⚠️ Reinicia o bot para garantir funcionamento correto.`,
      }, { quoted: msg })
      
      console.log('🗑️ Base de dados foi resetada pelo admin!')
    } catch (err) {
      await sock.sendMessage(from, {
        text: `❌ Erro ao resetar: ${err.message}`,
      }, { quoted: msg })
    }
  },
}
