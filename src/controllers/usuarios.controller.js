const pool = require("../db/pool");

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.code = "BAD_REQUEST";
  return err;
}

// GET /usuarios?q=...&limit=...&offset=...
exports.listUsuarios = async (req, res) => {
  const { q, limit = 100, offset = 0 } = req.query;

  const values = [];
  let where = "";

  if (q) {
    values.push(`%${q}%`);
    where = `WHERE nombre ILIKE $1 OR email ILIKE $1`;
  }

  values.push(Math.min(Number(limit) || 100, 500));
  const limitIdx = values.length;
  values.push(Math.max(Number(offset) || 0, 0));
  const offsetIdx = values.length;

  const { rows } = await pool.query(
    `
      SELECT id, nombre, email, telefono, estatus
      FROM usuarios
      ${where}
      ORDER BY id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `,
    values
  );

  res.json({ ok: true, data: rows });
};

// GET /usuarios/:id
exports.getUsuarioById = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("id inválido");

  const { rows } = await pool.query(
    `SELECT id, nombre, email, telefono, estatus FROM usuarios WHERE id = $1 LIMIT 1;`,
    [id]
  );

  if (!rows.length) {
    const err = new Error("Usuario no existe");
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  res.json({ ok: true, data: rows[0] });
};

// POST /usuarios
exports.createUsuario = async (req, res) => {
  const { nombre, email, telefono, estatus } = req.body;

  if (!nombre) throw badRequest("nombre es requerido");
  if (!email) throw badRequest("email es requerido");

  const sql = `
    INSERT INTO usuarios (nombre, email, telefono, estatus)
    VALUES ($1,$2,$3,$4)
    RETURNING id, nombre, email, telefono, estatus;
  `;

  const values = [nombre, email, telefono || null, estatus || null];
  const { rows } = await pool.query(sql, values);

  res.status(201).json({ ok: true, data: rows[0] });
};

// PATCH /usuarios/:id
exports.patchUsuario = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("id inválido");

  const allowed = new Set(["nombre", "email", "telefono", "estatus"]);
  const body = req.body || {};
  const keys = Object.keys(body).filter((k) => allowed.has(k));

  if (!keys.length) throw badRequest("No hay campos válidos para actualizar");

  const set = [];
  const values = [];

  keys.forEach((k) => {
    values.push(body[k] === "" ? null : body[k]);
    set.push(`${k} = $${values.length}`);
  });

  values.push(id);
  const sql = `
    UPDATE usuarios
    SET ${set.join(", ")}
    WHERE id = $${values.length}
    RETURNING id, nombre, email, telefono, estatus;
  `;

  const { rows } = await pool.query(sql, values);
  if (!rows.length) {
    const err = new Error("Usuario no existe");
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  res.json({ ok: true, data: rows[0] });
};
