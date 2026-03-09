const router = require("express").Router();
const asyncHandler = require("../middleware/asyncHandler");
const c = require("../controllers/corredores.controller");

router.get("/", asyncHandler(c.listCorredores));

module.exports = router;