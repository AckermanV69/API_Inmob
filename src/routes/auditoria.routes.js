const router = require("express").Router();
const { listAuditoria } = require("../controllers/auditoria.controller");

router.get("/", listAuditoria);

module.exports = router;