
exports.requireRole = (rolesPermitidos = []) => {
  return (req, res, next) => {
    if (!req.session.usuario) {
      return res.redirect('/login')
    }

    if (!rolesPermitidos.includes(req.session.usuario.perfil)) {
      return res.status(403).send('Acesso negado')
    }

    return next()
  }
}
