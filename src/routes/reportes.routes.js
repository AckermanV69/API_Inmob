const router = require("express").Router();
const { getResumen } = require("../controllers/reportes.controller");

router.get("/resumen", getResumen);

module.exports = router;