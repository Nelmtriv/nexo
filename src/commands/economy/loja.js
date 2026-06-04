const { getUser, removeGemas, addItem, getInventory } = require('../../database/users')
const { getData, save } = require('../../database/db')
const { gem, header, line } = require('../../utils/formatter')
const { shop } = require('../../config')

const ITEMS = {
  picareta: {
    ...shop.picareta,
    id: 'picareta',
    desc: `Necessária para minerar. Dura ${shop.picareta.durability} usos antes de partir.`,
  },
  bond7: {
    ...shop.bond7,
    id: 'bond7',
    desc: 'Bebida para embebedar a vítima. Necessária para /embebedar (55% sucesso). 1 uso.',
  },
  vingancagema: {
    ...shop.vingancagema,
    id: 'vingancagema',
    desc: 'Cristal mágico de ira. Necessário para /vingar. 1 uso.',
  },
  escudo: {
    ...shop.escudo,
    id: 'escudo',
    desc: `Protege-te de ${shop.escudo.durability} roubos/embebedamentos antes de partir.`,
  },
  seguro: {
    ...shop.seguro,
    id: 'seguro',
    desc: `Imunidade total a roubos por 6 horas. Expira ao fim do tempo.`,
  },
  streeton: {
    ...shop.streeton,
    id: 'streeton',
    desc: `Para /embebedar. 100% sucesso — rouba da carteira e do banco da vítima. 1 uso.`,
  },
  vingancapremium: {
    ...shop.vingancapremium,
    id: 'vingancapremium',
    desc: `Para /vingar. 100% sucesso, rouba carteira+banco, podes recuperar mais do que foi roubado. 3 usos.`,
  },
}

module.exports = {
  name: ['loja', 'shop', 'mercado', 'lj', 'comprar', 'inventario'],
  description: 'Comprar itens da loja. /loja | /loja comprar <item> | /loja inventario',
  category: 'Economia',
  async execute({ sock, from, msg, sender, pushName, args }) {
    const sub = args[0]?.toLowerCase()
    const user = getUser(sender, pushName)

    // /loja inventario
    if (sub === 'inventario' || sub === 'inv' || sub === 'i') {
      const inv = getInventory(sender)
      const insActive = user.insurance_until && new Date(user.insurance_until) > new Date()
      const insRemaining = insActive ? new Date(user.insurance_until).getTime() - Date.now() : 0
      const { formatRemaining } = require('../../utils/cooldown')
      const lines = [
        header('🎒 Inventário — ' + user.name),
        ``,
        `🪓 Picareta:       ${inv.picareta || 0} uso(s) restantes`,
        `🛡️ Escudo:         ${inv.escudo || 0} bloqueio(s) restantes`,
        `🍶 Bond7:          ${inv.bond7 || 0} unidade(s)`,
        `💠 VingançaGema:   ${inv.vingancagema || 0} unidade(s)`,
        `🔐 Seguro:         ${insActive ? `✅ activo (${formatRemaining(insRemaining)})` : '❌ inactivo'}`,
        `🥃 Streeton:       ${inv.streeton || 0} unidade(s)`,
        `💜 VingançaPremium: ${inv.vingancapremium || 0} uso(s)`,
      ]
      await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg })
      return
    }

    // /loja comprar <item>
    if (sub === 'comprar' || sub === 'buy' || sub === 'c') {
      const itemId = args[1]?.toLowerCase()
      const item = ITEMS[itemId]

      if (!item) {
        await sock.sendMessage(from, {
          text: `❓ Item inválido. Usa */loja* para ver os itens disponíveis.\nNomes: *picareta* | *bond7* | *vincancagema* | *escudo* | *seguro* | *streeton* | *vingancapremium*`,
        }, { quoted: msg })
        return
      }

      if (user.gemas < item.price) {
        await sock.sendMessage(from, {
          text: `❌ Precisas de ${gem(item.price)} para comprar *${item.name}*.\nTens apenas ${gem(user.gemas)}.`,
        }, { quoted: msg })
        return
      }

      // seguro is time-based, not inventory-based
      if (item.id === 'seguro') {
        const db = getData()
        db.users[sender].gemas = (db.users[sender].gemas || 0) - item.price
        db.users[sender].insurance_until = new Date(Date.now() + item.hours * 60 * 60 * 1000).toISOString()
        save()
        const updated = getUser(sender)
        await sock.sendMessage(from, {
          text: [
            `🔐 *Seguro de Roubo activado!*`,
            ``,
            `Estás protegido durante *1 horas*!`,
            `O seguro consome-se no primeiro ataque ou ao expirar.`,
            ``,
            `💸 Gasto: ${gem(item.price)}`,
            `💳 Saldo: ${gem(updated.gemas)}`,
          ].join('\n'),
        }, { quoted: msg })
        return
      }

      removeGemas(sender, item.price)
      const hasDurability = item.id === 'picareta' || item.id === 'escudo'
      const qty = hasDurability ? item.durability : 1
      addItem(sender, item.id, qty)
      const updated = getUser(sender)

      await sock.sendMessage(from, {
        text: [
          `✅ Compraste *${item.name}*!`,
          hasDurability
            ? `🔢 Durabilidade: ${item.durability} usos`
            : `📦 Quantidade: +1`,
          ``,
          `💸 Gasto: ${gem(item.price)}`,
          `💳 Saldo restante: ${gem(updated.gemas)}`,
        ].join('\n'),
      }, { quoted: msg })
      return
    }

    // /loja — show shop
    const inv = getInventory(sender)
    const lines = [
      header('🏪 Loja'),
      ``,
      ...Object.values(ITEMS).map(item => [
        `*${item.name}* — ${gem(item.price)}`,
        `  └ ${item.desc}`,
        `  └ No teu inv: ${inv[item.id] || 0}`,
      ].join('\n')),
      ``,
      `Comprar: */loja comprar <nome>*`,
      `Inventário: */loja inventario*`,
      line(),
    ]

    await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg })
  },
}
