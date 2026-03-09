const router = require("express").Router();
const asyncHandler = require("../middleware/asyncHandler");
const c = require("../controllers/inmuebles.controller");

router.get("/", asyncHandler(c.listInmuebles));
router.get("/:id", asyncHandler(c.getInmuebleById));
router.post("/", asyncHandler(c.createInmueble));
router.patch("/:id", asyncHandler(c.patchInmueble));
router.get("/disponibles", asyncHandler(c.listDisponiblesPorSector));

module.exports = router;