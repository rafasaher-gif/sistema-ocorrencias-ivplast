const bcrypt = require('bcrypt')
const pool = require('../config/database')

exports.loginPage = (req, res) => {
  return res.render('login', { erro: null })
}

exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body

    console.log('Tentativa de login:', email)

    const result = await pool.query(
      'SELECT id, nome, email, senha_hash, perfil, ativo FROM usuarios WHERE email = $1 LIMIT 1',
      [email]
    )

    console.log('Usuários encontrados:', result.rows.length)

    if (result.rows.length === 0) {
      return res.status(401).render('login', { erro: 'Usuário ou senha inválidos.' })
    }

    const usuario = result.rows[0]

    console.log('Usuário encontrado:', usuario.email, 'ativo:', usuario.ativo)

    if (!usuario.ativo) {
      return res.status(403).render('login', { erro: 'Usuário inativo.' })
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash)

    console.log('Senha válida:', senhaValida)

    if (!senhaValida) {
      return res.status(401).render('login', { erro: 'Usuário ou senha inválidos.' })
    }

    req.session.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil
    }

    return res.redirect('/ocorrencias')
  } catch (error) {
    console.error('Erro no login:', error)
    return res.status(500).render('login', { erro: 'Erro interno no login.' })
  }
}

exports.logout = (req, res) => {
  req.session.destroy(() => {
    return res.redirect('/login')
  })
}
