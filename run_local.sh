#!/bin/bash

# Script para rodar o projeto localmente (Backend + Frontend)
# Isso economiza builds no Vercel permitindo testar tudo na sua máquina antes.

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para limpar processos ao sair (Ctrl+C)
cleanup() {
  echo -e "\n${RED}🛑 Encerrando servidores...${NC}"
  # Mata processos filhos (backend e frontend) iniciados por este script
  kill $(jobs -p) 2>/dev/null
  exit
}

# Captura sinais de saída para rodar a limpeza
trap cleanup SIGINT SIGTERM

echo -e "${GREEN}🚀 Iniciando TKookies ERP Localmente...${NC}"

# --- 1. BACKEND ---
echo -e "${YELLOW}📦 Configurando Backend...${NC}"
cd backend

if [ ! -d "node_modules" ]; then
  echo "Instalando dependências do backend..."
  npm install
fi

if [ ! -f ".env" ]; then
  echo -e "${RED}⚠️  ATENÇÃO: Arquivo backend/.env não encontrado!${NC}"
  echo "Para testar localmente conectando ao banco na nuvem, crie este arquivo com as mesmas variáveis do Vercel:"
  echo "DB_HOST=..."
  echo "DB_USER=..."
  echo "DB_PASSWORD=..."
  echo "DB_NAME=..."
  echo "DB_PORT=..."
  echo -e "${YELLOW}O backend pode falhar se não conseguir conectar ao banco.${NC}"
  sleep 3
fi

# Inicia o backend em background (&) na porta 3333
npm start &

cd ..

# --- 2. FRONTEND ---
echo -e "${YELLOW}🎨 Configurando Frontend...${NC}"
cd frontend

if [ ! -d "node_modules" ]; then
  echo "Instalando dependências do frontend..."
  npm install
fi

# Inicia o frontend (Vite) na porta 5173
echo -e "${GREEN}✅ Ambiente pronto! Acesse: http://localhost:5173${NC}"
npm run dev

# O script aguarda aqui. Pressione Ctrl+C para parar tudo.
wait