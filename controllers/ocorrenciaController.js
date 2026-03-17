
exports.lista = async (req, res) => {
  return res.render('lista_ocorrencias')
}

exports.novaPage = async (req, res) => {
  return res.render('nova_ocorrencia')
}

exports.detalhe = async (req, res) => {
  return res.render('acompanhamento_ocorrencia', { id: req.params.id })
}
