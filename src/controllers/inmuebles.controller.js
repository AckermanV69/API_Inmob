const pool = require("../db/pool");

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.code = "BAD_REQUEST";
  return err;
}

function clampInt(n, { min, max, def }) {
  const x = Number(n);
  if (!Number.isFinite(x)) return def;
  return Math.min(max, Math.max(min, Math.trunc(x)));
}

// GET /inmuebles?estatus=disponible&estado_inmueble=venta&min=1000&max=300000&sector_id=..&ciudad_id=..&municipio_id=..&estado_id=..&tipo_inmueble_id=..&corredor_id=..&q=..&limit=..&offset=..
exports.listInmuebles = async (req, res) => {
  const {
    estatus,
    estado_inmueble,
    min,
    max,
    sector_id,
    ciudad_id,
    municipio_id,
    estado_id,
    tipo_inmueble_id,
    corredor_id,
    q,
    limit,
    offset,
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
  if (min !== undefined && min !== "") {
    values.push(Number(min));
    filters.push(`i.precio >= $${values.length}`);
  }
  if (max !== undefined && max !== "") {
    values.push(Number(max));
    filters.push(`i.precio <= $${values.length}`);
  }
  if (sector_id) {
    values.push(Number(sector_id));
    filters.push(`i.sector_id = $${values.length}`);
  }
  if (ciudad_id) {
    values.push(Number(ciudad_id));
    filters.push(`c.id = $${values.length}`);
  }
  if (municipio_id) {
    values.push(Number(municipio_id));
    filters.push(`m.id = $${values.length}`);
  }
  if (estado_id) {
    values.push(Number(estado_id));
    filters.push(`e.id = $${values.length}`);
  }
  if (tipo_inmueble_id) {
    values.push(Number(tipo_inmueble_id));
    filters.push(`i.tipo_inmueble_id = $${values.length}`);
  }
  if (corredor_id) {
    values.push(Number(corredor_id));
    filters.push(`i.corredor_id = $${values.length}`);
  }
  if (q) {
    values.push(`%${q}%`);
    filters.push(`(i.titulo ILIKE $${values.length} OR i.descripcion ILIKE $${values.length})`);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const lim = clampInt(limit, { min: 1, max: 500, def: 100 });
  const off = clampInt(offset, { min: 0, max: 1000000, def: 0 });

  values.push(lim);
  const limPos = values.length;

  values.push(off);
  const offPos = values.length;

  const sql = `
    SELECT
      i.*,
      ti.nombre AS tipo_inmueble,
      s.nombre  AS sector,
      c.nombre  AS ciudad,
      m.nombre  AS municipio,
      e.nombre  AS estado,
      u.nombre  AS corredor_nombre
    FROM inmuebles i
    LEFT JOIN tipos_inmueble ti ON ti.id = i.tipo_inmueble_id
    LEFT JOIN sectores s ON s.id = i.sector_id
    LEFT JOIN ciudades c ON c.id = s.ciudad_id
    LEFT JOIN municipios m ON m.id = c.municipio_id
    LEFT JOIN estados e ON e.id = m.estado_id
    LEFT JOIN corredores co ON co.id = i.corredor_id
    LEFT JOIN usuarios u ON u.id = co.usuario_id
    ${where}
    ORDER BY i.id DESC
    LIMIT $${limPos} OFFSET $${offPos};
  `;

  const { rows } = await pool.query(sql, values);
  res.json({ ok: true, data: rows });
};

exports.getInmuebleById = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) throw badRequest("id inválido");

  const sql = `
    SELECT
      i.*,
      ti.nombre AS tipo_inmueble,
      s.nombre  AS sector,
      c.nombre  AS ciudad,
      m.nombre  AS municipio,
      e.nombre  AS estado,
      u.nombre  AS corredor_nombre,
      ug.latitud,
      ug.longitud,
      ug.google_maps_url,
      ug.zoom_level
    FROM inmuebles i
    LEFT JOIN tipos_inmueble ti ON ti.id = i.tipo_inmueble_id
    LEFT JOIN sectores s ON s.id = i.sector_id
    LEFT JOIN ciudades c ON c.id = s.ciudad_id
    LEFT JOIN municipios m ON m.id = c.municipio_id
    LEFT JOIN estados e ON e.id = m.estado_id
    LEFT JOIN corredores co ON co.id = i.corredor_id
    LEFT JOIN usuarios u ON u.id = co.usuario_id
    LEFT JOIN LATERAL (
      SELECT latitud, longitud, google_maps_url, zoom_level
      FROM ubicaciones_gps
      WHERE inmueble_id = i.id
      ORDER BY id DESC
      LIMIT 1
    ) ug ON true
    WHERE i.id = $1;
  `;

  const { rows } = await pool.query(sql, [id]);
  if (!rows.length) {
    const err = new Error("Inmueble no existe");
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

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

  if (!titulo) throw badRequest("titulo es requerido");
  if (!estado_inmueble) throw badRequest("estado_inmueble es requerido");
  if (precio === undefined || precio === null || precio === "") throw badRequest("precio es requerido");

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
    tipo_inmueble_id ? Number(tipo_inmueble_id) : null,
    estado_inmueble,
    Number(precio),
    sector_id ? Number(sector_id) : null,
    direccion_exacta || null,
    habitaciones ?? 0,
    banos ?? 0,
    area_m2 ?? null,
    corredor_id ? Number(corredor_id) : null,
  ];

  const { rows } = await pool.query(sql, values);
  res.status(201).json({ ok: true, data: rows[0] });
};

exports.patchInmueble = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) throw badRequest("id inválido");

  const allowed = new Set([
    "titulo",
    "descripcion",
    "tipo_inmueble_id",
    "estado_inmueble",
    "precio",
    "sector_id",
    "direccion_exacta",
    "habitaciones",
    "banos",
    "area_m2",
    "estatus",
    "corredor_id",
  ]);

  const body = req.body || {};
  const keys = Object.keys(body).filter((k) => allowed.has(k));

  if (!keys.length) throw badRequest("No hay campos válidos para actualizar");

  const set = [];
  const values = [];

  keys.forEach((k) => {
    let v = body[k];

    // normaliza números
    if (["precio", "area_m2"].includes(k)) v = v === "" ? null : Number(v);
    if (["tipo_inmueble_id", "sector_id", "corredor_id", "habitaciones", "banos"].includes(k))
      v = v === "" ? null : Number(v);

    values.push(v);
    set.push(`${k} = $${values.length}`);
  });

  values.push(id);

  const sql = `
    UPDATE inmuebles
    SET ${set.join(", ")}
    WHERE id = $${values.length}
    RETURNING *;
  `;

  const { rows } = await pool.query(sql, values);

  if (!rows.length) {
    const err = new Error("Inmueble no existe");
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  res.json({ ok: true, data: rows[0] });
};

// GET /inmuebles/disponibles?sector_id=123
exports.listDisponiblesPorSector = async (req, res) => {
  const sectorId = Number(req.query.sector_id);
  if (!sectorId) return res.status(400).json({ ok: false, message: "sector_id requerido" });

  const { rows } = await pool.query(
    `SELECT id, titulo, precio, estado_inmueble, estatus, corredor_id
     FROM inmuebles
     WHERE sector_id = $1 AND estatus = 'disponible'
     ORDER BY id DESC
     LIMIT 200;`,
    [sectorId]
  );

  res.json({ ok: true, data: rows });
};