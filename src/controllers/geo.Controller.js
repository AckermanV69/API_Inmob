const pool = require("../db/pool");

// GET /geo/estados
exports.listEstados = async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, nombre FROM estados ORDER BY nombre ASC;`
  );
  res.json({ ok: true, data: rows });
};

// GET /geo/municipios?estado_id=1
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

// GET /geo/ciudades?municipio_id=1
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

// GET /geo/sectores?ciudad_id=1
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