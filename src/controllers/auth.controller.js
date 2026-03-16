const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.code = "BAD_REQUEST";
  return err;
}

function unauthorized(message) {
  const err = new Error(message);
  err.statusCode = 401;
  err.code = "UNAUTHORIZED";
  return err;
}

const API_TO_DB_ROLE = {
  user: "cliente",
  admin: "admin",
};

function mapDbRoleToApiRole(dbRole) {
  if (dbRole === "admin") return "admin";
  return "user";
}

exports.register = async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre) throw badRequest("nombre es requerido");
  if (!email) throw badRequest("email es requerido");
  if (!password) throw badRequest("password es requerido");

  const { rows: existing } = await pool.query(
    "SELECT id FROM usuarios WHERE email = $1 LIMIT 1;",
    [email]
  );

  if (existing.length) {
    const err = new Error("Email ya registrado");
    err.statusCode = 409;
    err.code = "EMAIL_CONFLICT";
    throw err;
  }

  const password_hash = await bcrypt.hash(String(password), 10);
  const rolDb = API_TO_DB_ROLE.user;

  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol, fecha_registro)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING id, nombre, email, rol, fecha_registro;`,
    [nombre, email, password_hash, rolDb]
  );

  const user = rows[0];
  res.status(201).json({
    ok: true,
    data: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: mapDbRoleToApiRole(user.rol),
      fecha_registro: user.fecha_registro,
    },
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw badRequest("email y password son requeridos");

  const { rows } = await pool.query(
    "SELECT id, nombre, email, password_hash, rol FROM usuarios WHERE email = $1 LIMIT 1;",
    [email]
  );

  if (!rows.length) throw unauthorized("Credenciales inválidas");

  const user = rows[0];
  const match = await bcrypt.compare(String(password), String(user.password_hash));
  if (!match) throw unauthorized("Credenciales inválidas");

  const jwtSecret = process.env.JWT_SECRET || "inmob-secret";
  const apiRol = user.rol === "admin" ? "admin" : "user";
  const token = jwt.sign({ id: user.id, rol: apiRol }, jwtSecret, {
    expiresIn: "7d",
  });

  res.json({
    ok: true,
    data: {
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: apiRol,
      },
    },
  });
};

exports.me = async (req, res) => {
  if (!req.user || !req.user.id) throw unauthorized("No autorizado");

  const { rows } = await pool.query(
    "SELECT id, nombre, email, rol, fecha_registro FROM usuarios WHERE id = $1 LIMIT 1;",
    [req.user.id]
  );

  if (!rows.length) {
    const err = new Error("Usuario no existe");
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  const user = rows[0];
  res.json({
    ok: true,
    data: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol === "admin" ? "admin" : "user",
      fecha_registro: user.fecha_registro,
    },
  });
};
