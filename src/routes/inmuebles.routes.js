const router = require("express").Router();
const {
  listInmuebles,
  getInmuebleById,
  createInmueble,
  updateInmueble,
} = require("../controllers/inmuebles.controller");

router.get("/", listInmuebles);
router.get("/:id", getInmuebleById);
router.post("/", createInmueble);
router.patch("/:id", updateInmueble);

module.exports = router;