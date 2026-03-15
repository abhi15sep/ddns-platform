import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database unreachable' });
  }
});

// Public uptime stats endpoint
router.get('/uptime', async (_req, res) => {
  try {
    // Get uptime percentages for 7d, 30d, 90d per service
    const query = `
      WITH ranges AS (
        SELECT unnest(ARRAY[7, 30, 90]) AS days
      ),
      stats AS (
        SELECT
          r.days,
          uc.service,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE uc.status = 'ok') AS ok_count
        FROM ranges r
        JOIN uptime_checks uc ON uc.checked_at >= NOW() - (r.days || ' days')::INTERVAL
        GROUP BY r.days, uc.service
      )
      SELECT days, service, total, ok_count,
        ROUND(ok_count::NUMERIC / NULLIF(total, 0) * 100, 2) AS uptime_pct
      FROM stats
      ORDER BY days, service;
    `;
    const result = await pool.query(query);

    // Get current status (latest check per service)
    const currentQuery = `
      SELECT DISTINCT ON (service) service, status, latency_ms, detail, checked_at
      FROM uptime_checks
      ORDER BY service, checked_at DESC;
    `;
    const currentResult = await pool.query(currentQuery);

    // Get last 24h incident count (any non-ok check)
    const incidentQuery = `
      SELECT COUNT(DISTINCT DATE_TRUNC('hour', checked_at)) AS incident_hours
      FROM uptime_checks
      WHERE checked_at >= NOW() - INTERVAL '24 hours'
        AND status != 'ok';
    `;
    const incidentResult = await pool.query(incidentQuery);

    // Structure response
    const uptimeByRange: Record<number, Record<string, number>> = {};
    for (const row of result.rows) {
      if (!uptimeByRange[row.days]) uptimeByRange[row.days] = {};
      uptimeByRange[row.days][row.service] = parseFloat(row.uptime_pct) || 0;
    }

    // Overall uptime per range (average across services)
    const overall: Record<string, number> = {};
    for (const days of [7, 30, 90]) {
      const services = uptimeByRange[days];
      if (services) {
        const values = Object.values(services);
        overall[`${days}d`] = values.length > 0
          ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100
          : 0;
      } else {
        overall[`${days}d`] = 0;
      }
    }

    const currentServices = currentResult.rows.map(r => ({
      service: r.service,
      status: r.status,
      latency_ms: r.latency_ms,
      detail: r.detail,
      checked_at: r.checked_at,
    }));

    const allOk = currentServices.every(s => s.status === 'ok');
    const anyDown = currentServices.some(s => s.status === 'down');
    const currentOverall = currentServices.length === 0 ? 'unknown'
      : allOk ? 'ok'
      : anyDown ? 'down'
      : 'degraded';

    res.json({
      status: currentOverall,
      uptime: overall,
      services: currentServices,
      incidents_24h: parseInt(incidentResult.rows[0]?.incident_hours) || 0,
      checked_at: currentServices[0]?.checked_at || null,
    });
  } catch (err) {
    // If the table doesn't exist yet, return empty data
    res.json({
      status: 'unknown',
      uptime: { '7d': 0, '30d': 0, '90d': 0 },
      services: [],
      incidents_24h: 0,
      checked_at: null,
    });
  }
});

export default router;