const router = require("express").Router();
const asyncHandler = require("../middleware/asyncHandler");
const c = require("../controllers/usuarios.controller");

router.get("/", asyncHandler(c.listUsuarios));
router.get("/:id", asyncHandler(c.getUsuarioById));
router.post("/", asyncHandler(c.createUsuario));
router.patch("/:id", asyncHandler(c.patchUsuario));

module.exports = router;
