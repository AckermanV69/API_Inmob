const router = require("express").Router();
const {
  getKpis,
  getSerie,
  getTopCorredores,
  getPorTipoOperacion,
  getEstatusPago,
  getDashboardCorredor,
} = require("../controllers/dashBoard.controller");

router.get("/kpis", getKpis);
router.get("/serie", getSerie);
router.get("/top-corredores", getTopCorredores);
router.get("/por-tipo", getPorTipoOperacion);
router.get("/estatus-pago", getEstatusPago);
router.get("/corredor/:id", getDashboardCorredor);

module.exports = router;