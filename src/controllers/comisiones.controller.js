const pool = require("../db/pool");

/**
 * GET /comisiones
 * Filtros:
 *  - corredor_id
 *  - transaccion_id
 *  - estatus_pago (pendiente|pagado|cancelado)
 *  - desde/hasta
 *  - por=fecha_transaccion|fecha_pago (default fecha_transaccion)
 *  - limit (<=200), offset
 */
exports.listComisiones = async (req, res, next) => {
  try {
    const {
      corredor_id,
      transaccion_id,
      estatus_pago,
      desde,
      hasta,
      por = "fecha_transaccion",
      limit = 100,
      offset = 0,
    } = req.query;

    const dateField = por === "fecha_pago" ? "c.fecha_pago" : "t.fecha_transaccion";

    const filters = [];
    const values = [];

    if (corredor_id) {
      values.push(Number(corredor_id));
      filters.push(`c.corredor_id = $${values.length}`);
    }
    if (transaccion_id) {
      values.push(Number(transaccion_id));
      filters.push(`c.transaccion_id = $${values.length}`);
    }
    if (estatus_pago) {
      values.push(estatus_pago);
      filters.push(`c.estatus_pago = $${values.length}`);
    }
    if (desde) {
      values.push(desde);
      filters.push(`${dateField} >= $${values.length}`);
    }
    if (hasta) {
      values.push(hasta);
      filters.push(`${dateField} <= $${values.length}`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const lim = Math.min(Number(limit) || 100, 200);
    const off = Number(offset) || 0;

    values.push(lim);
    const limitIdx = values.length;

    values.push(off);
    const offsetIdx = values.length;

    const sql = `
      SELECT
        c.id,
        c.transaccion_id,
        c.corredor_id,
        c.monto_comision,
        c.porcentaje_aplicado,
        c.empresa_ganancia,
        c.estatus_pago,
        c.fecha_pago,

        t.tipo_operacion,
        t.monto_total,
        t.fecha_transaccion,

        i.id     AS inmueble_id,
        i.titulo AS inmueble_titulo,

        uco.nombre AS corredor_nombre,
        uco.email  AS corredor_email

      FROM comisiones c
      JOIN transacciones t ON t.id = c.transaccion_id
      JOIN inmuebles i ON i.id = t.inmueble_id
      JOIN corredores co ON co.id = c.corredor_id
      JOIN usuarios uco ON uco.id = co.usuario_id

      ${where}

      ORDER BY ${dateField} DESC NULLS LAST, c.id DESC
      LIMIT $${limitIdx}
      OFFSET $${offsetIdx};
    `;

    const { rows } = await pool.query(sql, values);
    res.json({ ok: true, data: rows, pagination: { limit: lim, offset: off } });
  } catch (err) {
    next(err);
  }
};

exports.getComisionById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const sql = `
      SELECT
        c.*,
        t.tipo_operacion,
        t.monto_total,
        t.fecha_transaccion,
        i.titulo AS inmueble_titulo,
        uco.nombre AS corredor_nombre,
        uco.email  AS corredor_email
      FROM comisiones c
      JOIN transacciones t ON t.id = c.transaccion_id
      JOIN inmuebles i ON i.id = t.inmueble_id
      JOIN corredores co ON co.id = c.corredor_id
      JOIN usuarios uco ON uco.id = co.usuario_id
      WHERE c.id = $1;
    `;

    const { rows } = await pool.query(sql, [id]);
    if (!rows.length) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Comisión no existe" });
    }

    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateEstatusPago = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { estatus_pago, fecha_pago } = req.body;

    if (!["pendiente", "pagado", "cancelado"].includes(estatus_pago)) {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "estatus_pago inválido (use: pendiente|pagado|cancelado)",
      });
    }

    const sql = `
      UPDATE comisiones
      SET
        estatus_pago = $1::varchar,
        fecha_pago = CASE
          WHEN $1::varchar = 'pagado' THEN COALESCE($2::timestamp, CURRENT_TIMESTAMP)
          ELSE NULL
        END
      WHERE id = $3
      RETURNING *;
    `;

    const { rows } = await pool.query(sql, [estatus_pago, fecha_pago || null, id]);

    if (!rows.length) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Comisión no existe" });
    }

    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};