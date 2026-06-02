require('dotenv').config()

module.exports = {
  prefix: '/',
  botName: process.env.BOT_NAME || 'GameBot',
  ownerNumber: process.env.OWNER_NUMBER,
  currency: { name: 'Gemas', emoji: '💎' },
  economy: {
    startBalance: 50,
    dailyAmount: 15,
    dailyCooldownMs: 24 * 60 * 60 * 1000,
    mineCooldownMs: 60 * 60 * 1000,
    mineMin: 5,
    mineMax: 20,
  },
  games: {
    quizReward: 10,
    quizTimeoutMs: 30_000,
    pptBet: 5,
    forcaBase: 50,          // base reward, reduced by letters used
    forcaPenalty: 3,        // gemas lost per letter attempted
    gameTimeoutMs: 10 * 60 * 1000,
  },
  shop: {
    picareta:     { price: 100, durability: 20, name: '🪓 Picareta'      },
    bond7:        { price: 80,  uses: 1,        name: '🍶 Bond7'          },
    vingancagema: { price: 150, uses: 1,        name: '💠 VingançaGema'   },
    escudo:       { price: 100, durability: 3,  name: '🛡️ Escudo'         },
  },
}
