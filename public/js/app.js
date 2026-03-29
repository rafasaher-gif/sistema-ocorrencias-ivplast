console.log('Sistema IVPLAST carregado')

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formNovaOcorrencia')
  if (!form) return

  const cnpjInput = document.getElementById('cnpj')

  const radiosNfd = document.querySelectorAll('input[name="tem_nfd"]')
  const numeroNfd = document.getElementById('numero_nfd')

  const origemErro = document.getElementById('origem_erro')
  const cardDynamic = document.getElementById('cardDynamic')
  const qTransportadora = document.getElementById('qTransportadora')
  const qFabrica = document.getElementById('qFabrica')
  const qSimples = document.getElementById('qSimples')

  const radiosFaltouVolume = document.querySelectorAll('input[name="faltou_volume"]')
  const quantidadeVolumes = document.getElementById('quantidade_volumes_faltantes')

  const radiosFabricaOk = document.querySelectorAll('input[name="volume_saiu_correto_fabrica"]')
  const radiosTransmacOk = document.querySelectorAll('input[name="volume_saiu_correto_transmac"]')
  const toastTransportadora = document.getElementById('toastTransportadora')

  const faturadoPor = document.getElementById('faturado_por')
  const itensJson = document.getElementById('itens_json')

  const builderConfigs = [
    {
      radioName: 't_faltou_item',
      wrapId: 'tItensFaltouWrap',
      listId: 'tItensFaltouList',
      selectId: 't_faltou_produto_select',
      qtyId: 't_faltou_quantidade',
      btnId: 'btnAddTFaltou',
      tipo: 'transportadora_faltou'
    },
    {
      radioName: 't_sobrou_item',
      wrapId: 'tItensSobrouWrap',
      listId: 'tItensSobrouList',
      selectId: 't_sobrou_produto_select',
      qtyId: 't_sobrou_quantidade',
      btnId: 'btnAddTSobrou',
      tipo: 'transportadora_sobrou'
    },
    {
      radioName: 'f_faltou_item',
      wrapId: 'fItensFaltouWrap',
      listId: 'fItensFaltouList',
      selectId: 'f_faltou_produto_select',
      qtyId: 'f_faltou_quantidade',
      btnId: 'btnAddFFaltou',
      tipo: 'fabrica_faltou'
    },
    {
      radioName: 'f_sobrou_item',
      wrapId: 'fItensSobrouWrap',
      listId: 'fItensSobrouList',
      selectId: 'f_sobrou_produto_select',
      qtyId: 'f_sobrou_quantidade',
      btnId: 'btnAddFSobrou',
      tipo: 'fabrica_sobrou'
    }
  ]

  const itensState = {
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

  function toggleNfd() {
    const valor = getRadioValue('tem_nfd')
    const habilitar = valor === 'true'
    numeroNfd.disabled = !habilitar
    numeroNfd.required = habilitar
    if (!habilitar) numeroNfd.value = ''
  }

  function atualizarQuestionario() {
    const origem = origemErro.value

    cardDynamic.classList.add('hidden')
    qTransportadora.classList.add('hidden')
    qFabrica.classList.add('hidden')
    qSimples.classList.add('hidden')

    if (!origem) return

    cardDynamic.classList.remove('hidden')

    if (origem === 'Transportadora') {
      qTransportadora.classList.remove('hidden')
      return
    }

    if (origem === 'Fábrica') {
      qFabrica.classList.remove('hidden')
      return
    }

    qSimples.classList.remove('hidden')
  }

  function toggleQtdVolumes() {
    const valor = getRadioValue('faltou_volume')
    const habilitar = valor === 'true'
    quantidadeVolumes.disabled = !habilitar
    if (!habilitar) quantidadeVolumes.value = ''
  }

  function atualizarToastTransportadora() {
    const fabricaOk = getRadioValue('volume_saiu_correto_fabrica') === 'true'
    const transmacOk = getRadioValue('volume_saiu_correto_transmac') === 'true'
    toastTransportadora.classList.toggle('hidden', !(fabricaOk && transmacOk))
  }

  function flattenItens() {
    return [
      ...itensState.transportadora_faltou,
      ...itensState.transportadora_sobrou,
      ...itensState.fabrica_faltou,
      ...itensState.fabrica_sobrou
    ]
  }

  function atualizarItensJson() {
    itensJson.value = JSON.stringify(flattenItens())
  }

  function renderList(tipo, tbody) {
    const itens = itensState[tipo]
    tbody.innerHTML = ''

    if (!itens.length) {
      tbody.innerHTML = '<tr class="sem-itens-row"><td colspan="5">Nenhum item adicionado.</td></tr>'
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

  async function carregarProdutosParaSelect(select, empresa) {
    select.innerHTML = '<option value="">Carregando...</option>'

    if (!empresa) {
      select.innerHTML = '<option value="">Selecione o faturado por primeiro</option>'
      return
    }

    try {
      const response = await fetch(`/ocorrencias/produtos?empresa=${encodeURIComponent(empresa)}`)
      const data = await response.json()

      select.innerHTML = '<option value="">Selecione</option>'

      if (!data.produtos || !data.produtos.length) {
        select.innerHTML = '<option value="">Nenhum produto encontrado</option>'
        return
      }

      data.produtos.forEach(produto => {
        const option = document.createElement('option')
        option.value = produto.id
        option.dataset.codigo = produto.codigo
        option.dataset.nome = produto.nome
        option.dataset.empresa = produto.empresa
        option.textContent = `${produto.codigo} - ${produto.nome}`
        select.appendChild(option)
      })
    } catch (error) {
      select.innerHTML = '<option value="">Erro ao carregar produtos</option>'
    }
  }

  async function carregarTodosProdutos() {
    const empresa = faturadoPor.value

    for (const cfg of builderConfigs) {
      const select = document.getElementById(cfg.selectId)
      await carregarProdutosParaSelect(select, empresa)
    }
  }

  function toggleWrapByRadio(cfg) {
    const valor = getRadioValue(cfg.radioName)
    const wrap = document.getElementById(cfg.wrapId)
    wrap.classList.toggle('hidden', valor !== 'true')
  }

  function adicionarItem(cfg) {
    const select = document.getElementById(cfg.selectId)
    const qty = document.getElementById(cfg.qtyId)
    const selected = select.options[select.selectedIndex]

    if (!faturadoPor.value) {
      alert('Selecione primeiro o campo "Faturado por".')
      return
    }

    if (!select.value) {
      alert('Selecione um produto.')
      return
    }

    if (!qty.value || Number(qty.value) <= 0) {
      alert('Informe uma quantidade válida.')
      return
    }

    itensState[cfg.tipo].push({
      tipo_bloco: cfg.tipo,
      produto_id: Number(select.value),
      codigo_produto: selected.dataset.codigo,
      nome_produto: selected.dataset.nome,
      empresa: selected.dataset.empresa,
      quantidade: Number(qty.value)
    })

    const tbody = document.getElementById(cfg.listId)
    renderList(cfg.tipo, tbody)
    atualizarItensJson()

    select.value = ''
    qty.value = ''
  }

  function bindConfig(cfg) {
    const radios = document.querySelectorAll(`input[name="${cfg.radioName}"]`)
    const btn = document.getElementById(cfg.btnId)
    const tbody = document.getElementById(cfg.listId)

    radios.forEach(r => {
      r.addEventListener('change', () => toggleWrapByRadio(cfg))
    })

    btn.addEventListener('click', () => adicionarItem(cfg))

    tbody.addEventListener('click', (e) => {
      if (!e.target.classList.contains('btn-remover-item')) return
      if (e.target.dataset.tipo !== cfg.tipo) return

      const index = Number(e.target.dataset.index)
      itensState[cfg.tipo].splice(index, 1)
      renderList(cfg.tipo, tbody)
      atualizarItensJson()
    })

    toggleWrapByRadio(cfg)
    renderList(cfg.tipo, tbody)
  }

  radiosNfd.forEach(r => r.addEventListener('change', toggleNfd))
  radiosFaltouVolume.forEach(r => r.addEventListener('change', toggleQtdVolumes))
  radiosFabricaOk.forEach(r => r.addEventListener('change', atualizarToastTransportadora))
  radiosTransmacOk.forEach(r => r.addEventListener('change', atualizarToastTransportadora))
  origemErro.addEventListener('change', atualizarQuestionario)
  faturadoPor.addEventListener('change', async () => {
    Object.keys(itensState).forEach(k => itensState[k] = [])
    await carregarTodosProdutos()
    builderConfigs.forEach(cfg => {
      const tbody = document.getElementById(cfg.listId)
      renderList(cfg.tipo, tbody)
    })
    atualizarItensJson()
  })

  builderConfigs.forEach(bindConfig)

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

  toggleNfd()
  toggleQtdVolumes()
  atualizarToastTransportadora()
  atualizarQuestionario()
  atualizarItensJson()
})
