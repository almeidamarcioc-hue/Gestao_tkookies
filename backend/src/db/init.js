import { pool } from "./index.js";

export { pool };

async function addColumnSafe(table, columnDef) {
  try {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${columnDef}`);
    return `[${table}] OK: ${columnDef}`;
  } catch (e) {
    return `[${table}] Erro: ${e.message}`;
  }
}

export async function initDatabase() {
  const logs = [];
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ingredientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        unidade VARCHAR(50) NOT NULL,
        estoque DECIMAL(10, 2) DEFAULT 0,
        custo DECIMAL(10, 2) DEFAULT 0,
        usado_para_revenda BOOLEAN DEFAULT TRUE,
        estoque_atual DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        preco_venda DECIMAL(10, 2) NOT NULL,
        margem_venda DECIMAL(10, 2) DEFAULT 0,
        margem_revenda DECIMAL(10, 2) DEFAULT 0,
        preco_revenda DECIMAL(10, 2) DEFAULT 0,
        rendimento INTEGER DEFAULT 1,
        estoque DECIMAL(10, 2) DEFAULT 0,
        eh_destaque BOOLEAN DEFAULT FALSE,
        desconto_destaque DECIMAL(10, 2) DEFAULT 0,
        validade_promocao DATE,
        descricao VARCHAR(1000),
        ativo BOOLEAN DEFAULT TRUE,
        eh_agregado BOOLEAN DEFAULT FALSE,
        custo DECIMAL(10, 2) DEFAULT 0,
        ocasiao VARCHAR(200) DEFAULT NULL,
        eh_brinde BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS produto_ingredientes (
        id SERIAL PRIMARY KEY,
        produto_id INT REFERENCES produtos(id) ON DELETE CASCADE,
        ingrediente_id INT REFERENCES ingredientes(id) ON DELETE CASCADE,
        quantidade DECIMAL(10, 2) NOT NULL,
        apenas_revenda BOOLEAN DEFAULT FALSE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS produto_imagens (
        id SERIAL PRIMARY KEY,
        produto_id INT REFERENCES produtos(id) ON DELETE CASCADE,
        imagem TEXT,
        eh_capa BOOLEAN DEFAULT FALSE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(50),
        endereco VARCHAR(255),
        numero VARCHAR(50),
        complemento VARCHAR(255),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        login VARCHAR(100) UNIQUE,
        senha VARCHAR(255),
        role VARCHAR(20) DEFAULT 'cliente',
        is_revendedor BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        cliente_id INT REFERENCES clientes(id),
        data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        valor_total DECIMAL(10, 2) DEFAULT 0,
        forma_pagamento VARCHAR(50),
        observacao TEXT,
        frete DECIMAL(10, 2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'Novo',
        status_financeiro VARCHAR(20) DEFAULT 'A Receber',
        data_pagamento TIMESTAMP,
        desconto DECIMAL(10, 2) DEFAULT 0,
        tipo_cliente VARCHAR(20) DEFAULT 'consumidor',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS itens_pedido (
        id SERIAL PRIMARY KEY,
        pedido_id INT REFERENCES pedidos(id) ON DELETE CASCADE,
        produto_id INT REFERENCES produtos(id),
        quantidade DECIMAL(10, 2) NOT NULL,
        valor_unitario DECIMAL(10, 2) NOT NULL,
        valor_total DECIMAL(10, 2) NOT NULL,
        combo_id INT NULL,
        tipo VARCHAR(20) DEFAULT 'produto',
        eh_brinde BOOLEAN DEFAULT FALSE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS combos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        preco_venda DECIMAL(10, 2) NOT NULL,
        estoque DECIMAL(10, 2) DEFAULT 0,
        produto_id INT,
        imagem TEXT,
        ativo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS combo_itens (
        id SERIAL PRIMARY KEY,
        combo_id INT REFERENCES combos(id) ON DELETE CASCADE,
        produto_id INT REFERENCES produtos(id),
        quantidade DECIMAL(10, 2) NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS produto_agregados (
        produto_id INT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
        agregado_id INT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
        preco DECIMAL(10, 2) DEFAULT 0,
        PRIMARY KEY (produto_id, agregado_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        id SERIAL PRIMARY KEY,
        chave VARCHAR(50) NOT NULL UNIQUE,
        valor TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS favoritos (
        id SERIAL PRIMARY KEY,
        cliente_id INT REFERENCES clientes(id) ON DELETE CASCADE,
        produto_id INT REFERENCES produtos(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_fav UNIQUE (cliente_id, produto_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS revendedores (
        id SERIAL PRIMARY KEY,
        razao_social VARCHAR(255) NOT NULL,
        cpf_cnpj VARCHAR(20) NOT NULL,
        nome_contato VARCHAR(100) NOT NULL,
        telefone VARCHAR(20),
        cep VARCHAR(10),
        cidade VARCHAR(100),
        estado CHAR(2),
        login VARCHAR(100),
        senha VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(20) NOT NULL,
        descricao VARCHAR(255) NOT NULL,
        valor DECIMAL(10, 2) NOT NULL,
        data_vencimento DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'Pendente',
        pedido_id INT,
        parcela_numero INT DEFAULT 1,
        total_parcelas INT DEFAULT 1,
        group_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS depoimentos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        cargo VARCHAR(100) DEFAULT 'Cliente',
        texto TEXT NOT NULL,
        imagem TEXT,
        ativo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS produto_brindes (
        produto_id INT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
        brinde_produto_id INT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
        tipo_quantidade VARCHAR(20) NOT NULL DEFAULT 'unidade',
        PRIMARY KEY (produto_id, brinde_produto_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pontos_fidelidade (
        id SERIAL PRIMARY KEY,
        cliente_id INT NOT NULL REFERENCES clientes(id),
        pedido_id INT REFERENCES pedidos(id) ON DELETE SET NULL,
        pontos INT NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        descricao VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cupons (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('percentual', 'valor')),
        valor NUMERIC(10,2) NOT NULL,
        ativo BOOLEAN DEFAULT true,
        validade DATE,
        valor_minimo NUMERIC(10,2) DEFAULT 0,
        uso_maximo INT,
        usos_realizados INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    logs.push(await addColumnSafe("pedidos", "cupom_codigo VARCHAR(50)"));

    // Índices de performance
    const indices = [
      "CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON pedidos(cliente_id)",
      "CREATE INDEX IF NOT EXISTS idx_pedidos_data_pedido ON pedidos(data_pedido)",
      "CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status)",
      "CREATE INDEX IF NOT EXISTS idx_pedidos_data_status ON pedidos(data_pedido, status)",
      "CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON itens_pedido(pedido_id)",
      "CREATE INDEX IF NOT EXISTS idx_itens_pedido_produto_id ON itens_pedido(produto_id)",
      "CREATE INDEX IF NOT EXISTS idx_produto_ingredientes_produto_id ON produto_ingredientes(produto_id)",
      "CREATE INDEX IF NOT EXISTS idx_produto_imagens_produto_id ON produto_imagens(produto_id)",
      "CREATE INDEX IF NOT EXISTS idx_favoritos_cliente_id ON favoritos(cliente_id)",
      "CREATE INDEX IF NOT EXISTS idx_combo_itens_combo_id ON combo_itens(combo_id)",
      "CREATE INDEX IF NOT EXISTS idx_lancamentos_data_vencimento ON lancamentos_financeiros(data_vencimento)",
      "CREATE INDEX IF NOT EXISTS idx_lancamentos_pedido_id ON lancamentos_financeiros(pedido_id)",
      "CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo)",
      "CREATE INDEX IF NOT EXISTS idx_pontos_fidelidade_cliente_id ON pontos_fidelidade(cliente_id)",
    ];

    for (const sql of indices) {
      try {
        await pool.query(sql);
      } catch (e) {
        logs.push(`[index] ${e.message}`);
      }
    }

    // Sincroniza estoque_atual com estoque para ingredientes sem movimentação
    try {
      await pool.query("UPDATE ingredientes SET estoque_atual = estoque WHERE estoque_atual = 0 AND estoque > 0");
    } catch (e) {
      logs.push(`[ingredientes] Erro ao sincronizar estoque_atual: ${e.message}`);
    }

    console.log("✅ Base de dados PostgreSQL inicializada com sucesso");
    return logs;
  } catch (error) {
    console.error("❌ Erro na inicialização:", error.message);
    throw error;
  }
}
