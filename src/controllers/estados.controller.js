const pool = require("../db/pool");

// GET /estados
exports.listEstados = async (_req, res) => {
  const { rows } = await pool.query(`SELECT id, nombre FROM estados ORDER BY nombre ASC;`);
  res.json({ ok: true, data: rows });
};
