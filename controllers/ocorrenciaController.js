const pool = require('../config/database')

exports.lista = async (req, res) => {
  try {
    const busca = req.query.busca || ''
    const status = req.query.status || ''
    const ordem = req.query.ordem || 'mais_antigo'
    const pagina = parseInt(req.query.pagina || '1', 10)
    const limite = 30
    const offset = (pagina - 1) * limite

    const where = []
    const params = []
    let idx = 1

    if (busca) {
      where.push(`(
        CAST(o.numero AS TEXT) ILIKE $${idx}
        OR COALESCE(o.razao_social, o.cliente, '') ILIKE $${idx}
        OR COALESCE(o.cnpj, '') ILIKE $${idx}
      )`)
      params.push(`%${busca}%`)
      idx++
    }

    if (status) {
      where.push(`s.nome = $${idx}`)
      params.push(status)
      idx++
    }

    where.push(`COALESCE(o.excluida, FALSE) = FALSE`)

    let orderBy = `o.criado_em ASC`
    if (ordem === 'mais_novo') orderBy = `o.criado_em DESC`
    if (ordem === 'a_z') orderBy = `COALESCE(o.razao_social, o.cliente, '') ASC`
    if (ordem === 'z_a') orderBy = `COALESCE(o.razao_social, o.cliente, '') DESC`

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const totalQuery = `
      SELECT COUNT(*)::int AS total
      FROM ocorrencias o
      LEFT JOIN status s ON s.id = o.status_id
      ${whereSql}
    `
    const totalResult = await pool.query(totalQuery, params)
    const total = totalResult.rows[0]?.total || 0
    const totalPaginas = Math.max(1, Math.ceil(total / limite))

    const query = `
      SELECT
        o.id,
        o.numero,
        o.criado_em,
        COALESCE(o.razao_social, o.cliente) AS cliente,
        o.cnpj,
        o.numero_pedido,
        o.origem_erro,
        o.titulo,
        s.nome AS status_nome,
        u.nome AS responsavel_nome
      FROM ocorrencias o
      LEFT JOIN status s ON s.id = o.status_id
      LEFT JOIN usuarios u ON u.id = o.responsavel_usuario_id
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT $${idx} OFFSET $${idx + 1}
    `

    const queryParams = [...params, limite, offset]
    const result = await pool.query(query, queryParams)

    const abertasResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM ocorrencias o
      LEFT JOIN status s ON s.id = o.status_id
      WHERE COALESCE(o.excluida, FALSE) = FALSE
        AND COALESCE(s.nome, '') <> 'Resolvido Aprovado'
    `)

    const statusResult = await pool.query(`
      SELECT id, nome, ordem_fluxo
      FROM status
      WHERE ativo = TRUE
      ORDER BY ordem_fluxo
    `)

    return res.render('lista_ocorrencias', {
      ocorrencias: result.rows,
      busca,
      statusFiltro: status,
      ordem,
      pagina,
      totalPaginas,
      totalAbertas: abertasResult.rows[0]?.total || 0,
      statusList: statusResult.rows
    })
  } catch (error) {
    console.error('Erro ao carregar ocorrências:', error)
    return res.status(500).send('Erro ao carregar lista de ocorrências')
  }
}

exports.novaPage = async (req, res) => {
  try {
    const usuariosResult = await pool.query(`
      SELECT id, nome, perfil
      FROM usuarios
      WHERE ativo = TRUE
      ORDER BY nome ASC
    `)

    return res.render('nova_ocorrencia', {
      usuarios: usuariosResult.rows
    })
  } catch (error) {
    console.error('Erro ao carregar tela nova ocorrência:', error)
    return res.status(500).send('Erro ao abrir nova ocorrência')
  }
}

exports.detalhe = async (req, res) => {
  try {
    return res.render('acompanhamento_ocorrencia', { id: req.params.id })
  } catch (error) {
    console.error('Erro ao abrir detalhe da ocorrência:', error)
    return res.status(500).send('Erro ao abrir ocorrência')
  }
}
