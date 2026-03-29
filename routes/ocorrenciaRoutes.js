const express = require('express')
const router = express.Router()
const ocorrenciaController = require('../controllers/ocorrenciaController')
const { isAuthenticated } = require('../middlewares/authMiddleware')

router.get('/', isAuthenticated, ocorrenciaController.lista)
router.get('/nova', isAuthenticated, ocorrenciaController.novaPage)
router.post('/nova', isAuthenticated, ocorrenciaController.criar)
router.get('/produtos', isAuthenticated, ocorrenciaController.produtosPorEmpresa)
router.get('/:id', isAuthenticated, ocorrenciaController.detalhe)

module.exports = router
