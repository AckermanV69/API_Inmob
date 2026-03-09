require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const pool = require("./db/pool");

const inmueblesRoutes = require("./routes/inmuebles.routes");
const transaccionesRoutes = require("./routes/transacciones.routes");
const comisionesRoutes = require("./routes/comisiones.routes");
const reportesRoutes = require("./routes/reportes.routes");
const dashBoardRoutes = require("./routes/dashBoard.routes");
const auditoriaRoutes = require("./routes/auditoria.routes");
const gpsRoutes = require("./routes/gps.routes");
const geoRoutes = require("./routes/geo.routes");
const estadosRoutes = require("./routes/estados.routes");
const municipiosRoutes = require("./routes/municipios.routes");
const ciudadesRoutes = require("./routes/ciudades.routes");
const sectoresRoutes = require("./routes/sectores.routes");
const tiposRoutes = require("./routes/tiposInmuebles.routes");
const corredoresRoutes = require("./routes/corredores.routes");
const usuariosRoutes = require("./routes/usuarios.routes");
const authRoutes = require("./routes/auth.routes");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/dbtest", async (_req, res) => {
  try {
    const r = await pool.query(
      "SELECT current_database() as db, current_user as usr, inet_server_port() as port;"
    );
    res.json({ ok: true, conn: r.rows[0] });
  } catch (err) {
    console.error("DBTEST ERROR:", err);
    res.status(500).json({
      ok: false,
      message: err.message,
      code: err.code,
      detail: err.detail,
    });
  }
});

app.use((err, _req, res, _next) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    ok: false,
    error: err.code || "INTERNAL_ERROR",
    message: err.message || "Error interno"
  });
});

app.use("/inmuebles", inmueblesRoutes);
app.use("/transacciones", transaccionesRoutes);
app.use("/comisiones", comisionesRoutes);
app.use("/reportes", reportesRoutes);
app.use("/dashboard", dashBoardRoutes);
app.use("/auditoria", auditoriaRoutes);
app.use("/gps", gpsRoutes);
app.use("/geo", geoRoutes);
app.use("/corredores", corredoresRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/auth", authRoutes);
app.use("/tipos", tiposRoutes);
app.use("/estados", estadosRoutes);
app.use("/municipios", municipiosRoutes);
app.use("/ciudades", ciudadesRoutes);
app.use("/sectores", sectoresRoutes);


const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));

const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);