# Deploy em produção — cliente.hotnet.net.br

## 1. Gerar o build

```bash
npm install
npm run build
```

Isso gera a pasta `dist/` — é só o conteúdo dela que precisa ir pro
servidor (arquivos estáticos: HTML, JS, CSS). Nada de Node.js precisa
rodar em produção, é só um site estático + reverse proxy.

## 2. Publicar o conteúdo

Copie o conteúdo de `dist/` pro diretório que o servidor web vai servir
(ex: `/var/www/hotnet-web/dist`, conforme os exemplos de configuração
abaixo). Qualquer método de cópia serve (`rsync`, `scp`, pipeline de CI).

## 3. Configurar o servidor web

Dois exemplos prontos nesta pasta, escolha o que a equipe de
infraestrutura já usa:

- `nginx.conf.example` — vhost Nginx.
- `apache-vhost.conf.example` — VirtualHost Apache.

Ambos fazem as mesmas duas coisas, que são obrigatórias:

1. Servem o conteúdo estático de `dist/`, com fallback pro `index.html`
   em qualquer rota que não seja um arquivo real (necessário pro
   react-router-dom funcionar em URLs como `/boletos`, `/contratos`, etc.
   — sem isso, recarregar a página numa rota interna dá 404).
2. Fazem reverse proxy de `/api/*` pro backend real
   (`https://hotnet.net.br`), reescrevendo o domínio do cookie de sessão
   de `hotnet.net.br` pra `cliente.hotnet.net.br`. **Esse passo é o mais
   fácil de esquecer** — sem ele, o login até funciona (a primeira
   resposta chega normal), mas a sessão não se mantém entre requisições,
   porque o navegador descarta o cookie por domínio incompatível.

Ajuste nos dois exemplos: os caminhos do certificado TLS e o `root`/
`DocumentRoot` pro local real onde `dist/` for publicado.

## 4. Certificado TLS

`cliente.hotnet.net.br` precisa de um certificado válido pro próprio
subdomínio (ex: via Certbot/Let's Encrypt) — os exemplos assumem esse
caminho padrão do Certbot. Sem HTTPS, o cookie de sessão do Controllr
(que provavelmente é `Secure`) não seria nem enviado pelo navegador.

## 5. Checklist pra validar depois de publicar

- [ ] Abrir `https://cliente.hotnet.net.br/boletos` diretamente (sem
      passar pela home antes) — deve carregar a tela de login (fallback
      de SPA funcionando) e, depois de logado, recarregar a página em
      `/boletos` não deve dar 404.
- [ ] Fazer login e confirmar que a sessão se mantém ao navegar entre
      Boletos/Contratos/Consumo/Suporte (prova que o cookie está sendo
      aceito com o domínio reescrito).
- [ ] Abrir o DevTools → Application → Cookies e confirmar que o cookie
      de sessão aparece com o domínio `cliente.hotnet.net.br`, não
      `hotnet.net.br`.
- [ ] Testar "Ver boletos em PDF" e "Ver contrato completo" (abrem
      `/api/...` em nova aba) — confirma que o proxy também funciona
      fora das chamadas fetch/XHR.
