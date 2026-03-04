const pool = require("../db/pool");

// GET /reportes/resumen?desde=2026-03-01&hasta=2026-03-31&tipo_operacion=venta
exports.getResumen = async (req, res, next) => {
  try {
    const { desde, hasta, tipo_operacion } = req.query;

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

    // 1) Totales
    const totalsSql = `
      SELECT
        COUNT(DISTINCT t.id)::int AS transacciones_count,
        COALESCE(SUM(t.monto_total), 0) AS monto_total_sum,
        COALESCE(SUM(c.monto_comision), 0) AS comision_total_sum,
        COALESCE(SUM(c.empresa_ganancia), 0) AS ganancia_empresa_sum
      FROM transacciones t
      LEFT JOIN comisiones c ON c.transaccion_id = t.id
      ${where};
    `;

    // 2) Top corredores (por monto_comision)
    const topSql = `
      SELECT
        c.corredor_id,
        u.nombre AS corredor_nombre,
        COALESCE(SUM(c.monto_comision), 0) AS comision_total
      FROM comisiones c
      JOIN transacciones t ON t.id = c.transaccion_id
      JOIN corredores co ON co.id = c.corredor_id
      JOIN usuarios u ON u.id = co.usuario_id
      ${where}
      GROUP BY c.corredor_id, u.nombre
      ORDER BY comision_total DESC
      LIMIT 5;
    `;

    const [totals, top] = await Promise.all([
      pool.query(totalsSql, values),
      pool.query(topSql, values),
    ]);

    res.json({
      ok: true,
      data: {
        filtros: { desde: desde || null, hasta: hasta || null, tipo_operacion: tipo_operacion || null },
        ...totals.rows[0],
        top_corredores: top.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};