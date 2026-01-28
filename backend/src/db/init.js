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
        imagem LONGTEXT,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Itens do Combo
    await pool.query(`
      CREATE TABLE IF NOT EXISTS itens_combo (
        id INT AUTO_INCREMENT PRIMARY KEY,
        combo_id INT,
        produto_id INT,
        quantidade DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,
        FOREIGN KEY (produto_id) REFERENCES produtos(id)
      )
    `);

    // Tabela de Configurações do Sistema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chave VARCHAR(50) NOT NULL UNIQUE,
        valor LONGTEXT
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
        UNIQUE KEY unique_fav (cliente_id, produto_id)
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

    // Migrações (Colunas novas) - Executa uma por uma de forma segura
    logs.push(await addColumnSafe("ingredientes", "usado_para_revenda BOOLEAN DEFAULT TRUE"));
    logs.push(await addColumnSafe("produtos", "margem_revenda DECIMAL(10, 2) DEFAULT 0"));
    logs.push(await addColumnSafe("produtos", "preco_revenda DECIMAL(10, 2) DEFAULT 0"));
    logs.push(await addColumnSafe("produtos", "rendimento INTEGER DEFAULT 1"));
    logs.push(await addColumnSafe("produto_ingredientes", "apenas_revenda BOOLEAN DEFAULT FALSE"));
    logs.push(await addColumnSafe("produtos", "estoque DECIMAL(10, 2) DEFAULT 0"));
    logs.push(await addColumnSafe("produtos", "eh_destaque BOOLEAN DEFAULT FALSE"));
    logs.push(await addColumnSafe("produtos", "desconto_destaque DECIMAL(10, 2) DEFAULT 0"));
    
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
    logs.push(await addColumnSafe("clientes", "complemento VARCHAR(255)"));
    logs.push(await addColumnSafe("pedidos", "status_financeiro VARCHAR(20) DEFAULT 'A Receber'"));
    logs.push(await addColumnSafe("pedidos", "data_pagamento TIMESTAMP"));
    logs.push(await addColumnSafe("lancamentos_financeiros", "pedido_id INT"));
    logs.push(await addColumnSafe("lancamentos_financeiros", "parcela_numero INT DEFAULT 1"));
    logs.push(await addColumnSafe("lancamentos_financeiros", "total_parcelas INT DEFAULT 1"));
    logs.push(await addColumnSafe("lancamentos_financeiros", "group_id VARCHAR(50)"));

    console.log("✅ Base de dados inicializada com sucesso");
    return logs;
  } catch (error) {
    console.error("❌ Erro na inicialização:", error.message);
    throw error;
  }
}