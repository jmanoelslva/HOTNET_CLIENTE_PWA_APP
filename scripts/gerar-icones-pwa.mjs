import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const origem = 'src/assets/logo-hotnet.png'
const saida = 'public/icons'
mkdirSync(saida, { recursive: true })

async function gerarIcone(tamanho, nome, paddingFracao) {
  const conteudo = Math.round(tamanho * (1 - paddingFracao * 2))
  const logo = await sharp(origem).resize(conteudo, conteudo, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).toBuffer()

  await sharp({
    create: {
      width: tamanho,
      height: tamanho,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(`${saida}/${nome}`)

  console.log(`gerado ${saida}/${nome}`)
}

await gerarIcone(192, 'icon-192.png', 0.1)
await gerarIcone(512, 'icon-512.png', 0.1)
await gerarIcone(512, 'icon-maskable-512.png', 0.2)
