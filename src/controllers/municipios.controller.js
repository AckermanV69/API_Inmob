const pool = require("../db/pool");

// GET /municipios?estado_id=1
exports.listMunicipios = async (req, res) => {
  const estadoId = Number(req.query.estado_id);
  if (!estadoId) return res.status(400).json({ ok: false, message: "estado_id requerido" });

  const { rows } = await pool.query(
    `SELECT id, nombre, estado_id
     FROM municipios
     WHERE estado_id = $1
     ORDER BY nombre ASC;`,
    [estadoId]
  );

  res.json({ ok: true, data: rows });
};
