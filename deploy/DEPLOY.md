# Deploy em produção — cliente.hotnet.net.br

## Instalação automatizada (servidor Debian novo ou já em uso)

Pra um servidor Debian, [`deploy/install.sh`](install.sh) automatiza os
passos 1 a 4 abaixo (build, publicação, Apache/Nginx e Let's Encrypt com
renovação automática) — pergunta o domínio e se é Apache ou Nginx, e não
mexe em nenhum vhost já existente no servidor:

```bash
git clone https://github.com/jmanoelslva/web-app-hotnet.git
sudo bash web-app-hotnet/deploy/install.sh
```

Rodar de novo (mesmo servidor, mesmo domínio) atualiza o portal: puxa o
código mais recente, refaz o build e republica — sem reemitir certificado
nem reconfigurar o que já está pronto.

O passo a passo manual abaixo continua válido pra quem preferir controle
fino, outro sistema operacional, ou não usar Debian.

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

## Teste temporário via IP puro (sem domínio, sem HTTPS)

Pra testar rapidinho num smartphone antes de ter domínio/certificado
prontos (ex: `http://45.237.95.186:8080/`), use
[`apache-vhost-teste-ip.conf.example`](apache-vhost-teste-ip.conf.example)
em vez do vhost de produção. A diferença principal: como não tem HTTPS,
ele também remove a flag `Secure` do cookie de sessão (obrigatório —
sem isso o navegador recusa guardar o cookie numa conexão HTTP pura, e
a sessão nunca persiste, mesmo com o domínio do cookie certo).

Passo a passo no servidor (Ubuntu/Debian com Apache2 já instalado):

```bash
# 1. Habilita os módulos necessários (idempotente, pode rodar sempre)
sudo a2enmod proxy proxy_http headers rewrite

# 2. Garante que a porta 8080 está sendo escutada
echo "Listen 8080" | sudo tee -a /etc/apache2/ports.conf

# 3. Cria o diretório e publica o build (rode isso NO SEU COMPUTADOR,
#    trocando USUARIO pelo seu usuário SSH no servidor)
scp -r dist USUARIO@45.237.95.186:/tmp/hotnet-web-dist
ssh USUARIO@45.237.95.186 "sudo mkdir -p /var/www/hotnet-web-teste && sudo mv /tmp/hotnet-web-dist /var/www/hotnet-web-teste/dist"

# 4. Copia o vhost de exemplo pro servidor e ativa
#    (envie o arquivo apache-vhost-teste-ip.conf.example também, ex:
#    via scp, salvando como hotnet-web-teste.conf)
sudo cp apache-vhost-teste-ip.conf.example /etc/apache2/sites-available/hotnet-web-teste.conf
sudo a2ensite hotnet-web-teste.conf
sudo systemctl reload apache2
```

Depois, abre `http://45.237.95.186:8080/` no navegador do celular — igual
a qualquer outro deploy, confirme login/sessão persistindo entre telas.

**Esse vhost é só pra teste** — quando for pra produção de verdade em
`cliente.hotnet.net.br`, use `apache-vhost.conf.example` (com HTTPS de
verdade) e desative/remova este.
