const pool = require("../db/pool");

// GET /ciudades?municipio_id=1
exports.listCiudades = async (req, res) => {
  const municipioId = Number(req.query.municipio_id);
  if (!municipioId) return res.status(400).json({ ok: false, message: "municipio_id requerido" });

  const { rows } = await pool.query(
    `SELECT id, nombre, municipio_id
     FROM ciudades
     WHERE municipio_id = $1
     ORDER BY nombre ASC;`,
    [municipioId]
  );

  res.json({ ok: true, data: rows });
};
