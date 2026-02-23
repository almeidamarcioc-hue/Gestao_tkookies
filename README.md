# Gestão Tkookies ERP

Sistema de gestão para confeitaria de cookies, controlando produção, estoque, vendas e combos.

## 🚀 Como rodar o projeto

### Pré-requisitos
- Node.js instalado
- PostgreSQL instalado e rodando

### 1. Configurar o Banco de Dados
Certifique-se de que o PostgreSQL está rodando e que as credenciais em `backend/src/db/index.js` estão corretas.

### 2. Instalar Dependências
No terminal, na raiz do projeto:

```bash
# Instalar dependências do Backend
cd backend
npm install

# Instalar dependências do Frontend
cd ../frontend
npm install
```

### 3. Rodar o Sistema
Você precisará de dois terminais abertos:

**Terminal 1 (Backend):**
```bash
cd backend
npm start
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

O sistema abrirá em: `http://localhost:5173`

## 📦 Atualizações de Banco de Dados

Para habilitar o controle de estoque real dos ingredientes, execute o seguinte comando no banco de dados:

```sql
ALTER TABLE ingredientes ADD COLUMN estoque_atual DECIMAL(10,4) DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN tipo_cliente VARCHAR(20) DEFAULT 'consumidor';
```