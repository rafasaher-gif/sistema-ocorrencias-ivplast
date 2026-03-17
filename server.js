const express = require('express')
const path = require('path')
const session = require('express-session')
const pgSession = require('connect-pg-simple')(session)
require('dotenv').config()

const pool = require('./config/database')

const authRoutes = require('./routes/authRoutes')
const ocorrenciaRoutes = require('./routes/ocorrenciaRoutes')
const relatorioRoutes = require('./routes/relatorioRoutes')
const configuracaoRoutes = require('./routes/configuracaoRoutes')

const app = express()

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: 'user_sessions'
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
)

app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null
  next()
})

app.use(authRoutes)
app.use('/ocorrencias', ocorrenciaRoutes)
app.use('/relatorios', relatorioRoutes)
app.use('/configuracao', configuracaoRoutes)

app.get('/', (req, res) => {
  return res.redirect('/login')
})

app.use((req, res) => {
  res.status(404).send('Página não encontrada')
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})
