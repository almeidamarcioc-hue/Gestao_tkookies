#!/bin/bash
# Deploy do backend de HOMOLOGAÇÃO para Vercel
# Atualiza: tkookies-backend-homologacao.vercel.app
# Banco de dados: homologação (separado do produção)
#
# Deve ser executado a partir da branch 'homologacao' para testar antes de ir para main.

if [ "$(git branch --show-current)" != "homologacao" ]; then
  echo "⚠️  AVISO: Você não está na branch 'homologacao'."
  echo "   Branch atual: $(git branch --show-current)"
  read -p "Continuar mesmo assim? (s/N) " -n 1 -r
  echo
  [[ ! $REPLY =~ ^[Ss]$ ]] && exit 1
fi

echo "🔧 Deployando backend de HOMOLOGAÇÃO..."
cd "$(dirname "$0")/backend"
VERCEL_ORG_ID=team_31qTCpSCknu7NW8rhSwhjHUX \
VERCEL_PROJECT_ID=prj_MSAzyiSyIFEmMH69wD9WTk0VfzXr \
npx vercel@latest deploy --prod

echo ""
echo "✅ Backend de homologação atualizado!"
echo "   URL: https://tkookies-backend-homologacao.vercel.app"
echo "   Frontend: http://tkookies-homologacao.vercel.app"
