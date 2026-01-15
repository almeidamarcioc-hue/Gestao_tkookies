#!/bin/bash

# 1. Inicializa o Git se não existir
if [ ! -d ".git" ]; then
  echo "⚙️  Inicializando repositório Git..."
  git init
  git branch -M main
fi

# 2. Garante que o remote origin existe e está correto
if ! git remote | grep -q "origin"; then
  git remote add origin https://github.com/almeidamarcioc-hue/Gestao_tkookies.git
else
  git remote set-url origin https://github.com/almeidamarcioc-hue/Gestao_tkookies.git
fi

# Verifica se foi passada uma mensagem
if [ -z "$1" ]; then
  echo "❌ Erro: Informe uma mensagem para a versão."
  echo "Exemplo: ./save_version.sh \"Ajuste no cadastro de clientes\""
  exit 1
fi

echo "📦 Adicionando arquivos..."
git add .

echo "💾 Criando commit..."
git commit -m "$1" || echo "⚠️  Nada para commitar."

echo "⬇️  Atualizando com o remoto (Pull)..."
git pull origin main --rebase || echo "⚠️  Falha no pull (pode não haver remoto ainda ou conflitos)."

echo "🚀 Enviando para o GitHub..."
git push -u origin main

echo "✅ Processo finalizado."