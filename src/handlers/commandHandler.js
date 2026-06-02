const path = require('path')

const commandMap = {}

function registerCommands(categories) {
  for (const category of categories) {
    const dir = path.join(__dirname, '..', 'commands', category)
    const fs = require('fs')
    if (!fs.existsSync(dir)) continue
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
      const cmd = require(path.join(dir, file))
      const names = Array.isArray(cmd.name) ? cmd.name : [cmd.name]
      for (const name of names) {
        commandMap[name.toLowerCase()] = cmd
      }
    }
  }
}

registerCommands(['utility', 'economy', 'games', 'admin', 'social'])

async function runCommand(name, ctx) {
  const cmd = commandMap[name.toLowerCase()]
  if (!cmd) {
    const { prefix } = require('../config')
    await ctx.sock.sendMessage(ctx.from, {
      text: `❓ O comando *${prefix}${name}* não existe.\nUsa *${prefix}ajuda* para ver todos os comandos disponíveis.`,
    }, { quoted: ctx.msg })
    return false
  }

  if (cmd.adminOnly && !ctx.isAdmin && !ctx.isOwner) {
    await ctx.sock.sendMessage(ctx.from, {
      text: '🚫 Esse comando é apenas para admins do grupo.',
    }, { quoted: ctx.msg })
    return true
  }

  try {
    await cmd.execute(ctx)
  } catch (err) {
    console.error(`Erro no comando /${name}:`, err)
    await ctx.sock.sendMessage(ctx.from, {
      text: '❌ Ocorreu um erro ao executar esse comando.',
    }, { quoted: ctx.msg })
  }
  return true
}

function getAllCommands() {
  return commandMap
}

module.exports = { runCommand, getAllCommands }
