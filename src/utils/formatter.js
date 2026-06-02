const { currency } = require('../config')

function gem(amount) {
  return `${amount} ${currency.emoji}`
}

function mention(jid) {
  return `@${jid.split('@')[0]}`
}

function bold(text) {
  return `*${text}*`
}

function line(char = '─', length = 28) {
  return char.repeat(length)
}

function header(title) {
  return `${line()}\n${bold(title)}\n${line()}`
}

function durabilityBar(current, max, size = 10) {
  const filled = max > 0 ? Math.round((current / max) * size) : 0
  const empty = size - filled
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${current}/${max}`
}

module.exports = { gem, mention, bold, line, header, durabilityBar }
