const pool = require("../db/pool");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "inmob-secret";
const JWT_EXPIRES_IN = "7d";

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.code = "BAD_REQUEST";
  return err;
}

exports.register = async (req, res) => {
  const { nombre, email, password, telefono, estatus } = req.body;

  if (!nombre) throw badRequest("nombre es requerido");
  if (!email) throw badRequest("email es requerido");
  if (!password) throw badRequest("password es requerido");

  const hashed = await bcrypt.hash(String(password), 10);

  const sql = `
    INSERT INTO usuarios (nombre, email, telefono, estatus, password)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING id, nombre, email, telefono, estatus;
  `;

  const values = [nombre, email, telefono || null, estatus || null, hashed];
  const { rows } = await pool.query(sql, values);

  res.status(201).json({ ok: true, data: rows[0] });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw badRequest("email y password son requeridos");
  }

  const { rows } = await pool.query(
    `SELECT id, nombre, email, telefono, estatus, password FROM usuarios WHERE email = $1 LIMIT 1;`,
    [email]
  );

  if (!rows.length) {
    const err = new Error("Credenciales inválidas");
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const user = rows[0];
  const match = await bcrypt.compare(String(password), user.password || "");

  if (!match) {
    const err = new Error("Credenciales inválidas");
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  res.json({
    ok: true,
    data: {
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono,
        estatus: user.estatus,
      },
    },
  });
};

exports.me = async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    const err = new Error("No autorizado");
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const { rows } = await pool.query(
    `SELECT id, nombre, email, telefono, estatus FROM usuarios WHERE id = $1 LIMIT 1;`,
    [userId]
  );

  if (!rows.length) {
    const err = new Error("Usuario no existe");
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  res.json({ ok: true, data: rows[0] });
};
