const router = require("express").Router();
const asyncHandler = require("../middleware/asyncHandler");
const c = require("../controllers/municipios.controller");

router.get("/", asyncHandler(c.listMunicipios));

module.exports = router;
