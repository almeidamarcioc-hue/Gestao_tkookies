import { pool } from "./index.js";

// Importante: exportar para que os outros ficheiros vejam o pool
export { pool };

export async function initDatabase() {
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

    // Migração para adicionar a coluna caso a tabela já exista
    try {
      await pool.query("ALTER TABLE ingredientes ADD COLUMN IF NOT EXISTS usado_para_revenda BOOLEAN DEFAULT TRUE");
      await pool.query("ALTER TABLE produtos ADD COLUMN IF NOT EXISTS margem_revenda DECIMAL(10, 2) DEFAULT 0");
      await pool.query("ALTER TABLE produtos ADD COLUMN IF NOT EXISTS preco_revenda DECIMAL(10, 2) DEFAULT 0");
      await pool.query("ALTER TABLE produtos ADD COLUMN IF NOT EXISTS rendimento INTEGER DEFAULT 1");
      await pool.query("ALTER TABLE produto_ingredientes ADD COLUMN IF NOT EXISTS apenas_revenda BOOLEAN DEFAULT FALSE");
      await pool.query("ALTER TABLE produtos ADD COLUMN IF NOT EXISTS estoque DECIMAL(10, 2) DEFAULT 0");
    } catch (e) {
      console.log("Nota: Verificação de coluna 'usado_para_revenda' concluída.");
    }

    console.log("✅ Base de dados inicializada com sucesso");
  } catch (error) {
    console.error("❌ Erro na inicialização:", error.message);
    throw error;
  }
}