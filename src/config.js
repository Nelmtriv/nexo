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
    picareta:     { price: 100,  durability: 20, name: '🪓 Picareta'       },
    bond7:        { price: 80,   uses: 1,        name: '🍶 Bond7'           },
    vingancagema: { price: 150,  uses: 1,        name: '💠 VingançaGema'    },
    escudo:       { price: 100,  durability: 3,  name: '🛡️ Escudo'          },
    seguro:          { price: 500,  uses: 5, name: '🔐 Seguro de Roubo',  hours: 1 },
    streeton:        { price: 1000, uses: 1, name: '🥃 Streeton'                    },
    vingancapremium: { price: 1000, uses: 3, name: '💜 VingançaPremium'             },
  },
  titles: {
    campones:  { emoji: '🌿', label: 'Camponês',  price: 1000  },
    guerreiro: { emoji: '⚔️', label: 'Guerreiro', price: 3000  },
    lendario:  { emoji: '🔥', label: 'Lendário',  price: 8000  },
    nobre:     { emoji: '👑', label: 'Nobre',      price: 20000 },
    imortal:   { emoji: '💎', label: 'Imortal',    price: 50000 },
  },
}
