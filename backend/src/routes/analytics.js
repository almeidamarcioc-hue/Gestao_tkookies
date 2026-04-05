import { Router } from "express";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { requireRole } from "../middlewares/auth.js";

const router = Router();

function getAnalyticsClient() {
  const privateKey = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.GA_CLIENT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error("Credenciais do Google Analytics não configuradas.");
  }

  return new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey }
  });
}

// Visão geral: sessões, usuários, visualizações dos últimos N dias
router.get("/overview", requireRole('admin'), async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    const client = getAnalyticsClient();
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      metrics: [
        { name: "sessions" },
        { name: "activeUsers" },
        { name: "screenPageViews" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
    });

    const row = response.rows?.[0]?.metricValues || [];
    res.json({
      sessions: parseInt(row[0]?.value || 0),
      users: parseInt(row[1]?.value || 0),
      pageViews: parseInt(row[2]?.value || 0),
      bounceRate: parseFloat(row[3]?.value || 0).toFixed(1),
      avgSessionDuration: parseFloat(row[4]?.value || 0).toFixed(0),
    });
  } catch (err) {
    console.error("GA overview error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Sessões por dia (para gráfico de linha)
router.get("/sessions-by-day", requireRole('admin'), async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    const client = getAnalyticsClient();
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    });

    const data = (response.rows || []).map(row => ({
      date: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
    }));
    res.json(data);
  } catch (err) {
    console.error("GA sessions-by-day error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Páginas mais acessadas
router.get("/top-pages", requireRole('admin'), async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    const client = getAnalyticsClient();
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 10,
    });

    const data = (response.rows || []).map(row => ({
      page: row.dimensionValues[0].value,
      views: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
    }));
    res.json(data);
  } catch (err) {
    console.error("GA top-pages error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Origem do tráfego
router.get("/traffic-sources", requireRole('admin'), async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    const client = getAnalyticsClient();
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "sessionDefaultChannelGrouping" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 8,
    });

    const data = (response.rows || []).map(row => ({
      source: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value),
    }));
    res.json(data);
  } catch (err) {
    console.error("GA traffic-sources error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Dispositivos
router.get("/devices", requireRole('admin'), async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    const client = getAnalyticsClient();
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    });

    const data = (response.rows || []).map(row => ({
      device: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value),
    }));
    res.json(data);
  } catch (err) {
    console.error("GA devices error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
