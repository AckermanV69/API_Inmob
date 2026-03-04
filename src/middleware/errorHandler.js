module.exports = function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || 500;

  res.status(status).json({
    ok: false,
    error: err.code || "INTERNAL_ERROR",
    message: err.message || "Error interno",
    detail: err.detail, // útil si viene de Postgres
  });
};

