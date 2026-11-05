# Levar a 1.1.0 para o portal SUPERSONIC

Guia para aplicar no portal do cliente SUPERSONIC
(`D:\WEB_APPS\SUPERSONIC_WEB_APP`, repo `SUPERSONIC_CLIENTE_PWA_APP`) o que a
HOTNET recebeu até a v1.1.0. O código das telas é o mesmo; o que muda é a
**marca** (cores, logotipo, textos, números) e os **dados da empresa**.

## Ponto de partida

O portal SUPERSONIC está na v1.0.0 dele, que **não tem** o que a HOTNET ganhou
na v1.0.0 e na v1.0.1 (diagnóstico de conexão, novo chamado em duas etapas,
recibo, alterar senha, cartão de conexão no Início). Por isso o porte leva
tudo de `v1.0.0` da SUPERSONIC até `v1.1.0` da HOTNET, não só a 1.1.0.

Caminho sugerido: copiar `src/` da HOTNET inteiro e depois trocar só os itens
da lista "Próprio da HOTNET" abaixo (mais seguro do que aplicar patch, porque
as telas mudaram quase todas). Manter `deploy/`, `.github/`, `public/`
(ícones) e `index.html`/`vite.config.ts` da SUPERSONIC, trazendo deles apenas
as mudanças listadas em "Configuração".

## Igual nos dois (copiar sem mudar)

- `src/components/`: PadraoTelas, DialogoHotnet (pode renomear), CartaoBoleto,
  FolhaConfirmar, FolhaQrCode, AjudaLogin, SeletorMes, TourInicio,
  TecladoPin, BloqueioPin, BotaoFechar, AvisoCopiado, PullToRefresh, BottomNav.
- `src/hooks/useFecharComVoltar.ts`, `src/hooks/useTema.ts`.
- `src/utils/`: faturas, quitacao, contaLocal, pinApp, pilhaNavegacao,
  avisoCopiado, tour, atualizacaoApp, tema, formatacao.
- Páginas: Perfil, Quitacao, Seguranca, Velocidade e as demais telas.
- Testes `*.test.ts(x)` (rodam iguais).

## Próprio da HOTNET (trocar para SUPERSONIC)

| O quê | Onde | Na HOTNET |
| --- | --- | --- |
| Cor da marca e papéis de cor | `src/index.css` (`--cor-primaria`, `-escura`, `-clara`, `--cor-primaria-container`, `--cor-sobre-primaria-container`, `--cor-laranja-vivo`, `--cor-texto-sobre-laranja`) | laranja `#C94300`; SUPERSONIC usa `#ffa401` hoje |
| Barras do sistema | `src/utils/tema.ts` (`atualizarCorDasBarras`, laranja do login) e `index.html` (`theme-color`) | `#c94300` / `#8a3008` |
| Topo do login | `src/pages/Login.css` (degradê) e `Login.tsx` (marca "HOTNET") | laranja |
| Ícone do app | `src/assets/logo-app.png` (login, Sobre, bloqueio por PIN) e `src/assets/logo-pdf.png` (PDF) | ícone "HN" do app Android |
| Logotipo | `src/assets/logo-hotnet.png` (recibo em tela) | HOTNET |
| Dados da empresa no recibo/quitação | `src/utils/recibo.ts` (`EMPRESA_RECIBO`) e `src/utils/pdfDocumentos.ts` (`EMPRESA`: zona, CEP, telefone, e-mail, site) | HOT NET, CNPJ 17.659.900/0001-48, Arapiraca/AL |
| Chave Pix de fallback (CNPJ) | `src/components/CartaoBoleto.tsx` (`CNPJ_FALLBACK`) | 17.659.900/0001-48 |
| WhatsApp | `src/utils/whatsapp.ts` e `src/pages/Sobre.tsx` | 5582999426613 (SUPERSONIC: 5582999009302) |
| Site e política de privacidade | `src/pages/Sobre.tsx`, `src/pages/Home.tsx` | hotnet.net.br, controllr.hotnet.net.br |
| Textos com o nome | busca por `HOTNET`/`HOT NET` em `src/` (Dúvidas, rodapé do PDF "Emitido pelo app HOTNET", Sobre, Perfil) | HOTNET |
| Perguntas das Dúvidas | `src/pages/faqDados.ts` (gerado do strings.xml do app HOTNET; horário de atendimento e textos são da HOTNET) | revisar com a SUPERSONIC |
| Ícones do app | `src/components/IconesApp.tsx` (vetores do app Android HOTNET) | servem para os dois; trocar só se a SUPERSONIC tiver app próprio |
| Chaves de armazenamento | `localStorage` com prefixo `hotnet-` (contas, PIN, tema, tour, foto) | trocar o prefixo para não misturar portais no mesmo aparelho |

## Configuração

- `vite.config.ts`: `define.__APP_VERSION__`, `globPatterns` com `woff2`,
  `globIgnores` do jsPDF, `theme_color`/`background_color` na cor do fundo.
- `package.json`: dependência `jspdf@^4.2.1` (não usar a 3.x, que tem falhas
  críticas e quebra o `npm audit` do CI).
- `index.html`: viewport sem zoom, `apple-mobile-web-app-status-bar-style`
  `default`.
- Fontes: `src/assets/fonts/` (Manrope woff2 para a tela e TTF em `pdf/`).

## Conferir depois do porte

1. `npm run lint`, `npm test`, `npm run build` e `npm audit --audit-level=high`
   (o mesmo do CI).
2. `git grep -i "hotnet"` em `src/` não deve sobrar nada visível ao cliente.
3. No celular: login, Início com boleto em aberto, Boletos, recibo e quitação
   em PDF (dados da SUPERSONIC), Perfil, voltar do celular com janela aberta.
