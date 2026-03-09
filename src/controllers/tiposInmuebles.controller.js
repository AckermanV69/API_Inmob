const pool = require("../db/pool");

exports.listTipos = async (_req, res) => {
  const { rows } = await pool.query(`SELECT id, nombre FROM tipos_inmueble ORDER BY nombre ASC;`);
  res.json({ ok: true, data: rows });
};