module.exports = {
  name: ['tagall', 'marcarTodos', 'todos', 'chamarTodos'],
  description: 'Admin: mencionar todos os membros do grupo',
  category: 'Admin',
  adminOnly: true,
  async execute({ sock, from, msg, args }) {
    const meta = await sock.groupMetadata(from)
    const members = meta.participants.map(p => p.id)
    const mensagem = args.join(' ') || '📢 Atenção a todos!'

    const mentions = members.map(jid => `@${jid.split('@')[0]}`).join(' ')
    await sock.sendMessage(from, {
      text: `${mensagem}\n\n${mentions}`,
      mentions: members,
    })
  },
}
