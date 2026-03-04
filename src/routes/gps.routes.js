const router = require("express").Router();
const { listGps } = require("../controllers/gps.controller");

router.get("/", listGps);
module.exports = router;