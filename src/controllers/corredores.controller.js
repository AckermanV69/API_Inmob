const pool = require("../db/pool");

exports.listCorredores = async (req, res) => {
  const { q } = req.query;

  const values = [];
  let where = "";

  if (q) {
    values.push(`%${q}%`);
    where = `WHERE u.nombre ILIKE $1 OR u.email ILIKE $1`;
  }

  const { rows } = await pool.query(
    `
    SELECT
      c.id,
      c.licencia_nro,
      c.telefono,
      c.comision_base,
      u.nombre AS corredor_nombre,
      u.email  AS corredor_email
    FROM corredores c
    JOIN usuarios u ON u.id = c.usuario_id
    ${where}
    ORDER BY c.id ASC;
    `,
    values
  );

  res.json({ ok: true, data: rows });
};