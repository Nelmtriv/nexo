const { downloadMediaMessage } = require('@whiskeysockets/baileys')
const sharp = require('sharp')
const { botName } = require('../../config')

module.exports = {
  name: ['sticker', 's', 'figurinha', 'fig', 'fantoche', 'criar'],
  description: 'Converte uma imagem em sticker. Envia a imagem com /sticker ou responda a uma imagem.',
  category: 'Utilidade',
  async execute({ sock, from, msg, media }) {
    if (!media || !['image', 'video'].includes(media.type)) {
      await sock.sendMessage(from, {
        text: '📸 Envia uma imagem com */sticker* ou responde a uma imagem com esse comando.',
      }, { quoted: msg })
      return
    }

    await sock.sendMessage(from, { text: '⏳ A criar sticker...' }, { quoted: msg })

    try {
      const buffer = await downloadMediaMessage(msg, 'buffer', {})
      const webp = await sharp(buffer)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp()
        .toBuffer()

      await sock.sendMessage(from, {
        sticker: webp,
        stickerMetadata: {
          packname: botName,
          author: '💎 GameBot',
        },
      })
    } catch (err) {
      console.error('Erro ao criar sticker:', err)
      await sock.sendMessage(from, { text: '❌ Não foi possível criar o sticker. Tenta com outra imagem.' }, { quoted: msg })
    }
  },
}
