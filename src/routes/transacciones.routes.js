const router = require("express").Router();
const {
  createTransaccion,
  listTransacciones,
  getTransaccionById,
} = require("../controllers/transacciones.controller");

router.get("/", listTransacciones);
router.get("/:id", getTransaccionById);
router.post("/", createTransaccion);

module.exports = router;