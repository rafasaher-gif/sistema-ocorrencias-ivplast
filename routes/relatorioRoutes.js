
const express = require('express')
const router = express.Router()
const relatorioController = require('../controllers/relatorioController')
const { isAuthenticated } = require('../middlewares/authMiddleware')

router.get('/', isAuthenticated, relatorioController.index)

module.exports = router
