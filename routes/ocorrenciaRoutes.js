const express = require('express')
const multer = require('multer')
const router = express.Router()
const ocorrenciaController = require('../controllers/ocorrenciaController')
const { isAuthenticated } = require('../middlewares/authMiddleware')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 10,
    fileSize: 10 * 1024 * 1024
  }
})

router.get('/', isAuthenticated, ocorrenciaController.lista)
router.get('/nova', isAuthenticated, ocorrenciaController.novaPage)
router.post('/nova', isAuthenticated, upload.array('anexos', 10), ocorrenciaController.criar)
router.get('/produtos', isAuthenticated, ocorrenciaController.produtosPorEmpresa)

router.get('/:id', isAuthenticated, ocorrenciaController.detalhe)
router.post('/:id/atualizar', isAuthenticated, upload.array('anexos', 10), ocorrenciaController.atualizarOcorrencia)

module.exports = router
