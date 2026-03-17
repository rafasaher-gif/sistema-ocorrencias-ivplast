
const express = require('express')
const router = express.Router()
const configuracaoController = require('../controllers/configuracaoController')
const { isAuthenticated } = require('../middlewares/authMiddleware')
const { requireRole } = require('../middlewares/roleMiddleware')

router.get('/', isAuthenticated, requireRole(['Administrador']), configuracaoController.index)

module.exports = router
