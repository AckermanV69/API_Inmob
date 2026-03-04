const pool = require("../db/pool");

// GET /transacciones?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&tipo_operacion=venta&corredor_id=1&inmueble_id=10&cliente_id=3
exports.listTransacciones = async (req, res) => {
  const {
    desde,
    hasta,
    tipo_operacion,
    inmueble_id,
    cliente_id,
    corredor_id,
    limit = 100,
    offset = 0,
  } = req.query;

  const filters = [];
  const values = [];

  if (desde) {
    values.push(desde);
    filters.push(`t.fecha_transaccion >= $${values.length}::date`);
  }
  if (hasta) {
    values.push(hasta);
    filters.push(`t.fecha_transaccion < ($${values.length}::date + interval '1 day')`);
  }
  if (tipo_operacion) {
    values.push(tipo_operacion);
    filters.push(`t.tipo_operacion = $${values.length}`);
  }
  if (inmueble_id) {
    values.push(Number(inmueble_id));
    filters.push(`t.inmueble_id = $${values.length}`);
  }
  if (cliente_id) {
    values.push(Number(cliente_id));
    filters.push(`t.cliente_id = $${values.length}`);
  }
  // corredor_id viene del inmueble
  if (corredor_id) {
    values.push(Number(corredor_id));
    filters.push(`i.corredor_id = $${values.length}`);
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
      t.*,
      i.titulo AS inmueble_titulo,
      i.corredor_id,
      u.nombre AS cliente_nombre,
      c.id AS comision_id,
      c.monto_comision,
      c.empresa_ganancia,
      c.estatus_pago
    FROM transacciones t
    LEFT JOIN inmuebles i ON i.id = t.inmueble_id
    LEFT JOIN usuarios u ON u.id = t.cliente_id
    LEFT JOIN comisiones c ON c.transaccion_id = t.id
    ${where}
    ORDER BY t.id DESC
    LIMIT $${limIdx} OFFSET $${offIdx};
  `;

  const { rows } = await pool.query(sql, values);
  res.json({ ok: true, data: rows });
};

exports.getTransaccionById = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ ok: false, error: "BAD_ID", message: "ID inválido" });
  }

  const sql = `
    SELECT
      t.*,
      i.titulo AS inmueble_titulo,
      i.corredor_id,
      u.nombre AS cliente_nombre,
      c.id AS comision_id,
      c.monto_comision,
      c.empresa_ganancia,
      c.estatus_pago
    FROM transacciones t
    LEFT JOIN inmuebles i ON i.id = t.inmueble_id
    LEFT JOIN usuarios u ON u.id = t.cliente_id
    LEFT JOIN comisiones c ON c.transaccion_id = t.id
    WHERE t.id = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(sql, [id]);
  if (!rows.length) return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "No existe" });

  res.json({ ok: true, data: rows[0] });
};

exports.createTransaccion = async (req, res) => {
  const { inmueble_id, cliente_id, tipo_operacion, monto_total } = req.body;

  if (!inmueble_id || !cliente_id || !tipo_operacion || monto_total === undefined) {
    return res.status(400).json({
      ok: false,
      error: "VALIDATION",
      message: "inmueble_id, cliente_id, tipo_operacion, monto_total son obligatorios",
    });
  }

  const sql = `
    INSERT INTO transacciones (inmueble_id, cliente_id, tipo_operacion, monto_total)
    VALUES ($1,$2,$3,$4)
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(sql, [inmueble_id, cliente_id, tipo_operacion, monto_total]);
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.code || "TX_ERROR", message: err.message, detail: err.detail });
  }
};