const { getUser, updateUser } = require('../../database/users')

module.exports = {
  name: ['saiprision', 'escapaprision', 'sairprision'],
  description: 'Admin: se liberta da prisão',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg, sender }) {
    const user = getUser(sender)
    
    if (!user.prison_until || new Date(user.prison_until) <= new Date()) {
      await sock.sendMessage(from, {
        text: '❕ Não estás na prisão!',
      }, { quoted: msg }); return
    }
    
    updateUser(sender, { prison_until: null })
    
    await sock.sendMessage(from, {
      text: `🔓 *${user.name}* escapou da prisão com poderes de admin!`,
    }, { quoted: msg })
  },
}
