console.log('Sistema IVPLAST carregado')

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formNovaOcorrencia')
  if (!form) return

  const cnpjInput = document.getElementById('cnpj')
  const numeroNfd = document.getElementById('numero_nfd')
  const radiosNfd = document.querySelectorAll('input[name="tem_nfd"]')

  const origemErro = document.getElementById('origem_erro')
  const cardQuestionario = document.getElementById('cardQuestionario')
  const questionarioTransportadora = document.getElementById('questionarioTransportadora')
  const questionarioFabrica = document.getElementById('questionarioFabrica')
  const questionarioSimples = document.getElementById('questionarioSimples')

  const quantidadeVolumes = document.getElementById('quantidade_volumes_faltantes')
  const radiosFaltouVolume = document.querySelectorAll('input[name="faltou_volume"]')
  const radiosFabricaOk = document.querySelectorAll('input[name="volume_saiu_correto_fabrica"]')
  const radiosTransmacOk = document.querySelectorAll('input[name="volume_saiu_correto_transmac"]')

  const alertaTransportadora = document.getElementById('alertaTransportadora')
  const modalTransportadora = document.getElementById('modalTransportadora')
  const btnFecharModalTransportadora = document.getElementById('btnFecharModalTransportadora')

  const faturadoPor = document.getElementById('faturado_por')
  const itensJson = document.getElementById('itens_json')

  const blocosItens = [
    {
      radioName: 't_faltou_item',
      wrapId: 'wrap_t_faltou',
      buscaId: 'busca_t_faltou',
      listaId: 'lista_t_faltou',
      codigoId: 'codigo_t_faltou',
      nomeId: 'nome_t_faltou',
      quantidadeId: 'quantidade_t_faltou',
      btnId: 'btnAddTFaltou',
      tbodyId: 'tbody_t_faltou',
      tipo: 'transportadora_faltou'
    },
    {
      radioName: 't_sobrou_item',
      wrapId: 'wrap_t_sobrou',
      buscaId: 'busca_t_sobrou',
      listaId: 'lista_t_sobrou',
      codigoId: 'codigo_t_sobrou',
      nomeId: 'nome_t_sobrou',
      quantidadeId: 'quantidade_t_sobrou',
      btnId: 'btnAddTSobrou',
      tbodyId: 'tbody_t_sobrou',
      tipo: 'transportadora_sobrou'
    },
    {
      radioName: 'f_faltou_item',
      wrapId: 'wrap_f_faltou',
      buscaId: 'busca_f_faltou',
      listaId: 'lista_f_faltou',
      codigoId: 'codigo_f_faltou',
      nomeId: 'nome_f_faltou',
      quantidadeId: 'quantidade_f_faltou',
      btnId: 'btnAddFFaltou',
      tbodyId: 'tbody_f_faltou',
      tipo: 'fabrica_faltou'
    },
    {
      radioName: 'f_sobrou_item',
      wrapId: 'wrap_f_sobrou',
      buscaId: 'busca_f_sobrou',
      listaId: 'lista_f_sobrou',
      codigoId: 'codigo_f_sobrou',
      nomeId: 'nome_f_sobrou',
      quantidadeId: 'quantidade_f_sobrou',
      btnId: 'btnAddFSobrou',
      tbodyId: 'tbody_f_sobrou',
      tipo: 'fabrica_sobrou'
    }
  ]

  let produtosDisponiveis = []
  const itensPorBloco = {
    transportadora_faltou: [],
    transportadora_sobrou: [],
    fabrica_faltou: [],
    fabrica_sobrou: []
  }

  function aplicarMascaraCnpj(valor) {
    return valor
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18)
  }

  function getRadioValue(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`)
    return checked ? checked.value : ''
  }

  function atualizarNfd() {
    const habilitar = getRadioValue('tem_nfd') === 'true'
    numeroNfd.disabled = !habilitar
    numeroNfd.required = habilitar
    if (!habilitar) numeroNfd.value = ''
  }

  function atualizarQuestionario() {
    const origem = origemErro.value

    cardQuestionario.classList.add('hidden')
    questionarioTransportadora.classList.add('hidden')
    questionarioFabrica.classList.add('hidden')
    questionarioSimples.classList.add('hidden')

    if (!origem) return

    cardQuestionario.classList.remove('hidden')

    if (origem === 'Transportadora') {
      questionarioTransportadora.classList.remove('hidden')
      return
    }

    if (origem === 'Fábrica') {
      questionarioFabrica.classList.remove('hidden')
      return
    }

    questionarioSimples.classList.remove('hidden')
  }

  function atualizarQtdVolumes() {
    const habilitar = getRadioValue('faltou_volume') === 'true'
    quantidadeVolumes.disabled = !habilitar
    if (!habilitar) quantidadeVolumes.value = ''
  }

  let modalJaMostrado = false

  function atualizarAlertaTransportadora() {
    const fabricaOk = getRadioValue('volume_saiu_correto_fabrica') === 'true'
    const transmacOk = getRadioValue('volume_saiu_correto_transmac') === 'true'
    const mostrar = fabricaOk && transmacOk

    alertaTransportadora.classList.toggle('hidden', !mostrar)

    if (mostrar && !modalJaMostrado) {
      modalTransportadora.classList.remove('hidden')
      modalJaMostrado = true
    }

    if (!mostrar) {
      modalJaMostrado = false
    }
  }

  function fecharModalTransportadora() {
    modalTransportadora.classList.add('hidden')
  }

  function todosItens() {
    return [
      ...itensPorBloco.transportadora_faltou,
      ...itensPorBloco.transportadora_sobrou,
      ...itensPorBloco.fabrica_faltou,
      ...itensPorBloco.fabrica_sobrou
    ]
  }

  function atualizarItensJson() {
    itensJson.value = JSON.stringify(todosItens())
  }

  function limparAutocomplete(cfg) {
    document.getElementById(cfg.buscaId).value = ''
    document.getElementById(cfg.codigoId).value = ''
    document.getElementById(cfg.nomeId).value = ''
    document.getElementById(cfg.buscaId).dataset.produtoId = ''
    document.getElementById(cfg.listaId).innerHTML = ''
  }

  function renderTabela(tipo, tbodyId) {
    const tbody = document.getElementById(tbodyId)
    const itens = itensPorBloco[tipo]

    tbody.innerHTML = ''

    if (!itens.length) {
      tbody.innerHTML = '<tr><td colspan="5">Nenhum item adicionado.</td></tr>'
      return
    }

    itens.forEach((item, index) => {
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${item.codigo_produto || ''}</td>
        <td>${item.nome_produto || ''}</td>
        <td>${item.empresa || ''}</td>
        <td>${item.quantidade || ''}</td>
        <td><button type="button" class="btn-remover-item" data-tipo="${tipo}" data-index="${index}">Remover</button></td>
      `
      tbody.appendChild(tr)
    })
  }

  function renderAutocomplete(cfg, termo) {
    const lista = document.getElementById(cfg.listaId)
    lista.innerHTML = ''

    if (!termo || termo.trim().length < 1) return

    const termoLower = termo.toLowerCase().trim()

    const encontrados = produtosDisponiveis.filter(produto => {
      const codigo = String(produto.codigo || '').toLowerCase()
      const nome = String(produto.nome || '').toLowerCase()
      return codigo.includes(termoLower) || nome.includes(termoLower)
    }).slice(0, 10)

    if (!encontrados.length) return

    encontrados.forEach(produto => {
      const item = document.createElement('button')
      item.type = 'button'
      item.className = 'autocomplete-item'
      item.textContent = `${produto.codigo} - ${produto.nome}`

      item.addEventListener('click', () => {
        document.getElementById(cfg.buscaId).value = `${produto.codigo} - ${produto.nome}`
        document.getElementById(cfg.codigoId).value = produto.codigo
        document.getElementById(cfg.nomeId).value = produto.nome
        document.getElementById(cfg.buscaId).dataset.produtoId = produto.id
        lista.innerHTML = ''
      })

      lista.appendChild(item)
    })
  }

  async function carregarProdutos() {
    const empresa = faturadoPor.value
    produtosDisponiveis = []

    if (!empresa) {
      blocosItens.forEach(cfg => limparAutocomplete(cfg))
      return
    }

    try {
      const response = await fetch(`/ocorrencias/produtos?empresa=${encodeURIComponent(empresa)}`)
      const data = await response.json()
      produtosDisponiveis = Array.isArray(data.produtos) ? data.produtos : []
      blocosItens.forEach(cfg => limparAutocomplete(cfg))
    } catch (error) {
      produtosDisponiveis = []
      blocosItens.forEach(cfg => limparAutocomplete(cfg))
    }
  }

  function atualizarExibicaoBlocoItens(cfg) {
    const wrap = document.getElementById(cfg.wrapId)
    const mostrar = getRadioValue(cfg.radioName) === 'true'
    wrap.classList.toggle('hidden', !mostrar)
  }

  function adicionarItem(cfg) {
    const produtoId = document.getElementById(cfg.buscaId).dataset.produtoId
    const codigo = document.getElementById(cfg.codigoId).value
    const nome = document.getElementById(cfg.nomeId).value
    const quantidade = document.getElementById(cfg.quantidadeId).value

    if (!faturadoPor.value) {
      alert('Selecione primeiro o campo "Faturado por".')
      return
    }

    if (!produtoId || !codigo || !nome) {
      alert('Selecione um produto na busca.')
      return
    }

    if (!quantidade || Number(quantidade) <= 0) {
      alert('Informe uma quantidade válida.')
      return
    }

    itensPorBloco[cfg.tipo].push({
      tipo_bloco: cfg.tipo,
      produto_id: Number(produtoId),
      codigo_produto: codigo,
      nome_produto: nome,
      empresa: faturadoPor.value,
      quantidade: Number(quantidade)
    })

    renderTabela(cfg.tipo, cfg.tbodyId)
    atualizarItensJson()
    limparAutocomplete(cfg)
    document.getElementById(cfg.quantidadeId).value = ''
  }

  function bindBloco(cfg) {
    const radios = document.querySelectorAll(`input[name="${cfg.radioName}"]`)
    const busca = document.getElementById(cfg.buscaId)
    const btn = document.getElementById(cfg.btnId)
    const tbody = document.getElementById(cfg.tbodyId)

    radios.forEach(r => {
      r.addEventListener('change', () => atualizarExibicaoBlocoItens(cfg))
    })

    busca.addEventListener('input', () => {
      busca.dataset.produtoId = ''
      document.getElementById(cfg.codigoId).value = ''
      document.getElementById(cfg.nomeId).value = ''
      renderAutocomplete(cfg, busca.value)
    })

    busca.addEventListener('focus', () => {
      renderAutocomplete(cfg, busca.value)
    })

    btn.addEventListener('click', () => adicionarItem(cfg))

    tbody.addEventListener('click', (e) => {
      if (!e.target.classList.contains('btn-remover-item')) return
      if (e.target.dataset.tipo !== cfg.tipo) return

      const index = Number(e.target.dataset.index)
      itensPorBloco[cfg.tipo].splice(index, 1)
      renderTabela(cfg.tipo, cfg.tbodyId)
      atualizarItensJson()
    })

    atualizarExibicaoBlocoItens(cfg)
    renderTabela(cfg.tipo, cfg.tbodyId)
  }

  radiosNfd.forEach(r => r.addEventListener('change', atualizarNfd))
  radiosFaltouVolume.forEach(r => r.addEventListener('change', atualizarQtdVolumes))
  radiosFabricaOk.forEach(r => r.addEventListener('change', atualizarAlertaTransportadora))
  radiosTransmacOk.forEach(r => r.addEventListener('change', atualizarAlertaTransportadora))

  origemErro.addEventListener('change', atualizarQuestionario)

  faturadoPor.addEventListener('change', async () => {
    Object.keys(itensPorBloco).forEach(chave => {
      itensPorBloco[chave] = []
    })

    await carregarProdutos()

    blocosItens.forEach(cfg => {
      renderTabela(cfg.tipo, cfg.tbodyId)
    })

    atualizarItensJson()
  })

  btnFecharModalTransportadora.addEventListener('click', fecharModalTransportadora)
  modalTransportadora.addEventListener('click', (e) => {
    if (e.target === modalTransportadora) fecharModalTransportadora()
  })

  document.addEventListener('click', (e) => {
    blocosItens.forEach(cfg => {
      const wrap = document.getElementById(cfg.listaId)
      const input = document.getElementById(cfg.buscaId)
      if (!wrap || !input) return
      if (!wrap.contains(e.target) && e.target !== input) {
        wrap.innerHTML = ''
      }
    })
  })

  blocosItens.forEach(bindBloco)

  cnpjInput.addEventListener('input', () => {
    cnpjInput.value = aplicarMascaraCnpj(cnpjInput.value)
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    if (getRadioValue('tem_nfd') === 'true' && !numeroNfd.value.trim()) {
      alert('Informe o número da NFD.')
      return
    }

    atualizarItensJson()

    const formData = new FormData(form)
    const payload = new URLSearchParams()

    for (const [key, value] of formData.entries()) {
      payload.append(key, value)
    }

    try {
      const response = await fetch('/ocorrencias/nova', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: payload.toString()
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.erro || 'Erro ao salvar ocorrência.')
        return
      }

      alert(`Ocorrência ${data.numero} criada com sucesso.`)
      window.location.href = data.redirect || '/ocorrencias'
    } catch (error) {
      alert('Erro de comunicação ao salvar ocorrência.')
    }
  })

  atualizarNfd()
  atualizarQuestionario()
  atualizarQtdVolumes()
  atualizarAlertaTransportadora()
  atualizarItensJson()
})
