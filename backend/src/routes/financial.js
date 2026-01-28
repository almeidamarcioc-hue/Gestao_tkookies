import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// LISTAR LANÇAMENTOS
router.get("/", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = "SELECT * FROM lancamentos_financeiros";
    const params = [];

    if (startDate && endDate) {
      query += " WHERE data_vencimento BETWEEN DATE(?) AND DATE(?)";
      params.push(startDate, endDate);
    }

    query += " ORDER BY data_vencimento ASC";
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar lançamentos" });
  }
});

// CRIAR LANÇAMENTO
router.post("/", async (req, res) => {
  const { tipo, descricao, valor, data_vencimento, status, parcelas } = req.body;
  
  const numParcelas = Number(parcelas) || 1;
  const connection = await pool.connect();

  try {
    await connection.query('BEGIN');

    const valorTotal = Number(valor);
    const valorParcela = valorTotal / numParcelas;
    
    // Data base para cálculo dos vencimentos
    const dataBase = new Date(data_vencimento);

    // Gera um ID de grupo se houver parcelamento para vincular os lançamentos
    const groupId = numParcelas > 1 ? `GRP-${Date.now()}-${Math.floor(Math.random() * 1000)}` : null;

    for (let i = 0; i < numParcelas; i++) {
      // Calcula o vencimento (mês a mês)
      const vencimento = new Date(dataBase);
      vencimento.setMonth(vencimento.getMonth() + i);
      const vencimentoStr = vencimento.toISOString().split('T')[0];

      // Adiciona info da parcela na descrição se for parcelado
      const descFinal = numParcelas > 1 ? `${descricao} (${i + 1}/${numParcelas})` : descricao;

      await connection.query(
        "INSERT INTO lancamentos_financeiros (tipo, descricao, valor, data_vencimento, status, parcela_numero, total_parcelas, group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [tipo, descFinal, valorParcela, vencimentoStr, status || 'Pendente', i + 1, numParcelas, groupId]
      );
    }

    await connection.query('COMMIT');
    res.status(201).json({ message: numParcelas > 1 ? "Lançamentos parcelados criados!" : "Lançamento criado!" });
  } catch (error) {
    await connection.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: "Erro ao criar lançamento" });
  } finally {
    connection.release();
  }
});

// ATUALIZAR LANÇAMENTO
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { tipo, descricao, valor, data_vencimento, status } = req.body;
  try {
    await pool.query(
      "UPDATE lancamentos_financeiros SET tipo = ?, descricao = ?, valor = ?, data_vencimento = ?, status = ? WHERE id = ?",
      [tipo, descricao, valor, data_vencimento, status, id]
    );
    res.json({ message: "Lançamento atualizado!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar lançamento" });
  }
});

// DELETAR LANÇAMENTO
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { deleteAll } = req.query;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Se o usuário pediu para deletar todas as parcelas
    if (deleteAll === 'true') {
      const result = await client.query("SELECT group_id, descricao, total_parcelas FROM lancamentos_financeiros WHERE id = ?", [id]);
      
      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Lançamento não encontrado." });
      }
      
      const item = result.rows[0];
      
      // Estratégia 1: Usar group_id (preferencial)
      if (item.group_id) {
        await client.query("DELETE FROM lancamentos_financeiros WHERE group_id = ?", [item.group_id]);
        await client.query("COMMIT");
        return res.json({ message: "Todas as parcelas foram removidas!" });
      } 
      // Estratégia 2: Fallback para registros antigos sem group_id
      else if (item.total_parcelas > 1) {
        const baseDescription = item.descricao.replace(/\s\(\d+\/\d+\)$/, '').trim();
        
        const deleteResult = await client.query(
          "DELETE FROM lancamentos_financeiros WHERE descricao LIKE ? AND total_parcelas = ?",
          [`${baseDescription} (%/${item.total_parcelas})`, item.total_parcelas]
        );

        if (deleteResult.rowCount > 0) {
            await client.query("COMMIT");
            return res.json({ message: "Todas as parcelas foram removidas!" });
        }
      }
    }

    // Fallback final: deleta apenas o item individual se as estratégias de exclusão em massa não se aplicarem.
    await client.query("DELETE FROM lancamentos_financeiros WHERE id = ?", [id]);
    await client.query("COMMIT");
    res.json({ message: "Lançamento removido!" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Erro ao remover lançamento" });
  } finally {
    client.release();
  }
});

// DASHBOARD FINANCEIRO (Metas e Provisões)
router.get("/dashboard", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let startStr, endStr;

    if (startDate && endDate) {
      startStr = startDate;
      endStr = endDate;
    } else {
      // Data de hoje (Padrão: Semana Atual)
      const now = new Date();
      const currentDay = now.getDay(); // 0 (Dom) - 6 (Sab)
      const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
      
      const mondayDate = new Date(now);
      mondayDate.setDate(now.getDate() - distanceToMonday);
      startStr = mondayDate.toISOString().split('T')[0];

      const sundayDate = new Date(mondayDate);
      sundayDate.setDate(mondayDate.getDate() + 6);
      endStr = sundayDate.toISOString().split('T')[0];
    }

    // 1. Meta Total da Semana (Contas Pendentes + Contas Pagas na semana)
    const metaRes = await pool.query(
      `SELECT SUM(valor) as total FROM lancamentos_financeiros 
       WHERE tipo = 'Saída' 
       AND (
         (status = 'Pendente' AND DATE(data_vencimento) <= DATE(?))
         OR
         (status = 'Pago' AND DATE(data_vencimento) BETWEEN DATE(?) AND DATE(?))
       )`,
      [endStr, startStr, endStr]
    );
    const totalMeta = Number(metaRes.rows[0].total) || 0;

    // 2. Vendas Realizadas (Entradas Pagas na semana)
    const vendasRes = await pool.query(
      `SELECT SUM(valor) as total FROM lancamentos_financeiros 
       WHERE tipo = 'Entrada' AND status = 'Pago' 
       AND DATE(data_vencimento) BETWEEN DATE(?) AND DATE(?)`,
      [startStr, endStr]
    );
    const totalVendas = Number(vendasRes.rows[0].total) || 0;

    // 3. Provisão de Recebimento: Entradas Pendentes
    const provisaoRes = await pool.query(
      "SELECT SUM(valor) as total FROM lancamentos_financeiros WHERE tipo = 'Entrada' AND status = 'Pendente'"
    );
    const totalProvisao = Number(provisaoRes.rows[0].total) || 0;

    // Falta para Meta (Total Meta - Total Vendas)
    const faltaParaMeta = Math.max(0, totalMeta - totalVendas);

    // Cálculo do Desafio Diário (Acumulando dias passados no dia atual)
    const todayDate = new Date();
    const todayStr = todayDate.toISOString().split('T')[0];
    const today = new Date(todayStr);
    const end = new Date(endStr);
    const start = new Date(startStr);

    // Dias Restantes (incluindo hoje)
    let remainingDays = 1;
    if (end < today) {
      remainingDays = 1;
    } else if (start > today) {
      const diff = end.getTime() - start.getTime();
      remainingDays = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    } else {
      const diff = end.getTime() - today.getTime();
      remainingDays = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    }
    if (remainingDays < 1) remainingDays = 1;

    // Cálculo do Desafio Diário: Valor restante dividido pelos dias restantes
    let desafioDiario = faltaParaMeta / remainingDays;

    // Vendas Hoje (Realmente hoje)
    const vendasHojeRes = await pool.query(
      "SELECT SUM(valor) as total FROM lancamentos_financeiros WHERE tipo = 'Entrada' AND status = 'Pago' AND DATE(data_vencimento) = DATE(?) AND DATE(data_vencimento) BETWEEN DATE(?) AND DATE(?)",
      [todayStr, startStr, endStr]
    );
    const vendasHoje = Number(vendasHojeRes.rows[0].total) || 0;

    // Provisão Hoje (Vence hoje)
    const provisaoHojeRes = await pool.query(
      "SELECT SUM(valor) as total FROM lancamentos_financeiros WHERE tipo = 'Entrada' AND status = 'Pendente' AND DATE(data_vencimento) = DATE(?) AND DATE(data_vencimento) BETWEEN DATE(?) AND DATE(?)",
      [todayStr, startStr, endStr]
    );
    const provisaoHoje = Number(provisaoHojeRes.rows[0].total) || 0;

    // --- CÁLCULOS MENSAIS (Baseado no filtro) ---
    // Usamos startStr para definir o mês de referência (evita pegar o próximo mês na última semana)
    const [y, m, d] = startStr.split('-').map(Number);
    const startMonth = `${y}-${String(m).padStart(2, '0')}-01`;
    const endMonth = new Date(Date.UTC(y, m, 0)).toISOString().split('T')[0];

    // Para garantir que a Meta Mensal cubra toda a semana (caso a semana invada o próximo mês),
    // estendemos o fim do período mensal para o fim da semana, se necessário.
    const effectiveEndMonth = endStr > endMonth ? endStr : endMonth;

    // 1. Meta Mensal
    const metaMensalRes = await pool.query(
      `SELECT SUM(valor) as total FROM lancamentos_financeiros 
       WHERE tipo = 'Saída' 
       AND (
         (status = 'Pendente' AND DATE(data_vencimento) <= DATE(?))
         OR
         (status = 'Pago' AND DATE(data_vencimento) BETWEEN DATE(?) AND DATE(?))
       )`,
      [effectiveEndMonth, startMonth, effectiveEndMonth]
    );
    const totalMetaMensal = Number(metaMensalRes.rows[0].total) || 0;

    // 2. Vendas Mensais
    const vendasMensalRes = await pool.query(
      `SELECT SUM(valor) as total FROM lancamentos_financeiros 
       WHERE tipo = 'Entrada' AND status = 'Pago' 
       AND DATE(data_vencimento) BETWEEN DATE(?) AND DATE(?)`,
      [startMonth, effectiveEndMonth]
    );
    const totalVendasMensal = Number(vendasMensalRes.rows[0].total) || 0;

    // 3. Provisão Mensal
    const provisaoMensalRes = await pool.query(
      "SELECT SUM(valor) as total FROM lancamentos_financeiros WHERE tipo = 'Entrada' AND status = 'Pendente' AND DATE(data_vencimento) BETWEEN DATE(?) AND DATE(?)",
      [startMonth, effectiveEndMonth]
    );
    const totalProvisaoMensal = Number(provisaoMensalRes.rows[0].total) || 0;

    const faltaMetaMensal = Math.max(0, totalMetaMensal - totalVendasMensal);

    res.json({
      meta_diaria: totalMeta,
      vendas_pagas_hoje: totalVendas,
      falta_para_meta: faltaParaMeta,
      provisao_recebimento: totalProvisao,
      periodo_inicio: startStr,
      periodo_fim: endStr,
      desafio_diario: desafioDiario,
      vendas_hoje_real: vendasHoje,
      provisao_hoje: provisaoHoje,
      meta_mensal: totalMetaMensal,
      vendas_mensal: totalVendasMensal,
      falta_meta_mensal: faltaMetaMensal,
      provisao_mensal: totalProvisaoMensal
    });
  } catch (error) {
    console.error("Erro no dashboard financeiro:", error);
    res.status(500).json({ error: "Erro ao calcular dashboard" });
  }
});

export default router;