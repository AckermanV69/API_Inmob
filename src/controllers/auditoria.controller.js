const pool = require("../db/pool");

// GET /auditoria?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&tabla_afectada=inmuebles&accion=UPDATE&usuario_id=1&registro_id=10
exports.listAuditoria = async (req, res) => {
  const {
    desde,
    hasta,
    tabla_afectada,
    accion,
    usuario_id,
    registro_id,
    limit = 100,
    offset = 0,
  } = req.query;

  const filters = [];
  const values = [];

  if (desde) {
    values.push(desde);
    filters.push(`a.fecha_hora >= $${values.length}::date`);
  }
  if (hasta) {
    values.push(hasta);
    filters.push(`a.fecha_hora < ($${values.length}::date + interval '1 day')`);
  }
  if (tabla_afectada) {
    values.push(tabla_afectada);
    filters.push(`a.tabla_afectada = $${values.length}`);
  }
  if (usuario_id) {
    values.push(Number(usuario_id));
    filters.push(`a.usuario_id = $${values.length}`);
  }
  if (registro_id) {
    values.push(Number(registro_id));
    filters.push(`a.registro_id = $${values.length}`);
  }
  if (accion) {
    values.push(`%${accion}%`);
    filters.push(`a.accion ILIKE $${values.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const lim = Math.min(Number(limit || 100), 200);
  const off = Math.max(Number(offset || 0), 0);

  values.push(lim);
  const limIdx = values.length;
  values.push(off);
  const offIdx = values.length;

  const sql = `
    SELECT
      a.*,
      u.nombre AS usuario_nombre,
      u.email  AS usuario_email
    FROM pitagora_auditoria a
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    ${where}
    ORDER BY a.id DESC
    LIMIT $${limIdx} OFFSET $${offIdx};
  `;

  const { rows } = await pool.query(sql, values);
  res.json({ ok: true, data: rows });
};