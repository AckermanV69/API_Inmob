const pool = require("../db/pool");

// GET /sectores?ciudad_id=1
exports.listSectores = async (req, res) => {
  const ciudadId = Number(req.query.ciudad_id);
  if (!ciudadId) return res.status(400).json({ ok: false, message: "ciudad_id requerido" });

  const { rows } = await pool.query(
    `SELECT id, nombre, ciudad_id
     FROM sectores
     WHERE ciudad_id = $1
     ORDER BY nombre ASC;`,
    [ciudadId]
  );

  res.json({ ok: true, data: rows });
};
