const pool = require("../db/pool");

// helper: arma WHERE dinámico sobre transacciones (t.*)
function buildTxWhere({ desde, hasta, tipo_operacion }) {
  const filters = [];
  const values = [];

  if (tipo_operacion) {
    values.push(tipo_operacion);
    filters.push(`t.tipo_operacion = $${values.length}`);
  }
  if (desde) {
    values.push(desde);
    filters.push(`t.fecha_transaccion >= $${values.length}`);
  }
  if (hasta) {
    values.push(hasta);
    filters.push(`t.fecha_transaccion <= $${values.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  return { where, values };
}

// GET /dashboard/kpis?desde&hasta&tipo_operacion
exports.getKpis = async (req, res, next) => {
  try {
    const { desde, hasta, tipo_operacion } = req.query;
    const { where, values } = buildTxWhere({ desde, hasta, tipo_operacion });

    // KPIs generales + comisiones pagadas vs pendientes
    const sql = `
      SELECT
        COUNT(DISTINCT t.id)::int AS transacciones_count,
        COALESCE(SUM(t.monto_total), 0) AS monto_total_sum,
        COALESCE(SUM(c.monto_comision), 0) AS comision_total_sum,
        COALESCE(SUM(c.empresa_ganancia), 0) AS ganancia_empresa_sum,

        COALESCE(SUM(CASE WHEN c.estatus_pago = 'pagado' THEN c.monto_comision ELSE 0 END), 0) AS comision_pagada_sum,
        COALESCE(SUM(CASE WHEN c.estatus_pago = 'pendiente' THEN c.monto_comision ELSE 0 END), 0) AS comision_pendiente_sum,
        COALESCE(SUM(CASE WHEN c.estatus_pago = 'cancelado' THEN c.monto_comision ELSE 0 END), 0) AS comision_cancelada_sum
      FROM transacciones t
      LEFT JOIN comisiones c ON c.transaccion_id = t.id
      ${where};
    `;

    const r = await pool.query(sql, values);
    const kpis = r.rows[0];

    // ticket promedio
    const txCount = Number(kpis.transacciones_count || 0);
    const montoTotal = Number(kpis.monto_total_sum || 0);
    const ticketPromedio = txCount > 0 ? montoTotal / txCount : 0;

    res.json({
      ok: true,
      data: {
        filtros: { desde: desde || null, hasta: hasta || null, tipo_operacion: tipo_operacion || null },
        ...kpis,
        ticket_promedio: Number(ticketPromedio.toFixed(2)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /dashboard/serie?desde&hasta&granularidad=dia|mes&tipo_operacion
exports.getSerie = async (req, res, next) => {
  try {
    const { desde, hasta, tipo_operacion, granularidad = "dia" } = req.query;
    const { where, values } = buildTxWhere({ desde, hasta, tipo_operacion });

    const bucket =
      granularidad === "mes"
        ? `date_trunc('month', t.fecha_transaccion)`
        : `date_trunc('day', t.fecha_transaccion)`;

    const sql = `
      SELECT
        ${bucket} AS periodo,
        COUNT(DISTINCT t.id)::int AS transacciones_count,
        COALESCE(SUM(t.monto_total), 0) AS monto_total_sum,
        COALESCE(SUM(c.monto_comision), 0) AS comision_total_sum,
        COALESCE(SUM(c.empresa_ganancia), 0) AS ganancia_empresa_sum
      FROM transacciones t
      LEFT JOIN comisiones c ON c.transaccion_id = t.id
      ${where}
      GROUP BY 1
      ORDER BY 1 ASC;
    `;

    const r = await pool.query(sql, values);
    res.json({
      ok: true,
      data: r.rows,
      meta: { granularidad, desde: desde || null, hasta: hasta || null, tipo_operacion: tipo_operacion || null },
    });
  } catch (err) {
    next(err);
  }
};

// GET /dashboard/top-corredores?desde&hasta&limit=5
exports.getTopCorredores = async (req, res, next) => {
  try {
    const { desde, hasta, limit = 5 } = req.query;

    const filters = [];
    const values = [];

    if (desde) {
      values.push(desde);
      filters.push(`t.fecha_transaccion >= $${values.length}`);
    }
    if (hasta) {
      values.push(hasta);
      filters.push(`t.fecha_transaccion <= $${values.length}`);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    values.push(Math.min(Number(limit) || 5, 50));
    const limitIdx = values.length;

    const sql = `
      SELECT
        c.corredor_id,
        u.nombre AS corredor_nombre,
        u.email  AS corredor_email,
        COUNT(DISTINCT t.id)::int AS transacciones_count,
        COALESCE(SUM(c.monto_comision), 0) AS comision_total_sum,
        COALESCE(SUM(c.empresa_ganancia), 0) AS ganancia_empresa_sum
      FROM comisiones c
      JOIN transacciones t ON t.id = c.transaccion_id
      JOIN corredores co ON co.id = c.corredor_id
      JOIN usuarios u ON u.id = co.usuario_id
      ${where}
      GROUP BY c.corredor_id, u.nombre, u.email
      ORDER BY comision_total_sum DESC
      LIMIT $${limitIdx};
    `;

    const r = await pool.query(sql, values);
    res.json({ ok: true, data: r.rows, meta: { desde: desde || null, hasta: hasta || null } });
  } catch (err) {
    next(err);
  }
};

// GET /dashboard/por-tipo?desde&hasta
exports.getPorTipoOperacion = async (req, res, next) => {
  try {
    const { desde, hasta } = req.query;

    const filters = [];
    const values = [];

    if (desde) {
      values.push(desde);
      filters.push(`t.fecha_transaccion >= $${values.length}`);
    }
    if (hasta) {
      values.push(hasta);
      filters.push(`t.fecha_transaccion <= $${values.length}`);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const sql = `
      SELECT
        t.tipo_operacion,
        COUNT(DISTINCT t.id)::int AS transacciones_count,
        COALESCE(SUM(t.monto_total), 0) AS monto_total_sum,
        COALESCE(SUM(c.monto_comision), 0) AS comision_total_sum
      FROM transacciones t
      LEFT JOIN comisiones c ON c.transaccion_id = t.id
      ${where}
      GROUP BY t.tipo_operacion
      ORDER BY monto_total_sum DESC;
    `;

    const r = await pool.query(sql, values);
    res.json({ ok: true, data: r.rows, meta: { desde: desde || null, hasta: hasta || null } });
  } catch (err) {
    next(err);
  }
};

// GET /dashboard/estatus-pago?desde&hasta
exports.getEstatusPago = async (req, res, next) => {
  try {
    const { desde, hasta } = req.query;

    const filters = [];
    const values = [];

    if (desde) {
      values.push(desde);
      filters.push(`t.fecha_transaccion >= $${values.length}`);
    }
    if (hasta) {
      values.push(hasta);
      filters.push(`t.fecha_transaccion <= $${values.length}`);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const sql = `
      SELECT
        c.estatus_pago,
        COUNT(c.id)::int AS comisiones_count,
        COALESCE(SUM(c.monto_comision), 0) AS comision_total_sum
      FROM comisiones c
      JOIN transacciones t ON t.id = c.transaccion_id
      ${where}
      GROUP BY c.estatus_pago
      ORDER BY comision_total_sum DESC;
    `;

    const r = await pool.query(sql, values);
    res.json({ ok: true, data: r.rows, meta: { desde: desde || null, hasta: hasta || null } });
  } catch (err) {
    next(err);
  }
};

// GET /dashboard/corredor/:id?desde&hasta
exports.getDashboardCorredor = async (req, res, next) => {
  try {
    const corredor_id = Number(req.params.id);
    const { desde, hasta } = req.query;

    const filters = [`c.corredor_id = $1`];
    const values = [corredor_id];

    if (desde) {
      values.push(desde);
      filters.push(`t.fecha_transaccion >= $${values.length}`);
    }
    if (hasta) {
      values.push(hasta);
      filters.push(`t.fecha_transaccion <= $${values.length}`);
    }

    const where = `WHERE ${filters.join(" AND ")}`;

    const kpiSql = `
      SELECT
        COUNT(DISTINCT t.id)::int AS transacciones_count,
        COALESCE(SUM(c.monto_comision), 0) AS comision_total_sum,
        COALESCE(SUM(c.empresa_ganancia), 0) AS ganancia_empresa_sum,
        COALESCE(SUM(CASE WHEN c.estatus_pago='pagado' THEN c.monto_comision ELSE 0 END), 0) AS comision_pagada_sum,
        COALESCE(SUM(CASE WHEN c.estatus_pago='pendiente' THEN c.monto_comision ELSE 0 END), 0) AS comision_pendiente_sum
      FROM comisiones c
      JOIN transacciones t ON t.id = c.transaccion_id
      ${where};
    `;

    const detalleSql = `
      SELECT
        c.id AS comision_id,
        c.estatus_pago,
        c.monto_comision,
        c.empresa_ganancia,
        c.fecha_pago,
        t.id AS transaccion_id,
        t.tipo_operacion,
        t.monto_total,
        t.fecha_transaccion,
        i.id AS inmueble_id,
        i.titulo AS inmueble_titulo
      FROM comisiones c
      JOIN transacciones t ON t.id = c.transaccion_id
      JOIN inmuebles i ON i.id = t.inmueble_id
      ${where}
      ORDER BY t.fecha_transaccion DESC, c.id DESC
      LIMIT 100;
    `;

    const corredorSql = `
      SELECT co.id, u.nombre, u.email
      FROM corredores co
      JOIN usuarios u ON u.id = co.usuario_id
      WHERE co.id = $1;
    `;

    const [corredorInfo, kpi, detalle] = await Promise.all([
      pool.query(corredorSql, [corredor_id]),
      pool.query(kpiSql, values),
      pool.query(detalleSql, values),
    ]);

    if (!corredorInfo.rows.length) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Corredor no existe" });
    }

    res.json({
      ok: true,
      data: {
        corredor: corredorInfo.rows[0],
        filtros: { desde: desde || null, hasta: hasta || null },
        kpis: kpi.rows[0],
        ultimas_comisiones: detalle.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};