const router = require("express").Router();
const { listComisiones, getComisionById, updateEstatusPago } = require("../controllers/comisiones.controller");

router.get("/", listComisiones);
router.get("/:id", getComisionById);
router.patch("/:id/estatus-pago", updateEstatusPago);

module.exports = router;