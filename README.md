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
- `vitest` + `@testing-library/react` para os testes (ver "Testes e CI"
  abaixo)
- **Design tokens** — paleta, tipografia e sombras centralizadas em
  `src/index.css` (CSS custom properties) e espelhadas em
  `src/utils/cores.ts` (`CORES`, pra uso em estilo inline/JS). Fonte
  [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans)
  via Google Fonts. Trocar a paleta ou o tema escuro é mexer só nesses
  dois arquivos — o resto do app consome os tokens, nunca hex fixo.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173` (o Vite escuta em todas as interfaces de
rede — `server.host: true` — então também dá pra abrir a partir de outro
aparelho na mesma Wi-Fi, ex: celular, usando o IP local da máquina em vez
de `localhost`; as URLs de rede aparecem no terminal ao rodar `npm run
dev`). Se a porta 5173 já estiver em uso, o Vite sobe na próxima livre
(5174, 5175...) e avisa qual foi no terminal.

## Backend e sessão

Todas as chamadas passam por `/api/...` (ver `src/api/client.ts`). A sessão
do Controllr é mantida via cookie (`BRBOSCookie`), não por token — por isso
todo request usa `credentials: 'include'` e nunca guardamos CPF/senha ou
o cookie manualmente em `localStorage`/`sessionStorage`.

### Proxy em desenvolvimento

O navegador só fala com o próprio servidor do Vite (`localhost:5173` ou o
IP da rede local, ver "Rodando localmente" acima). O `vite.config.ts`
repassa `/api/*` para `https://hotnet.net.br` por baixo (`server.proxy`),
reescrevendo o domínio do cookie de sessão pra bater com o host que o
navegador *realmente* usou pra acessar o Vite (`req.headers.host`, sem
porta) — não um valor fixo. Isso é o que permite abrir o portal tanto por
`localhost` quanto pelo IP da rede local (celular) sem a sessão quebrar:
um `cookieDomainRewrite` fixo em `'localhost'` funcionaria só no primeiro
caso. Mantém tudo na mesma origem do ponto de vista do navegador, sem CORS.

### Sessão: persistência e expiração

- **Sobrevive a um F5** — o cookie de sessão (`BRBOSCookie`) é do
  navegador, não da memória do React; ao montar, `SessionContext`
  confirma com o servidor (`controllrctl/cadastre/info`) se o cookie
  ainda vale antes de mandar pro login, então recarregar a página não
  desloga o cliente à toa. Enquanto essa checagem roda (`verificando`),
  `RotaProtegida` mostra um spinner em vez de já redirecionar.
- **Expiração por inatividade** — sem lógica própria no cliente (nada de
  timer contando 2min sem interação); quem encerra é o backend, pelo
  lease de 10min que o Controllr já dá ao token.
- **Aviso de sessão expirada** — quando esse 401 acontece (ver "Quirk:
  401 no próprio `/login`" abaixo), `src/api/client.ts` chama um ouvinte
  global (`aoExpirarSessao`) que `SessionContext` registra ao montar: um
  toast ("Sua sessão expirou. Faça login novamente.") e `sair()`, que por
  sua vez tira o cliente de qualquer tela protegida (`RotaProtegida`
  reage a `logado` virar `false`). Sem esse ouvinte, um 401 numa tela
  qualquer (ex: Consumo, Suporte) simplesmente parava de carregar sem
  avisar nada — só a tela de Boletos tratava isso localmente. `login` e
  `session/logout` ficam de fora do ouvinte (ver comentário em
  `client.ts` — evita loop quando o próprio logout bate 401 de novo).

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
- Repassar também `/public/*` e `/common/*` pra `https://hotnet.net.br`
  (sem cortar o prefixo, ao contrário de `/api`) — páginas geradas pelo
  próprio backend, como o layout de impressão do boleto
  (`invoice_ctl/invoice/print_layout`), referenciam logo/ícones com
  caminho absoluto (ex: `/public/assets/uploaddir/logo/office/1/logo.png`)
  esperando estar em `hotnet.net.br`. Sem isso, essas imagens quebram.
- Repassar `/assets/*` também — mas só como **fallback**: a tela de
  impressão do CONTRATO usa esse mesmo caminho pro logo (sem o prefixo
  `/public` que o boleto usa), só que `/assets/` é também onde o
  *próprio* build do Vite guarda os arquivos com hash (JS/CSS). O
  servidor web precisa servir o arquivo local se ele existir e só
  repassar pro backend quando não existir (`try_files ... @backend;` no
  Nginx; `RewriteCond ... !-f` antes do `[P]` no Apache) — repassar tudo
  cegamente quebraria o próprio app.
- **Repassar o IP de origem do cliente** (`X-Real-IP`/`X-Forwarded-For`)
  — sem isso, todo acesso via este portal chega no Controllr com o IP
  do próprio servidor de proxy, nunca o do cliente de verdade, o que
  atrapalha localização/geolocalização e qualquer log baseado em IP. O
  Nginx já vem assim no exemplo (`nginx.conf.example`); o Apache
  precisou de uma linha a mais (`RequestHeader set X-Real-IP
  "%{REMOTE_ADDR}e"` em `apache-vhost.conf.example`) porque o `X-Real-IP`
  é convenção do Nginx, não vem de graça no `mod_proxy` do Apache (o
  `X-Forwarded-For` esse sim já vem sozinho nos dois). O proxy de
  desenvolvimento do Vite faz o mesmo via `xfwd: true`
  (`vite.config.ts`). **Importante:** só mandar o cabeçalho não basta —
  o Controllr também precisa estar configurado do lado dele pra
  **confiar e ler** esse cabeçalho vindo do IP deste servidor
  (configuração do backend, fora do alcance deste repositório).

Sem a reescrita do cookie especificamente, o login funciona (primeira
resposta chega normalmente) mas a sessão não se mantém entre
requisições, porque o cookie nunca é aceito pelo navegador para o
domínio `cliente.hotnet.net.br`.

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
- **Suporte** — lista de chamados (abas Abertos/Resolvidos, categoria
  destacada com cor própria por tipo), abertura de novo chamado, chat
  com envio otimista de mensagens (aparece na hora, antes da confirmação
  do servidor — ver `pendentes` em `DetalheChamado.tsx`), anexos
  (foto/câmera, galeria ou arquivo, com miniatura pra imagem/PDF) e
  compartilhamento de localização.
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
  Lógica centralizada em `src/hooks/usePwaInstall.ts`, reaproveitada
  tanto no menu do avatar (`Home.tsx`) quanto na tela de **Login**
  (`Login.tsx`) — instalar não depende de já estar logado.
  - **Chrome/Edge (Android e desktop)** disparam `beforeinstallprompt`
    sozinhos; o botão "Instalar app" usa o prompt nativo do navegador.
  - **Safari no iOS nunca dispara esse evento** (limitação da própria
    Apple, não tem prompt automático em hipótese alguma — detecção por
    `navigator.userAgent`/touch, cobre também iPad que se identifica
    como Mac). A tela de Login abre automaticamente o passo a passo
    (`ModalInstalarIos.tsx`, compartilhar → "Adicionar à Tela de
    Início") **toda vez** que um cliente em iOS acessa a tela, antes
    mesmo de logar, enquanto o app não estiver instalado — não é "só
    uma vez" (sem flag em `localStorage`), de propósito: se o cliente
    ignorar ou fechar sem seguir o passo a passo, o botão "Instalar
    app" continua ali mesmo assim, mas o aviso automático segue
    aparecendo nas próximas visitas em vez de desistir depois da
    primeira. Modal em vez de toast porque a instalação exige sair do
    app pra ir até o Safari, então a instrução precisa ficar na tela
    até o cliente fechar, não sumir
    sozinha em poucos segundos — e avisa que só funciona pelo Safari:
    abrir o link num navegador in-app (WhatsApp, Instagram) ou no
    Chrome para iOS não oferece essa opção no compartilhamento.
  - **O evento `beforeinstallprompt` capturado vive em módulo, não em
    `useState` do hook** — ele só dispara UMA VEZ por carregamento de
    página inteiro, nunca de novo só por causa de uma navegação da SPA.
    Se ficasse em estado local, deslogar e voltar pro Login (ou
    qualquer desmontar/remontar de quem chama `usePwaInstall`) criava
    uma instância nova com o evento zerado, e o botão "Instalar app"
    sumia pra sempre até recarregar a página inteira — mesmo a
    instalação continuando disponível de verdade (bug confirmado e
    corrigido). `useSyncExternalStore` mantém todo componente que usa o
    hook sincronizado com esse estado compartilhado.
- **Aviso de nova versão** — `registerType: 'autoUpdate'` (vite.config.ts)
  ativa o service worker novo sozinho em segundo plano, mas isso não
  troca os módulos JS já carregados numa aba que já estava aberta. O
  registro é feito manualmente por `useRegisterSW` (`virtual:pwa-register/react`,
  `injectRegister: false`) em vez do script mínimo auto-injetado, só pra
  ter acesso ao callback `onNeedRefresh` — uma faixa fixa no topo
  (`StatusBanners.tsx`) avisa e só recarrega quando o cliente confirmar.
- **Barra de navegação inferior** (`BottomNav`) fixa nas telas
  autenticadas, com atalho colorido pras 5 telas mais usadas.
- **Toasts** (`ToastProvider`/`useToast`) no lugar de `window.alert()`.
- **Modais em bottom-sheet** (deslizam de baixo, com alça no topo) em
  vez de aparecer centralizados.
- **Modo escuro automático** — segue `prefers-color-scheme` do sistema,
  sem toggle manual. Só superfície/borda/texto mudam no bloco escuro
  (`src/index.css`); cores de marca/acento continuam as mesmas onde já
  tinham contraste suficiente, e são clareadas só ali onde não tinham
  (ver comentário sobre `--cor-contratos`/`--cor-suporte`/etc. no bloco
  `@media (prefers-color-scheme: dark)`). Cor de texto/ícone sobre um
  fundo colorido sólido (botão, badge) usa um token à parte,
  `--cor-branco-fixo`, que **não** muda com o tema — só o texto sobre a
  superfície do app (`--cor-superficie`) escurece.
- **Skeleton loaders** (`src/components/Skeleton.tsx`) no lugar de texto
  "Carregando…" nas listas — mantém a forma do card final, com efeito de
  brilho. Telas de carregamento de tela inteira (ex: checagem de sessão)
  usam `Spinner` em vez disso.
- **Estados vazios com ícone** (`src/components/EstadoVazio.tsx`) — bloco
  ilustrado no lugar de uma linha de texto solta quando uma lista não
  tem nada pra mostrar.
- **Feedback tátil e movimento** — botões/links "afundam" levemente ao
  toque (`scale(0.96)`) no lugar do brilho cinza padrão do navegador, e
  cada tela tem um fade-in leve ao entrar (`.tela-entrada`). Tudo isso
  (incluindo skeleton e spinner) é desativado pra quem tem
  `prefers-reduced-motion: reduce` no sistema.
- **Alvos de toque acessíveis** — botões de ação (ex: os da tela de
  Boletos) têm no mínimo 44px de altura, o recomendado por WCAG 2.5.5 /
  Material Design; links secundários pequenos (ex: "Ver mais boletos
  pagos") ganham padding extra só pra aumentar a área de toque.

## Robustez e performance

- **Error Boundary** (`src/components/ErrorBoundary.tsx`) — envolve o app
  inteiro em `main.tsx`. Sem isso, um erro de render em QUALQUER tela
  derruba o app pra uma página branca (React não segura exceção de
  render sozinho, só um boundary de verdade faz isso). Mostra uma tela
  de erro amigável com botão de recarregar em vez disso.
- **Faixa de status** (`src/components/StatusBanners.tsx`) — avisa quando
  o navegador fica offline (`useOnline`, eventos `online`/`offline`) e
  quando há uma versão nova do app pra atualizar (ver "Aviso de nova
  versão" acima). Offline tem prioridade sobre o aviso de atualização.
- **Code-splitting por rota** — cada tela em `src/pages/` é importada com
  `React.lazy` em `App.tsx`, dentro de um único `<Suspense>` (fallback:
  `Spinner tela`). Em vez de um bundle JS inicial só, o cliente baixa
  apenas o código da tela que está acessando.

## Testes e CI

```bash
npm test        # roda a suíte uma vez (vitest run)
npm run test:watch
npm run lint     # oxlint
```

Testes em `*.test.ts(x)` ao lado do arquivo testado (`vitest` +
`@testing-library/react`, config em `vitest.config.ts`). Cobertura
propositalmente focada no que é mais arriscado quebrar em silêncio, não
exaustiva: a lógica de sessão expirada em `src/api/client.ts` (o quirk do
401/"Login Failure", ver acima), `ErrorBoundary`, `StatusBanners` e
`useOnline`.

`.github/workflows/ci.yml` roda lint + testes + build a cada push/PR pra
`master`.
