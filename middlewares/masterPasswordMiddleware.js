
exports.checkMasterPassword = (req, res, next) => {
  const { master_password } = req.body

  if (!master_password || master_password !== process.env.MASTER_PASSWORD) {
    return res.status(403).send('Senha master inválida')
  }

  return next()
}
