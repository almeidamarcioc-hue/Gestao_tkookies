/**
 * copy-prod-to-homologacao.mjs
 *
 * Copia todos os dados de produção para o banco de homologação.
 * Uso: cd backend && node copy-prod-to-homologacao.mjs
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Configuração dos bancos ───────────────────────────────────────────────
const PROD = {
  host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '28wYTpFfo28XSLi.root',
  password: 'aqpoS8oXf927JGyH',
  database: 'test',
  ssl: { ca: fs.readFileSync('/etc/ssl/cert.pem') },
  waitForConnections: true,
  connectionLimit: 5,
};

const HOMO = {
  host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '4XdA3ikxEF4hpSK.root',
  password: 'ozkuYMTCkQWQ4Ug5',
  database: 'test',
  ssl: { ca: fs.readFileSync('/etc/ssl/cert.pem') },
  waitForConnections: true,
  connectionLimit: 5,
};

// Ordem respeita dependências de FK
const TABLES = [
  'ingredientes',
  'produtos',
  'clientes',
  'combos',
  'revendedores',
  'depoimentos',
  'configuracoes',
  'produto_ingredientes',
  'produto_imagens',
  'produto_agregados',
  'pedidos',
  'itens_pedido',
  'combo_itens',
  'lancamentos_financeiros',
  'favoritos',
  'pontos_fidelidade',
];

async function copyTable(prod, homo, table) {
  const [rows] = await prod.query(`SELECT * FROM \`${table}\``);
  if (!rows.length) {
    console.log(`  ⬜ ${table}: vazia, pulando.`);
    return 0;
  }

  await homo.query(`DELETE FROM \`${table}\``);

  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const colList = columns.map(c => `\`${c}\``).join(', ');
  const sql = `INSERT INTO \`${table}\` (${colList}) VALUES (${placeholders})`;

  let count = 0;
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    for (const row of batch) {
      await homo.query(sql, columns.map(c => row[c]));
      count++;
    }
  }
  return count;
}

async function initSchema(homo) {
  console.log('\n📐 Inicializando schema no banco de homologação...');

  const schema = [
    `CREATE TABLE IF NOT EXISTS ingredientes (
      id INT AUTO_INCREMENT PRIMARY KEY, nome VARCHAR(255) NOT NULL,
      unidade VARCHAR(50) NOT NULL, estoque DECIMAL(10,2) DEFAULT 0,
      custo DECIMAL(10,2) DEFAULT 0, usado_para_revenda BOOLEAN DEFAULT TRUE,
      estoque_atual DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS produtos (
      id INT AUTO_INCREMENT PRIMARY KEY, nome VARCHAR(255) NOT NULL,
      preco_venda DECIMAL(10,2) NOT NULL, margem_revenda DECIMAL(10,2) DEFAULT 0,
      preco_revenda DECIMAL(10,2) DEFAULT 0, rendimento INTEGER DEFAULT 1,
      estoque DECIMAL(10,2) DEFAULT 0, eh_destaque BOOLEAN DEFAULT FALSE,
      desconto_destaque DECIMAL(10,2) DEFAULT 0, validade_promocao DATE,
      descricao VARCHAR(1000), ativo BOOLEAN DEFAULT TRUE,
      eh_agregado BOOLEAN DEFAULT FALSE, custo DECIMAL(10,2) DEFAULT 0,
      ocasiao VARCHAR(200) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS produto_ingredientes (
      id INT AUTO_INCREMENT PRIMARY KEY, produto_id INT, ingrediente_id INT,
      quantidade DECIMAL(10,2) NOT NULL, apenas_revenda BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
      FOREIGN KEY (ingrediente_id) REFERENCES ingredientes(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS produto_imagens (
      id INT AUTO_INCREMENT PRIMARY KEY, produto_id INT,
      imagem MEDIUMTEXT, eh_capa BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS clientes (
      id INT AUTO_INCREMENT PRIMARY KEY, nome VARCHAR(255) NOT NULL,
      telefone VARCHAR(50), endereco VARCHAR(255), numero VARCHAR(50),
      complemento VARCHAR(255), bairro VARCHAR(100), cidade VARCHAR(100),
      login VARCHAR(100) UNIQUE, senha VARCHAR(255),
      role VARCHAR(20) DEFAULT 'cliente',
      is_revendedor BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS pedidos (
      id INT AUTO_INCREMENT PRIMARY KEY, cliente_id INT,
      data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      valor_total DECIMAL(10,2) DEFAULT 0, forma_pagamento VARCHAR(50),
      observacao TEXT, frete DECIMAL(10,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'Novo',
      status_financeiro VARCHAR(20) DEFAULT 'A Receber',
      data_pagamento TIMESTAMP NULL,
      desconto DECIMAL(10,2) DEFAULT 0,
      tipo_cliente VARCHAR(20) DEFAULT 'consumidor',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id))`,
    `CREATE TABLE IF NOT EXISTS itens_pedido (
      id INT AUTO_INCREMENT PRIMARY KEY, pedido_id INT, produto_id INT,
      quantidade DECIMAL(10,2) NOT NULL, valor_unitario DECIMAL(10,2) NOT NULL,
      valor_total DECIMAL(10,2) NOT NULL, combo_id INT NULL,
      tipo VARCHAR(20) DEFAULT 'produto',
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
      FOREIGN KEY (produto_id) REFERENCES produtos(id))`,
    `CREATE TABLE IF NOT EXISTS combos (
      id INT AUTO_INCREMENT PRIMARY KEY, nome VARCHAR(255) NOT NULL,
      preco_venda DECIMAL(10,2) NOT NULL, estoque DECIMAL(10,2) DEFAULT 0,
      produto_id INT, imagem MEDIUMTEXT, ativo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS combo_itens (
      id INT AUTO_INCREMENT PRIMARY KEY, combo_id INT, produto_id INT,
      quantidade DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,
      FOREIGN KEY (produto_id) REFERENCES produtos(id))`,
    `CREATE TABLE IF NOT EXISTS produto_agregados (
      produto_id INT NOT NULL, agregado_id INT NOT NULL,
      preco DECIMAL(10,2) DEFAULT 0,
      PRIMARY KEY (produto_id, agregado_id),
      FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
      FOREIGN KEY (agregado_id) REFERENCES produtos(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS configuracoes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      chave VARCHAR(50) NOT NULL UNIQUE, valor MEDIUMTEXT)`,
    `CREATE TABLE IF NOT EXISTS favoritos (
      id INT AUTO_INCREMENT PRIMARY KEY, cliente_id INT, produto_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
      FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
      CONSTRAINT unique_fav UNIQUE (cliente_id, produto_id))`,
    `CREATE TABLE IF NOT EXISTS revendedores (
      id INT AUTO_INCREMENT PRIMARY KEY, razao_social VARCHAR(255) NOT NULL,
      cpf_cnpj VARCHAR(20) NOT NULL, nome_contato VARCHAR(100) NOT NULL,
      telefone VARCHAR(20), cep VARCHAR(10), cidade VARCHAR(100),
      estado CHAR(2), login VARCHAR(100), senha VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
      id INT AUTO_INCREMENT PRIMARY KEY, tipo VARCHAR(20) NOT NULL,
      descricao VARCHAR(255) NOT NULL, valor DECIMAL(10,2) NOT NULL,
      data_vencimento DATE NOT NULL, status VARCHAR(20) DEFAULT 'Pendente',
      pedido_id INT, parcela_numero INT DEFAULT 1,
      total_parcelas INT DEFAULT 1, group_id VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS depoimentos (
      id INT AUTO_INCREMENT PRIMARY KEY, nome VARCHAR(255) NOT NULL,
      cargo VARCHAR(100) DEFAULT 'Cliente', texto TEXT NOT NULL,
      imagem MEDIUMTEXT, ativo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS pontos_fidelidade (
      id INT AUTO_INCREMENT PRIMARY KEY, cliente_id INT NOT NULL,
      pedido_id INT, pontos INT NOT NULL, tipo VARCHAR(20) NOT NULL,
      descricao VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id),
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL)`,
  ];

  await homo.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const ddl of schema) {
    await homo.query(ddl);
  }

  // Garante MEDIUMTEXT para colunas de imagem (caso tabelas já existiam com TEXT)
  const alterations = [
    "ALTER TABLE produto_imagens MODIFY COLUMN imagem MEDIUMTEXT",
    "ALTER TABLE combos MODIFY COLUMN imagem MEDIUMTEXT",
    "ALTER TABLE depoimentos MODIFY COLUMN imagem MEDIUMTEXT",
    "ALTER TABLE configuracoes MODIFY COLUMN valor MEDIUMTEXT",
  ];
  for (const alt of alterations) {
    try { await homo.query(alt); } catch (_) { /* ignora se já é MEDIUMTEXT */ }
  }

  await homo.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('  ✅ Schema criado/verificado.');
}

async function main() {
  console.log('🔌 Conectando aos bancos de dados...');
  const prod = await mysql.createConnection({ ...PROD, multipleStatements: true });
  const homo = await mysql.createConnection({ ...HOMO, multipleStatements: true });
  console.log('  ✅ Produção conectada');
  console.log('  ✅ Homologação conectada');

  try {
    await initSchema(homo);

    console.log('\n📦 Copiando dados...');
    await homo.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of TABLES) {
      try {
        const count = await copyTable(prod, homo, table);
        if (count > 0) console.log(`  ✅ ${table}: ${count} registros copiados`);
      } catch (err) {
        console.warn(`  ⚠️  ${table}: erro — ${err.message}`);
      }
    }

    await homo.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n🎉 Cópia concluída! Banco de homologação atualizado com dados de produção.');
  } finally {
    await prod.end();
    await homo.end();
  }
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
