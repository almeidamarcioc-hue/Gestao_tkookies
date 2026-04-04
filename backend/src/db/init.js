import { pool } from "./index.js";

// Importante: exportar para que os outros ficheiros vejam o pool
export { pool };

// Função auxiliar para adicionar colunas de forma segura (compatível com MySQL 5.7/TiDB)
async function addColumnSafe(table, columnDef) {
  try {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
    console.log(`✅ Coluna adicionada em ${table}: ${columnDef}`);
    return `[${table}] Sucesso: ${columnDef}`;
  } catch (e) {
    // Ignora erro 1060 (Duplicate column name) e erros similares
    if (e.code !== 'ER_DUP_FIELDNAME' && !e.message.includes("Duplicate column") && !e.message.includes("already exists")) {
      console.log(`Nota sobre migração em ${table}:`, e.message);
      console.error(`❌ Erro crítico migração ${table}:`, e);
      return `[${table}] Erro: ${e.message}`;
    }
    return `[${table}] Já existe: ${columnDef}`;
  }
}

export async function initDatabase() {
  const logs = [];
  try {
    // Tabela de Ingredientes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ingredientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        unidade VARCHAR(50) NOT NULL,
        estoque DECIMAL(10, 2) DEFAULT 0,
        custo DECIMAL(10, 2) DEFAULT 0,
        usado_para_revenda BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Produtos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        preco_venda DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Ligação (Composição)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS produto_ingredientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        produto_id INT,
        ingrediente_id INT,
        quantidade DECIMAL(10, 2) NOT NULL,
        apenas_revenda BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
        FOREIGN KEY (ingrediente_id) REFERENCES ingredientes(id) ON DELETE CASCADE
      )
    `);

    // Tabela de Imagens do Produto
    await pool.query(`
      CREATE TABLE IF NOT EXISTS produto_imagens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        produto_id INT,
        imagem TEXT,
        eh_capa BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
      )
    `);

    // Tabela de Clientes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(50),
        endereco VARCHAR(255),
        numero VARCHAR(50),
        complemento VARCHAR(255),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        login VARCHAR(100) UNIQUE,
        senha VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Pedidos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT,
        data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        valor_total DECIMAL(10, 2) DEFAULT 0,
        forma_pagamento VARCHAR(50),
        observacao TEXT,
        frete DECIMAL(10, 2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'Novo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      )
    `);

    // Tabela de Itens do Pedido
    await pool.query(`
      CREATE TABLE IF NOT EXISTS itens_pedido (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pedido_id INT,
        produto_id INT,
        quantidade DECIMAL(10, 2) NOT NULL,
        valor_unitario DECIMAL(10, 2) NOT NULL,
        valor_total DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
        FOREIGN KEY (produto_id) REFERENCES produtos(id)
      )
    `);

    // Tabela de Combos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS combos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        preco_venda DECIMAL(10, 2) NOT NULL,
        estoque DECIMAL(10, 2) DEFAULT 0,
        produto_id INT,
        imagem TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Itens do Combo
    await pool.query(`
      CREATE TABLE IF NOT EXISTS combo_itens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        combo_id INT,
        produto_id INT,
        quantidade DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,
        FOREIGN KEY (produto_id) REFERENCES produtos(id)
      )
    `);

    // Tabela de Produtos Agregados (Venda casada opcional / Extras) - RECRIAR PARA GARANTIR LINK COM PRODUTOS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS produto_agregados (
        produto_id INT NOT NULL,
        agregado_id INT NOT NULL,
        preco DECIMAL(10, 2) DEFAULT 0,
        PRIMARY KEY (produto_id, agregado_id),
        FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
        FOREIGN KEY (agregado_id) REFERENCES produtos(id) ON DELETE CASCADE
      )
    `);

    // Tabela de Configurações do Sistema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chave VARCHAR(50) NOT NULL UNIQUE,
        valor TEXT
      )
    `);

    // Tabela de Favoritos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favoritos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT,
        produto_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
        FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
        CONSTRAINT unique_fav UNIQUE (cliente_id, produto_id)
      )
    `);

    // Tabela de Revendedores (B2B)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS revendedores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        razao_social VARCHAR(255) NOT NULL,
        cpf_cnpj VARCHAR(20) NOT NULL,
        nome_contato VARCHAR(100) NOT NULL,
        telefone VARCHAR(20),
        cep VARCHAR(10),
        cidade VARCHAR(100),
        estado CHAR(2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Lançamentos Financeiros (Contas a Pagar/Receber)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tipo VARCHAR(20) NOT NULL, -- 'Entrada' ou 'Saída'
        descricao VARCHAR(255) NOT NULL,
        valor DECIMAL(10, 2) NOT NULL,
        data_vencimento DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'Pendente', -- 'Pendente', 'Pago'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Depoimentos (Clientes/Revendedores)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS depoimentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        cargo VARCHAR(100) DEFAULT 'Cliente',
        texto TEXT NOT NULL,
        imagem TEXT,
        ativo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrações (Colunas novas) - Executa uma por uma de forma segura
    logs.push(await addColumnSafe("ingredientes", "usado_para_revenda BOOLEAN DEFAULT TRUE"));
    logs.push(await addColumnSafe("produtos", "margem_revenda DECIMAL(10, 2) DEFAULT 0"));
    logs.push(await addColumnSafe("produtos", "preco_revenda DECIMAL(10, 2) DEFAULT 0"));
    logs.push(await addColumnSafe("produtos", "rendimento INTEGER DEFAULT 1"));
    logs.push(await addColumnSafe("produto_ingredientes", "apenas_revenda BOOLEAN DEFAULT FALSE"));
    logs.push(await addColumnSafe("produtos", "estoque DECIMAL(10, 2) DEFAULT 0"));
    logs.push(await addColumnSafe("produtos", "eh_destaque BOOLEAN DEFAULT FALSE"));
    logs.push(await addColumnSafe("produtos", "desconto_destaque DECIMAL(10, 2) DEFAULT 0"));
    logs.push(await addColumnSafe("produtos", "validade_promocao DATE"));
    
    // Tenta adicionar login SEM unique primeiro para garantir a coluna
    logs.push(await addColumnSafe("clientes", "login VARCHAR(100)"));
    
    // Tenta adicionar o índice único separadamente
    try {
      await pool.query("CREATE UNIQUE INDEX idx_clientes_login ON clientes(login)");
      logs.push("[clientes] Index UNIQUE login criado");
    } catch (e) {
      logs.push(`[clientes] Index UNIQUE login ignorado/erro: ${e.message}`);
    }

    logs.push(await addColumnSafe("clientes", "senha VARCHAR(255)"));
    logs.push(await addColumnSafe("clientes", "role VARCHAR(20) DEFAULT 'cliente'"));
    logs.push(await addColumnSafe("clientes", "complemento VARCHAR(255)"));
    logs.push(await addColumnSafe("pedidos", "status_financeiro VARCHAR(20) DEFAULT 'A Receber'"));
    logs.push(await addColumnSafe("pedidos", "data_pagamento TIMESTAMP"));
    logs.push(await addColumnSafe("lancamentos_financeiros", "pedido_id INT"));
    logs.push(await addColumnSafe("lancamentos_financeiros", "parcela_numero INT DEFAULT 1"));
    logs.push(await addColumnSafe("lancamentos_financeiros", "total_parcelas INT DEFAULT 1"));
    logs.push(await addColumnSafe("lancamentos_financeiros", "group_id VARCHAR(50)"));
    logs.push(await addColumnSafe("combos", "produto_id INT"));

    // Índices para performance
    try {
      await pool.query("CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON pedidos(cliente_id)");
      logs.push("[pedidos] Index cliente_id criado");
    } catch (e) {
      logs.push(`[pedidos] Index cliente_id erro: ${e.message}`);
    }
    try {
      await pool.query("CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON itens_pedido(pedido_id)");
      logs.push("[itens_pedido] Index pedido_id criado");
    } catch (e) {
      logs.push(`[itens_pedido] Index pedido_id erro: ${e.message}`);
    }
    try {
      await pool.query("CREATE INDEX IF NOT EXISTS idx_produto_ingredientes_produto_id ON produto_ingredientes(produto_id)");
      logs.push("[produto_ingredientes] Index produto_id criado");
    } catch (e) {
      logs.push(`[produto_ingredientes] Index produto_id erro: ${e.message}`);
    }
    logs.push(await addColumnSafe("combos", "imagem TEXT"));
    logs.push(await addColumnSafe("produtos", "descricao VARCHAR(1000)"));
    logs.push(await addColumnSafe("clientes", "is_revendedor BOOLEAN DEFAULT FALSE"));
    logs.push(await addColumnSafe("revendedores", "login VARCHAR(100)"));
    logs.push(await addColumnSafe("revendedores", "senha VARCHAR(255)"));
    logs.push(await addColumnSafe("combos", "ativo BOOLEAN DEFAULT TRUE"));
    logs.push(await addColumnSafe("pedidos", "desconto DECIMAL(10, 2) DEFAULT 0"));
    logs.push(await addColumnSafe("pedidos", "tipo_cliente VARCHAR(20) DEFAULT 'consumidor'"));
    logs.push(await addColumnSafe("produtos", "ativo BOOLEAN DEFAULT TRUE"));
    logs.push(await addColumnSafe("produtos", "eh_agregado BOOLEAN DEFAULT FALSE"));
    logs.push(await addColumnSafe("produtos", "custo DECIMAL(10, 2) DEFAULT 0"));
    logs.push(await addColumnSafe("depoimentos", "cargo VARCHAR(100) DEFAULT 'Cliente'"));
    logs.push(await addColumnSafe("ingredientes", "estoque_atual DECIMAL(10, 2) DEFAULT 0"));
    logs.push(await addColumnSafe("itens_pedido", "combo_id INT NULL"));
    logs.push(await addColumnSafe("itens_pedido", "tipo VARCHAR(20) DEFAULT 'produto'"));

    // Sincroniza estoque_atual com estoque para ingredientes que nunca tiveram movimentação
    try {
      await pool.query("UPDATE ingredientes SET estoque_atual = estoque WHERE estoque_atual = 0 AND estoque > 0");
      logs.push("[ingredientes] Sincronizado estoque_atual a partir de estoque");
    } catch (e) {
      logs.push(`[ingredientes] Erro ao sincronizar estoque_atual: ${e.message}`);
    }

    console.log("✅ Base de dados inicializada com sucesso");
    return logs;
  } catch (error) {
    console.error("❌ Erro na inicialização:", error.message);
    throw error;
  }
}