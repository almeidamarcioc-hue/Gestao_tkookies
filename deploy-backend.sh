#!/bin/bash
# Deploy do backend de PRODUÇÃO para Vercel
# ATENÇÃO: Este script atualiza o ambiente de produção (backend-gules-chi.vercel.app)
# Para homologação use: bash deploy-backend-homologacao.sh
#
# Deve ser executado APENAS a partir da branch main após validação em homologação.
# Executa da raiz do repo para resolver rootDirectory="backend" corretamente.

if [ "$(git branch --show-current)" != "main" ]; then
  echo "❌ ERRO: Este script deve ser executado na branch 'main'."
  echo "   Branch atual: $(git branch --show-current)"
  echo "   Execute: git checkout main"
  exit 1
fi

echo "🚀 Deployando backend de PRODUÇÃO..."
cd "$(dirname "$0")"
VERCEL_ORG_ID=team_31qTCpSCknu7NW8rhSwhjHUX \
VERCEL_PROJECT_ID=prj_O3UC5RZH1iZXb54A5LhMs69xom59 \
npx vercel@latest deploy --prod
