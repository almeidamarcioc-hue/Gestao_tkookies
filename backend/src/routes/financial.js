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
      query += " WHERE data_vencimento BETWEEN $1::date AND $2::date";
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
        "INSERT INTO lancamentos_financeiros (tipo, descricao, valor, data_vencimento, status, parcela_numero, total_parcelas, group_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
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
      "UPDATE lancamentos_financeiros SET tipo = $1, descricao = $2, valor = $3, data_vencimento = $4, status = $5 WHERE id = $6",
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
      const result = await client.query("SELECT group_id, descricao, total_parcelas FROM lancamentos_financeiros WHERE id = $1", [id]);

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Lançamento não encontrado." });
      }

      const item = result.rows[0];

      // Estratégia 1: Usar group_id (preferencial)
      if (item.group_id) {
        await client.query("DELETE FROM lancamentos_financeiros WHERE group_id = $1", [item.group_id]);
        await client.query("COMMIT");
        return res.json({ message: "Todas as parcelas foram removidas!" });
      }
      // Estratégia 2: Fallback para registros antigos sem group_id
      else if (item.total_parcelas > 1) {
        const baseDescription = item.descricao.replace(/\s\(\d+\/\d+\)$/, '').trim();

        const deleteResult = await client.query(
          "DELETE FROM lancamentos_financeiros WHERE descricao LIKE $1 AND total_parcelas = $2",
          [`${baseDescription} (%/${item.total_parcelas})`, item.total_parcelas]
        );

        if (deleteResult.rowCount > 0) {
            await client.query("COMMIT");
            return res.json({ message: "Todas as parcelas foram removidas!" });
        }
      }
    }

    // Fallback final: deleta apenas o item individual
    await client.query("DELETE FROM lancamentos_financeiros WHERE id = $1", [id]);
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

    // Cálculos de datas auxiliares
    const todayDate = new Date();
    const todayStr = todayDate.toISOString().split('T')[0];
    const today = new Date(todayStr);
    const end = new Date(endStr);
    const start = new Date(startStr);

    const [y, m] = startStr.split('-').map(Number);
    const startMonth = `${y}-${String(m).padStart(2, '0')}-01`;
    const endMonth = new Date(Date.UTC(y, m, 0)).toISOString().split('T')[0];
    const effectiveEndMonth = endStr > endMonth ? endStr : endMonth;

    // 1 query no lugar de 8 — usa agregação condicional (CASE WHEN)
    const dashRes = await pool.query(
      `SELECT
        SUM(CASE WHEN tipo = 'Saída' AND (
          (status = 'Pendente' AND data_vencimento <= $1::date)
          OR (status = 'Pago' AND data_vencimento BETWEEN $2::date AND $3::date)
        ) THEN valor ELSE 0 END) as meta_semana,

        SUM(CASE WHEN tipo = 'Entrada' AND status = 'Pago'
          AND data_vencimento BETWEEN $4::date AND $5::date
        THEN valor ELSE 0 END) as vendas_semana,

        SUM(CASE WHEN tipo = 'Entrada' AND status = 'Pendente'
        THEN valor ELSE 0 END) as provisao_total,

        SUM(CASE WHEN tipo = 'Entrada' AND status = 'Pago'
          AND data_vencimento = $6::date
          AND data_vencimento BETWEEN $7::date AND $8::date
        THEN valor ELSE 0 END) as vendas_hoje,

        SUM(CASE WHEN tipo = 'Entrada' AND status = 'Pendente'
          AND data_vencimento = $9::date
          AND data_vencimento BETWEEN $10::date AND $11::date
        THEN valor ELSE 0 END) as provisao_hoje,

        SUM(CASE WHEN tipo = 'Saída' AND (
          (status = 'Pendente' AND data_vencimento <= $12::date)
          OR (status = 'Pago' AND data_vencimento BETWEEN $13::date AND $14::date)
        ) THEN valor ELSE 0 END) as meta_mensal,

        SUM(CASE WHEN tipo = 'Entrada' AND status = 'Pago'
          AND data_vencimento BETWEEN $15::date AND $16::date
        THEN valor ELSE 0 END) as vendas_mensal,

        SUM(CASE WHEN tipo = 'Entrada' AND status = 'Pendente'
          AND data_vencimento BETWEEN $17::date AND $18::date
        THEN valor ELSE 0 END) as provisao_mensal

      FROM lancamentos_financeiros`,
      [
        // meta_semana: $1, $2, $3
        endStr, startStr, endStr,
        // vendas_semana: $4, $5
        startStr, endStr,
        // vendas_hoje: $6, $7, $8
        todayStr, startStr, endStr,
        // provisao_hoje: $9, $10, $11
        todayStr, startStr, endStr,
        // meta_mensal: $12, $13, $14
        effectiveEndMonth, startMonth, effectiveEndMonth,
        // vendas_mensal: $15, $16
        startMonth, effectiveEndMonth,
        // provisao_mensal: $17, $18
        startMonth, effectiveEndMonth
      ]
    );

    const row = dashRes.rows[0];
    const totalMeta = Number(row.meta_semana) || 0;
    const totalVendas = Number(row.vendas_semana) || 0;
    const totalProvisao = Number(row.provisao_total) || 0;
    const vendasHoje = Number(row.vendas_hoje) || 0;
    const provisaoHoje = Number(row.provisao_hoje) || 0;
    const totalMetaMensal = Number(row.meta_mensal) || 0;
    const totalVendasMensal = Number(row.vendas_mensal) || 0;
    const totalProvisaoMensal = Number(row.provisao_mensal) || 0;

    const faltaParaMeta = Math.max(0, totalMeta - totalVendas);

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

    const desafioDiario = faltaParaMeta / remainingDays;
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
