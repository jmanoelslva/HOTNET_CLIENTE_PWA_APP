#!/usr/bin/env bash
#
# Instalador do portal HOTNET Web (cliente) num servidor Debian limpo (ou já
# com outros sites rodando): clona o projeto, builda, instala/configura
# Apache OU Nginx com reverse proxy pro backend Controllr/BRbyte e emite um
# certificado Let's Encrypt com renovação automática.
#
# Uso:
#   sudo bash install.sh
#
# Reaproveita a mesma lógica de proxy/cookie documentada no README.md
# ("Reverse proxy em produção") e os vhosts de exemplo desta pasta
# (nginx.conf.example / apache-vhost.conf.example) como template — só o
# domínio do cliente é perguntado; o backend real (controllr.hotnet.net.br) fica fixo.

set -euo pipefail

# --------------------------------------------------------------------------
# Configuração fixa
# --------------------------------------------------------------------------
REPO_URL="https://github.com/jmanoelslva/web-app-hotnet.git"
BACKEND_DOMAIN="controllr.hotnet.net.br"
INSTALL_DIR="/opt/hotnet-web"
ACME_WEBROOT="/var/www/certbot-acme"
# jsdom (devDependency, só usado por "npm test" — nunca em produção) exige
# Node 22.22.2+/24.15+/26+; Node 24 é a LTS "Active" atual e evita o aviso
# EBADENGINE do "npm ci" no passo de build abaixo.
NODE_MAJOR="24"

# --------------------------------------------------------------------------
# Saída formatada
# --------------------------------------------------------------------------
if [ -t 1 ]; then
  C_INFO='\033[36m'; C_OK='\033[32m'; C_WARN='\033[33m'; C_ERR='\033[31m'; C_RESET='\033[0m'
else
  C_INFO=''; C_OK=''; C_WARN=''; C_ERR=''; C_RESET=''
fi
info()  { printf '%b[info]%b %s\n'  "$C_INFO" "$C_RESET" "$1"; }
ok()    { printf '%b[ok]%b %s\n'    "$C_OK"   "$C_RESET" "$1"; }
warn()  { printf '%b[atencao]%b %s\n' "$C_WARN" "$C_RESET" "$1"; }
err()   { printf '%b[erro]%b %s\n'  "$C_ERR"  "$C_RESET" "$1" >&2; exit 1; }
trap 'err "Instalação interrompida (linha $LINENO). Nada foi desfeito — corrija o problema acima e rode o script de novo, ele retoma de onde parou."' ERR

# --------------------------------------------------------------------------
# 1. Intro
# --------------------------------------------------------------------------
cat <<'BANNER'
==========================================================================
 Instalador do HOTNET Web (portal do cliente)
==========================================================================
 Este script vai, nesta ordem:
   1. Instalar dependências (Node.js, git, rsync, Apache ou Nginx, certbot)
   2. Clonar/atualizar o projeto e gerar o build de produção
   3. Publicar o build e configurar o servidor web com reverse proxy pro
      backend Controllr/BRbyte (controllr.hotnet.net.br)
   4. Emitir um certificado Let's Encrypt pro domínio informado e ativar
      a renovação automática

 Não mexe em sites/vhosts já existentes no servidor — só adiciona os
 arquivos referentes ao domínio que você vai informar agora.
==========================================================================
BANNER

# --------------------------------------------------------------------------
# 2. Pré-requisitos básicos
# --------------------------------------------------------------------------
if [ "$(id -u)" -ne 0 ]; then
  err "Rode este script como root (ex: sudo bash install.sh)."
fi

if ! command -v apt-get >/dev/null 2>&1; then
  err "Este instalador é só pra Debian/Ubuntu (precisa de apt-get)."
fi

# --------------------------------------------------------------------------
# 3. Perguntas
# --------------------------------------------------------------------------
DOMAIN_REGEX='^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$'

DOMINIO=""
while [ -z "$DOMINIO" ]; do
  read -rp "Qual domínio vai ser usado pra este portal? (ex: cliente.hotnet.net.br) " resposta
  if [[ "$resposta" =~ $DOMAIN_REGEX ]]; then
    DOMINIO="$resposta"
  else
    warn "Domínio inválido, tente de novo (sem http://, sem barra no fim)."
  fi
done

WEBSERVER=""
while [ -z "$WEBSERVER" ]; do
  read -rp "Usar Apache ou Nginx? [apache/nginx] " resposta
  case "${resposta,,}" in
    apache) WEBSERVER="apache" ;;
    nginx)  WEBSERVER="nginx" ;;
    *) warn "Digite 'apache' ou 'nginx'." ;;
  esac
done

read -rp "E-mail pra avisos do Let's Encrypt (opcional, Enter pra pular): " EMAIL

if getent hosts "$DOMINIO" >/dev/null 2>&1; then
  ok "$DOMINIO resolve no DNS."
else
  warn "$DOMINIO não resolveu no DNS deste servidor agora. Se o registro"
  warn "ainda não propagou, a emissão do certificado abaixo vai falhar."
  read -rp "Continuar mesmo assim? [s/N] " resposta
  [[ "${resposta,,}" == "s" ]] || err "Cancelado — ajuste o DNS e rode de novo."
fi

WWW_ROOT="/var/www/$DOMINIO"
PUBLISH_DIR="$WWW_ROOT/dist"
TEMPLATE_DIR="$INSTALL_DIR/deploy"

echo
info "Domínio:        $DOMINIO"
info "Backend:        $BACKEND_DOMAIN (fixo)"
info "Servidor web:   $WEBSERVER"
info "Build publicado em: $PUBLISH_DIR"
echo

# --------------------------------------------------------------------------
# 4. Dependências base
# --------------------------------------------------------------------------
info "Atualizando lista de pacotes..."
apt-get update -y

info "Instalando dependências base (curl, git, rsync, certbot)..."
apt-get install -y curl git rsync ca-certificates gnupg certbot

# --------------------------------------------------------------------------
# 5. Clonar/atualizar o projeto
# --------------------------------------------------------------------------
if [ -d "$INSTALL_DIR/.git" ]; then
  info "Projeto já clonado em $INSTALL_DIR, atualizando..."
  # Descarta qualquer modificação local em arquivo rastreado antes de
  # atualizar — esta pasta é só um artefato de deploy, nunca editada à mão.
  # "npm install" já rodou aqui antes e pode ter deixado o package-lock.json
  # localmente diferente do commitado (o lockfile foi gerado numa máquina
  # Windows; "npm install" no servidor Linux resolve os binários nativos
  # pra Linux e reescreve o arquivo) — sem isso, "pull --ff-only" falha
  # exigindo intervenção manual toda vez que isso acontecer de novo.
  if [ -n "$(git -C "$INSTALL_DIR" status --porcelain)" ]; then
    warn "Descartando alterações locais em $INSTALL_DIR (artefato de deploy, não deveria ter edição manual)..."
    git -C "$INSTALL_DIR" checkout -- .
  fi
  git -C "$INSTALL_DIR" pull --ff-only
else
  info "Clonando $REPO_URL em $INSTALL_DIR..."
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

# --------------------------------------------------------------------------
# 6. Node.js (só é usado aqui pra buildar — nada de Node roda em produção)
# --------------------------------------------------------------------------
instalar_node() {
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
    # >=22 (não >=18) pra bater com o mínimo que o jsdom exige — ver
    # comentário em NODE_MAJOR acima. Se o servidor já tiver uma versão
    # antiga (ex: de uma instalação anterior deste mesmo script), cai pro
    # "else" abaixo e troca pela NODE_MAJOR atual via NodeSource.
    if [ "$major" -ge 22 ] 2>/dev/null; then
      ok "Node.js $(node -v) já instalado."
      return
    fi
  fi
  info "Instalando Node.js ${NODE_MAJOR}.x (NodeSource)..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
}
instalar_node

# --------------------------------------------------------------------------
# 7. Build
# --------------------------------------------------------------------------
info "Instalando dependências do projeto e gerando build de produção..."
# "npm ci" (não "npm install") instala exatamente o que está no
# package-lock.json commitado e nunca reescreve o arquivo — é o que evita
# o problema acima se repetir numa próxima atualização.
( cd "$INSTALL_DIR" && npm ci && npm run build )
ok "Build gerado em $INSTALL_DIR/dist"

# --------------------------------------------------------------------------
# 8. Servidor web
# --------------------------------------------------------------------------
apache_rodando()  { command -v apache2ctl >/dev/null 2>&1 && systemctl is-active --quiet apache2; }
nginx_rodando()   { command -v nginx      >/dev/null 2>&1 && systemctl is-active --quiet nginx; }

if [ "$WEBSERVER" = "nginx" ] && apache_rodando; then
  err "O Apache já está instalado e rodando neste servidor, mas você escolheu Nginx — os dois não podem escutar a porta 80 ao mesmo tempo. Rode de novo escolhendo Apache, ou pare o Apache manualmente antes."
fi
if [ "$WEBSERVER" = "apache" ] && nginx_rodando; then
  err "O Nginx já está instalado e rodando neste servidor, mas você escolheu Apache — os dois não podem escutar a porta 80 ao mesmo tempo. Rode de novo escolhendo Nginx, ou pare o Nginx manualmente antes."
fi

if [ "$WEBSERVER" = "nginx" ]; then
  SERVICE="nginx"
  if ! dpkg -s nginx >/dev/null 2>&1; then
    info "Instalando Nginx..."
    apt-get install -y nginx
  else
    ok "Nginx já instalado."
  fi
else
  SERVICE="apache2"
  if ! dpkg -s apache2 >/dev/null 2>&1; then
    info "Instalando Apache..."
    apt-get install -y apache2
  else
    ok "Apache já instalado."
  fi
  a2enmod proxy proxy_http headers rewrite ssl >/dev/null
fi
systemctl enable --now "$SERVICE" >/dev/null

# --------------------------------------------------------------------------
# 9. Publica o build (site estático — nenhum processo Node roda em produção)
# --------------------------------------------------------------------------
info "Publicando o build em $PUBLISH_DIR..."
mkdir -p "$PUBLISH_DIR"
rsync -a --delete "$INSTALL_DIR/dist/" "$PUBLISH_DIR/"
chown -R www-data:www-data "$WWW_ROOT"

# --------------------------------------------------------------------------
# 10. Vhost provisório (só a porta 80, só pro desafio ACME do Let's Encrypt)
#     — não mexe em nenhum site já existente, só adiciona o deste domínio.
# --------------------------------------------------------------------------
mkdir -p "$ACME_WEBROOT"

publicar_bootstrap_nginx() {
  cat > "/etc/nginx/sites-available/$DOMINIO.conf" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMINIO;

    location /.well-known/acme-challenge/ {
        root $ACME_WEBROOT;
    }

    location / {
        return 404;
    }
}
EOF
  ln -sf "/etc/nginx/sites-available/$DOMINIO.conf" "/etc/nginx/sites-enabled/$DOMINIO.conf"
  nginx -t
  systemctl reload nginx
}

publicar_bootstrap_apache() {
  cat > "/etc/apache2/sites-available/$DOMINIO.conf" <<EOF
<VirtualHost *:80>
    ServerName $DOMINIO
    DocumentRoot $ACME_WEBROOT
    <Directory $ACME_WEBROOT>
        Require all granted
    </Directory>
</VirtualHost>
EOF
  a2ensite "$DOMINIO" >/dev/null
  apache2ctl configtest
  systemctl reload apache2
}

info "Preparando vhost provisório na porta 80 (necessário pra validar o domínio com o Let's Encrypt)..."
if [ "$WEBSERVER" = "nginx" ]; then publicar_bootstrap_nginx; else publicar_bootstrap_apache; fi

# --------------------------------------------------------------------------
# 11. Certificado Let's Encrypt (certbot só emite — o vhost final é o
#     nosso, feito a partir do exemplo em deploy/, não o que o certbot
#     geraria sozinho com --nginx/--apache).
# --------------------------------------------------------------------------
if [ -f "/etc/letsencrypt/live/$DOMINIO/fullchain.pem" ]; then
  ok "Já existe certificado Let's Encrypt pra $DOMINIO, pulando emissão."
else
  info "Emitindo certificado Let's Encrypt pra $DOMINIO..."
  certbot_args=(certonly --webroot -w "$ACME_WEBROOT" -d "$DOMINIO"
    --non-interactive --agree-tos --deploy-hook "systemctl reload $SERVICE")
  if [ -n "$EMAIL" ]; then
    certbot_args+=(-m "$EMAIL" --no-eff-email)
  else
    certbot_args+=(--register-unsafely-without-email)
  fi
  certbot "${certbot_args[@]}"
  ok "Certificado emitido."
fi

systemctl enable --now certbot.timer >/dev/null 2>&1 || true

# --------------------------------------------------------------------------
# 12. Vhost final — a partir do exemplo em deploy/, com o domínio e o
#     caminho do build substituídos.
# --------------------------------------------------------------------------
publicar_final_nginx() {
  sed \
    -e "s/cliente\.hotnet\.net\.br/$DOMINIO/g" \
    -e "s#/var/www/hotnet-web/dist#$PUBLISH_DIR#g" \
    "$TEMPLATE_DIR/nginx.conf.example" > "/etc/nginx/sites-available/$DOMINIO.conf"
  nginx -t
  systemctl reload nginx
}

publicar_final_apache() {
  sed \
    -e "s/cliente\.hotnet\.net\.br/$DOMINIO/g" \
    -e "s#/var/www/hotnet-web/dist#$PUBLISH_DIR#g" \
    "$TEMPLATE_DIR/apache-vhost.conf.example" > "/etc/apache2/sites-available/$DOMINIO.conf"
  apache2ctl configtest
  systemctl reload apache2
}

info "Publicando o vhost definitivo (HTTPS + reverse proxy pro backend)..."
if [ "$WEBSERVER" = "nginx" ]; then publicar_final_nginx; else publicar_final_apache; fi

# --------------------------------------------------------------------------
# 13. Resumo
# --------------------------------------------------------------------------
echo
ok "Instalação concluída."
cat <<RESUMO

  Portal:        https://$DOMINIO
  Backend:       https://$BACKEND_DOMAIN (via reverse proxy /api/*)
  Build em:      $PUBLISH_DIR
  Servidor web:  $WEBSERVER
  Certificado:   renovação automática via certbot.timer

  Pra atualizar o portal depois (novo build + republicar), rode este
  mesmo script de novo — ele detecta o que já está feito e só refaz o
  que mudou (git pull, npm ci, npm run build, republica o dist/).

RESUMO
