#!/usr/bin/env bash
# deploy-homologacao.sh
# Faz o deploy completo do ambiente de homologação no Vercel.
# Uso: bash deploy-homologacao.sh

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${YELLOW}=== Deploy Ambiente de Homologação ===${NC}"

# ─── Verificar / instalar Vercel CLI ──────────────────────────────────────────
if ! command -v vercel &>/dev/null; then
  echo -e "${YELLOW}Instalando Vercel CLI...${NC}"
  npm install -g vercel
fi
echo -e "${GREEN}✅ Vercel CLI: $(vercel --version)${NC}"

# ─── Variáveis do ambiente de homologação ─────────────────────────────────────
HOMO_DB_HOST="gateway01.us-east-1.prod.aws.tidbcloud.com"
HOMO_DB_PORT="4000"
HOMO_DB_USER="4XdA3ikxEF4hpSK.root"
HOMO_DB_PASSWORD="ozkuYMTCkQWQ4Ug5"
HOMO_DB_NAME="test"
HOMO_DB_SSL_CA="/etc/ssl/cert.pem"
JWT_SECRET="v9z0txwquAyjRo0oooNpZ7KG7LNlN2G2Sg3H0oCHsmrPQZDgcyyqev+bOZ6s52W0"
ADMIN_LOGIN="tkookies_"
ADMIN_SENHA="TKookies"

# ─── 1. Deploy BACKEND de homologação ─────────────────────────────────────────
echo ""
echo -e "${YELLOW}[1/3] Deploy do BACKEND de homologação...${NC}"
cd "$(dirname "$0")/backend"

# Cria projeto backend-homologacao (na primeira vez exige login e confirmação)
vercel --yes \
  --name cookie-erp-backend-homologacao \
  -e DB_HOST="$HOMO_DB_HOST" \
  -e DB_PORT="$HOMO_DB_PORT" \
  -e DB_USER="$HOMO_DB_USER" \
  -e DB_PASSWORD="$HOMO_DB_PASSWORD" \
  -e DB_NAME="$HOMO_DB_NAME" \
  -e DB_SSL_CA="$HOMO_DB_SSL_CA" \
  -e JWT_SECRET="$JWT_SECRET" \
  -e ADMIN_LOGIN="$ADMIN_LOGIN" \
  -e ADMIN_SENHA="$ADMIN_SENHA" \
  -e ENVIRONMENT="homologacao" \
  2>&1 | tee /tmp/backend-homo-deploy.log

BACKEND_URL=$(grep -o 'https://[^ ]*\.vercel\.app' /tmp/backend-homo-deploy.log | tail -1)

if [ -z "$BACKEND_URL" ]; then
  echo -e "${RED}❌ Não foi possível detectar a URL do backend. Verifique o log acima.${NC}"
  echo -e "${YELLOW}Cole a URL do backend de homologação:${NC}"
  read -r BACKEND_URL
fi

echo -e "${GREEN}✅ Backend de homologação: $BACKEND_URL${NC}"

# ─── 2. Deploy FRONTEND de homologação ────────────────────────────────────────
echo ""
echo -e "${YELLOW}[2/3] Deploy do FRONTEND de homologação...${NC}"
cd "$(dirname "$0")"

vercel --yes \
  --name cookie-erp-homologacao \
  --build-env VITE_ENVIRONMENT="homologacao" \
  --build-env VITE_API_URL="$BACKEND_URL" \
  -e VITE_ENVIRONMENT="homologacao" \
  -e VITE_API_URL="$BACKEND_URL" \
  2>&1 | tee /tmp/frontend-homo-deploy.log

FRONTEND_URL=$(grep -o 'https://[^ ]*\.vercel\.app' /tmp/frontend-homo-deploy.log | tail -1)

echo -e "${GREEN}✅ Frontend de homologação: $FRONTEND_URL${NC}"

# ─── 3. Copiar dados de produção ──────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[3/3] Copiando dados de produção para homologação...${NC}"
cd "$(dirname "$0")"

if [ ! -d "node_modules/mysql2" ]; then
  npm install mysql2 --no-save 2>/dev/null || true
fi

node scripts/copy-prod-to-homologacao.mjs

# ─── Resumo ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       Ambiente de Homologação criado com sucesso!    ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Frontend : $FRONTEND_URL${NC}"
echo -e "${GREEN}║  Backend  : $BACKEND_URL${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}A tarja vermelha 'AMBIENTE DE HOMOLOGAÇÃO' aparecerá no topo do site.${NC}"
