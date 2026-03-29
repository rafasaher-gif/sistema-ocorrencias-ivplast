const pool = require('../config/database')

function somenteNumeros(valor = '') {
  return String(valor).replace(/\D/g, '')
}

function parseBoolean(valor) {
  if (valor === true || valor === 'true' || valor === '1' || valor === 1 || valor === 'Sim' || valor === 'sim') return true
  if (valor === false || valor === 'false' || valor === '0' || valor === 0 || valor === 'Não' || valor === 'Nao' || valor === 'não' || valor === 'nao') return false
  return null
}

function garantirArray(valor) {
  if (!valor) return []
  if (Array.isArray(valor)) return valor
  return [valor]
}

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

    const proximoNumeroResult = await pool.query(`
      SELECT COALESCE(MAX(numero), 99) + 1 AS proximo_numero
      FROM ocorrencias
    `)

    const produtosResult = await pool.query(`
      SELECT id, codigo, nome, empresa
      FROM produtos
      WHERE ativo = TRUE
      ORDER BY empresa ASC, nome ASC
    `)

    return res.render('nova_ocorrencia', {
      usuarios: usuariosResult.rows,
      produtos: produtosResult.rows,
      proximoNumero: proximoNumeroResult.rows[0]?.proximo_numero || 100
    })
  } catch (error) {
    console.error('Erro ao carregar tela nova ocorrência:', error)
    return res.status(500).send('Erro ao abrir nova ocorrência')
  }
}

exports.produtosPorEmpresa = async (req, res) => {
  try {
    const empresa = req.query.empresa || ''

    if (!empresa || !['IVPLAST', 'VENANI'].includes(empresa)) {
      return res.status(400).json({ erro: 'Empresa inválida.' })
    }

    const result = await pool.query(`
      SELECT id, codigo, nome, empresa
      FROM produtos
      WHERE ativo = TRUE
        AND empresa = $1
      ORDER BY nome ASC
    `, [empresa])

    return res.json({ produtos: result.rows })
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)
    return res.status(500).json({ erro: 'Erro ao buscar produtos.' })
  }
}

exports.criar = async (req, res) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const {
      razao_social,
      cnpj,
      numero_pedido,
      numero_nf,
      tem_nfd,
      numero_nfd,
      faturado_por,
      responsavel_usuario_id,
      origem_erro,
      titulo,
      descricao,
      itens_json,
      faltou_volume,
      quantidade_volumes_faltantes,
      volume_saiu_correto_fabrica,
      volume_saiu_correto_transmac,
      faltou_item,
      sobrou_item
    } = req.body

    if (!razao_social || !cnpj || !numero_pedido || !numero_nf) {
      await client.query('ROLLBACK')
      return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios do bloco Cliente.' })
    }

    if (!faturado_por || !['IVPLAST', 'VENANI'].includes(faturado_por)) {
      await client.query('ROLLBACK')
      return res.status(400).json({ erro: 'Faturado por inválido.' })
    }

    if (!responsavel_usuario_id) {
      await client.query('ROLLBACK')
      return res.status(400).json({ erro: 'Responsável é obrigatório.' })
    }

    if (!origem_erro || !['Transportadora', 'Fábrica', 'Cliente', 'Vendedor', 'Outro'].includes(origem_erro)) {
      await client.query('ROLLBACK')
      return res.status(400).json({ erro: 'Origem do erro inválida.' })
    }

    if (!titulo || !descricao) {
      await client.query('ROLLBACK')
      return res.status(400).json({ erro: 'Título e descrição são obrigatórios.' })
    }

    const proximoNumeroResult = await client.query(`
      SELECT COALESCE(MAX(numero), 99) + 1 AS proximo_numero
      FROM ocorrencias
    `)
    const proximoNumero = proximoNumeroResult.rows[0]?.proximo_numero || 100

    const statusResult = await client.query(`
      SELECT id
      FROM status
      WHERE nome = 'Aberto'
      LIMIT 1
    `)

    if (!statusResult.rows.length) {
      await client.query('ROLLBACK')
      return res.status(500).json({ erro: 'Status inicial "Aberto" não encontrado.' })
    }

    const statusId = statusResult.rows[0].id

    const ocorrenciaResult = await client.query(`
      INSERT INTO ocorrencias (
        numero,
        cliente,
        descricao,
        status,
        criado_por,
        razao_social,
        cnpj,
        numero_pedido,
        numero_nf,
        tem_nfd,
        numero_nfd,
        faturado_por,
        responsavel_usuario_id,
        origem_erro,
        titulo,
        status_id
      )
      VALUES (
        $1, $2, $3, 'Aberto', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      RETURNING id, numero
    `, [
      proximoNumero,
      razao_social,
      descricao,
      req.session.usuario.id,
      razao_social,
      cnpj,
      numero_pedido,
      numero_nf,
      parseBoolean(tem_nfd),
      numero_nfd || null,
      faturado_por,
      responsavel_usuario_id,
      origem_erro,
      titulo,
      statusId
    ])

    const ocorrenciaId = ocorrenciaResult.rows[0].id

    await client.query(`
      INSERT INTO historico_ocorrencias (
        ocorrencia_id,
        usuario_id,
        acao,
        tipo_evento,
        titulo_evento,
        descricao_evento
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      ocorrenciaId,
      req.session.usuario.id,
      'Criação da ocorrência',
      'CRIACAO',
      'Ocorrência aberta',
      `Ocorrência ${proximoNumero} criada com status Aberto.`
    ])

    const deveCriarQuestionario = ['Transportadora', 'Fábrica'].includes(origem_erro)

    if (deveCriarQuestionario) {
      await client.query(`
        INSERT INTO ocorrencia_questionario (
          ocorrencia_id,
          faltou_volume,
          quantidade_volumes_faltantes,
          volume_saiu_correto_fabrica,
          volume_saiu_correto_transmac,
          faltou_item,
          sobrou_item
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        ocorrenciaId,
        parseBoolean(faltou_volume),
        quantidade_volumes_faltantes ? parseInt(quantidade_volumes_faltantes, 10) : null,
        parseBoolean(volume_saiu_correto_fabrica),
        parseBoolean(volume_saiu_correto_transmac),
        parseBoolean(faltou_item),
        parseBoolean(sobrou_item)
      ])
    }

    let itens = []
    if (itens_json) {
      try {
        itens = JSON.parse(itens_json)
      } catch (e) {
        itens = []
      }
    }

    if (Array.isArray(itens) && itens.length) {
      for (const item of itens) {
        if (!item) continue

        await client.query(`
          INSERT INTO ocorrencia_itens (
            ocorrencia_id,
            tipo_bloco,
            empresa,
            produto_id,
            codigo_produto,
            nome_produto,
            quantidade
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          ocorrenciaId,
          item.tipo_bloco || 'principal',
          faturado_por,
          item.produto_id || null,
          item.codigo_produto || null,
          item.nome_produto || null,
          item.quantidade || 0
        ])
      }
    }

    await client.query('COMMIT')

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Ocorrência criada com sucesso.',
      ocorrencia_id: ocorrenciaId,
      numero: proximoNumero,
      redirect: '/ocorrencias'
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Erro ao criar ocorrência:', error)
    return res.status(500).json({ erro: 'Erro interno ao criar ocorrência.' })
  } finally {
    client.release()
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
