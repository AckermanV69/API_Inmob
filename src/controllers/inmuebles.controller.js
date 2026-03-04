const pool = require("../db/pool");

// GET /inmuebles?estatus=disponible&estado_inmueble=venta&min=1000&max=300000
// + extras: tipo_inmueble_id, sector_id, ciudad_id, municipio_id, estado_id, corredor_id
exports.listInmuebles = async (req, res) => {
  const {
    estatus,
    estado_inmueble,
    min,
    max,
    tipo_inmueble_id,
    sector_id,
    ciudad_id,
    municipio_id,
    estado_id,
    corredor_id,
  } = req.query;

  const filters = [];
  const values = [];

  if (estatus) {
    values.push(estatus);
    filters.push(`i.estatus = $${values.length}`);
  }
  if (estado_inmueble) {
    values.push(estado_inmueble);
    filters.push(`i.estado_inmueble = $${values.length}`);
  }
  if (min) {
    values.push(Number(min));
    filters.push(`i.precio >= $${values.length}`);
  }
  if (max) {
    values.push(Number(max));
    filters.push(`i.precio <= $${values.length}`);
  }

  if (tipo_inmueble_id) {
    values.push(Number(tipo_inmueble_id));
    filters.push(`i.tipo_inmueble_id = $${values.length}`);
  }
  if (sector_id) {
    values.push(Number(sector_id));
    filters.push(`i.sector_id = $${values.length}`);
  }
  if (ciudad_id) {
    values.push(Number(ciudad_id));
    filters.push(`s.ciudad_id = $${values.length}`);
  }
  if (municipio_id) {
    values.push(Number(municipio_id));
    filters.push(`c.municipio_id = $${values.length}`);
  }
  if (estado_id) {
    values.push(Number(estado_id));
    filters.push(`m.estado_id = $${values.length}`);
  }
  if (corredor_id) {
    values.push(Number(corredor_id));
    filters.push(`i.corredor_id = $${values.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const sql = `
    SELECT
      i.*,
      ti.nombre AS tipo_inmueble,
      s.nombre  AS sector,
      c.nombre  AS ciudad,
      m.nombre  AS municipio,
      e.nombre  AS estado
    FROM inmuebles i
    LEFT JOIN tipos_inmueble ti ON ti.id = i.tipo_inmueble_id
    LEFT JOIN sectores s ON s.id = i.sector_id
    LEFT JOIN ciudades c ON c.id = s.ciudad_id
    LEFT JOIN municipios m ON m.id = c.municipio_id
    LEFT JOIN estados e ON e.id = m.estado_id
    ${where}
    ORDER BY i.id DESC
    LIMIT 200;
  `;

  const { rows } = await pool.query(sql, values);
  res.json({ ok: true, data: rows });
};

exports.getInmuebleById = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ ok: false, error: "BAD_ID", message: "ID inválido" });
  }

  const sql = `
    SELECT
      i.*,
      ti.nombre AS tipo_inmueble,
      s.nombre  AS sector,
      c.nombre  AS ciudad,
      m.nombre  AS municipio,
      e.nombre  AS estado
    FROM inmuebles i
    LEFT JOIN tipos_inmueble ti ON ti.id = i.tipo_inmueble_id
    LEFT JOIN sectores s ON s.id = i.sector_id
    LEFT JOIN ciudades c ON c.id = s.ciudad_id
    LEFT JOIN municipios m ON m.id = c.municipio_id
    LEFT JOIN estados e ON e.id = m.estado_id
    WHERE i.id = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(sql, [id]);
  if (!rows.length) return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "No existe" });
  res.json({ ok: true, data: rows[0] });
};

exports.createInmueble = async (req, res) => {
  const {
    titulo,
    descripcion,
    tipo_inmueble_id,
    estado_inmueble,
    precio,
    sector_id,
    direccion_exacta,
    habitaciones,
    banos,
    area_m2,
    corredor_id,
  } = req.body;

  if (!titulo || !estado_inmueble || precio === undefined) {
    return res.status(400).json({
      ok: false,
      error: "VALIDATION",
      message: "titulo, estado_inmueble y precio son obligatorios",
    });
  }

  const sql = `
    INSERT INTO inmuebles (
      titulo, descripcion, tipo_inmueble_id, estado_inmueble, precio,
      sector_id, direccion_exacta, habitaciones, banos, area_m2, corredor_id
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *;
  `;

  const values = [
    titulo,
    descripcion || null,
    tipo_inmueble_id || null,
    estado_inmueble,
    precio,
    sector_id || null,
    direccion_exacta || null,
    habitaciones ?? 0,
    banos ?? 0,
    area_m2 ?? null,
    corredor_id || null,
  ];

  const { rows } = await pool.query(sql, values);
  res.status(201).json({ ok: true, data: rows[0] });
};

// PATCH /inmuebles/:id (precio, estatus, etc.)
exports.updateInmueble = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ ok: false, error: "BAD_ID", message: "ID inválido" });
  }

  // Campos permitidos para PATCH
  const allowed = {
    titulo: "titulo",
    descripcion: "descripcion",
    tipo_inmueble_id: "tipo_inmueble_id",
    estado_inmueble: "estado_inmueble",
    precio: "precio",
    sector_id: "sector_id",
    direccion_exacta: "direccion_exacta",
    habitaciones: "habitaciones",
    banos: "banos",
    area_m2: "area_m2",
    estatus: "estatus",
    corredor_id: "corredor_id",
  };

  const setParts = [];
  const values = [];

  for (const [key, col] of Object.entries(allowed)) {
    if (req.body[key] !== undefined) {
      values.push(req.body[key]);
      setParts.push(`${col} = $${values.length}`);
    }
  }

  if (!setParts.length) {
    return res.status(400).json({
      ok: false,
      error: "NO_FIELDS",
      message: "No enviaste campos para actualizar",
    });
  }

  values.push(id);
  const sql = `
    UPDATE inmuebles
    SET ${setParts.join(", ")}
    WHERE id = $${values.length}
    RETURNING *;
  `;

  const { rows } = await pool.query(sql, values);
  if (!rows.length) return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "No existe" });

  res.json({ ok: true, data: rows[0] });
};