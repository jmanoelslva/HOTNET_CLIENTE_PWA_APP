# HOTNET Web

Portal do cliente HOTNET em formato web, para hospedagem em servidor
próprio da empresa sob o domínio `cliente.hotnet.net.br`. Reaproveita o
mesmo backend Controllr/BRbyte (`hotnet.net.br`) já usado pelo app Android,
mas é um projeto novo e independente — nenhum código do app Android é
compartilhado.

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- `react-router-dom` para as rotas
- React Context (`SessionContext`) para o estado de sessão, em memória
- `react-icons` (subconjunto Material Symbols, `react-icons/md`) para os
  ícones — mesma linguagem visual dos `ic_ms_*` do app Android
- `vite-plugin-pwa` — manifest + service worker (ver "Experiência de
  app" abaixo)

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

## Backend e sessão

Todas as chamadas passam por `/api/...` (ver `src/api/client.ts`). A sessão
do Controllr é mantida via cookie (`BRBOSCookie`), não por token — por isso
todo request usa `credentials: 'include'` e nunca guardamos CPF/senha ou
o cookie manualmente em `localStorage`/`sessionStorage`.

### Proxy em desenvolvimento

O navegador só fala com o próprio servidor do Vite (`localhost:5173`).
O `vite.config.ts` repassa `/api/*` para `https://hotnet.net.br` por baixo
(`server.proxy`), reescrevendo o domínio do cookie para `localhost`. Isso
mantém tudo na mesma origem do ponto de vista do navegador, sem CORS.

### Reverse proxy em produção (obrigatório)

Em produção, `cliente.hotnet.net.br` e `hotnet.net.br` são domínios
diferentes — o navegador não vai aceitar nem enviar o cookie de sessão
entre eles sem ajuda. O servidor web real (Apache/Nginx) que hospedar este
build **precisa** fazer o mesmo reverse proxy do Vite:

- Repassar tudo em `/api/*` para `https://hotnet.net.br/*` (removendo o
  prefixo `/api`).
- Reescrever o domínio do cookie de sessão (`Set-Cookie`) de `hotnet.net.br`
  para `cliente.hotnet.net.br`, equivalente ao `cookieDomainRewrite` do
  Vite (no Nginx isso é `proxy_cookie_domain hotnet.net.br
  cliente.hotnet.net.br;`).
- Preservar `Content-Type: application/x-www-form-urlencoded` e cookies de
  requisição (`proxy_set_header Cookie $http_cookie;`).

Sem isso, o login funciona (primeira resposta chega normalmente) mas a
sessão não se mantém entre requisições, porque o cookie nunca é aceito
pelo navegador para o domínio `cliente.hotnet.net.br`.

Configuração pronta (Nginx e Apache) e checklist de validação em
[`deploy/DEPLOY.md`](deploy/DEPLOY.md).

### Quirk: 401 no próprio `/login`

O endpoint `/login` responde `HTTP 401` com um corpo JSON normal
(`{"success": false, "message": "Authentication failed for user [...]"}`)
tanto para CPF/senha errados quanto — em outros endpoints — para sessão
expirada. `src/api/client.ts` trata isso separadamente: um 401 em `/login`
é só falha de login normal; um 401 (ou `{"success": false, "message":
"Login Failure"}`) em qualquer outro endpoint é tratado como sessão
expirada (mesmo critério do `SessionExpiredInterceptor` do app Android).

## Escopo atual

Todas as telas principais implementadas e validadas contra o backend real:

- **Login/sessão** — autenticação, sessão em memória.
- **Home** — saudação, botão de WhatsApp, menu de navegação para as
  demais telas.
- **Boletos** — abas Em aberto/Pagos, filtro por contrato, cálculo de
  multa/juros para vencidos, copiar código de barras/PIX, QR Code,
  boleto em PDF, informar pagamento.
- **Contratos** — descoberta via faturas (contract/list sem filtro pode
  voltar vazio para clientes com vários contratos), detalhes, itens do
  plano, link pro contrato completo em PDF.
- **Consumo** — uso diário por contrato/CPE, navegação de mês, sessão de
  conexão ao vivo (IP/MAC/IPv6, duração, download/upload da sessão).
- **Suporte** — lista de chamados (abas Abertos/Resolvidos), abertura de
  novo chamado, chat com envio de mensagens, anexos (foto/câmera,
  galeria ou arquivo) e compartilhamento de localização.
- **Avisos** — gate obrigatório em tela cheia quando há avisos não
  confirmados (mesmo comportamento do `AvisoActivity` do app Android).
- **Meus dados** — informações pessoais, contato e endereços.
- **Ajuda** — FAQ estático com busca, categorias coloridas e WhatsApp.
- **Sobre** — logotipo, descrição do portal e WhatsApp, acessível pelo
  menu do avatar na Home.

Paridade funcional completa com as telas principais do app Android.

## Experiência de app

Além das telas em si, o portal tem alguns recursos pra parecer mais
com um app nativo do que um site comum:

- **PWA instalável** — `vite-plugin-pwa` gera o `manifest.webmanifest`
  e o service worker (`sw.js`) no build. O cliente pode instalar o
  portal na tela inicial (ícone próprio, abre em tela cheia, sem barra
  do navegador). O service worker só cacheia os arquivos estáticos do
  próprio app — nunca as chamadas `/api/*`, que são sempre dinâmicas.
  Ícones em `public/icons/` (gerados a partir do logotipo por
  `scripts/gerar-icones-pwa.mjs`, reexecutar se o logotipo mudar).
- **Barra de navegação inferior** (`BottomNav`) fixa nas telas
  autenticadas, com atalho colorido pras 5 telas mais usadas.
- **Toasts** (`ToastProvider`/`useToast`) no lugar de `window.alert()`.
- **Modais em bottom-sheet** (deslizam de baixo, com alça no topo) em
  vez de aparecer centralizados.
