const router = require("express").Router();
const {
  getResumen,
  getTopCorredores,
  getPorTipoOperacion,
  getEstatusPago,
  listTransacciones,
} = require("../controllers/reportes.controller");

router.get("/resumen", getResumen);
router.get("/top-corredores", getTopCorredores);
router.get("/por-tipo", getPorTipoOperacion);
router.get("/estatus-pago", getEstatusPago);
router.get("/transacciones", listTransacciones);

module.exports = router;
