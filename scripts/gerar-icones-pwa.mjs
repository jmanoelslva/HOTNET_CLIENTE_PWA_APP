import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const origem = 'src/assets/logo-hotnet.png'
const saida = 'public/icons'
mkdirSync(saida, { recursive: true })

// trim() corta a margem transparente da imagem antes de dimensionar, senão o logotipo
// fica pequeno no atalho do Android. fracao = lado da caixa do logotipo em relação ao
// ícone; no maskable o Android recorta em círculo (área segura = círculo de 80%), e o
// "HN" com os arcos é quase redondo, mas a ponta do N encosta na borda: 70% fica dentro.
async function gerarIcone(tamanho, nome, fracao) {
  const lado = Math.round(tamanho * fracao)
  const recortado = await sharp(origem).trim().toBuffer()
  const logo = await sharp(recortado)
    .resize(lado, lado, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer()

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

await gerarIcone(192, 'icon-192.png', 0.9)
await gerarIcone(512, 'icon-512.png', 0.9)
await gerarIcone(512, 'icon-maskable-512.png', 0.7)
