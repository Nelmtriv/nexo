// Alias redirect — divorce is handled inside /casar divorciar
module.exports = {
  name: ['divorciar', 'divorcio'],
  description: 'Divorcia-te do teu cônjuge. Alias de /casar divorciar',
  category: 'Social',
  async execute(ctx) {
    ctx.args = ['divorciar', ...ctx.args]
    const casar = require('./casar')
    await casar.execute(ctx)
  },
}
