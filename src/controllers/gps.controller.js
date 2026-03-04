const pool = require("../db/pool");

exports.listGps = async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);

  const sql = `
    SELECT g.*, i.titulo AS inmueble_titulo
    FROM ubicaciones_gps g
    LEFT JOIN inmuebles i ON i.id = g.inmueble_id
    ORDER BY g.id DESC
    LIMIT $1;
  `;

  const { rows } = await pool.query(sql, [limit]);
  res.json({ ok: true, data: rows });
};