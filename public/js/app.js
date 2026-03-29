console.log('Sistema IVPLAST carregado')

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formNovaOcorrencia')
  if (!form) return

  const cnpjInput = document.getElementById('cnpj')
  const temNfd = document.getElementById('tem_nfd')
  const boxNumeroNfd = document.getElementById('box_numero_nfd')
  const numeroNfd = document.getElementById('numero_nfd')

  const origemErro = document.getElementById('origem_erro')
  const questionarioTransportadora = document.getElementById('questionario_transportadora')
  const questionarioFabrica = document.getElementById('questionario_fabrica')

  const faltouVolume = document.getElementById('faltou_volume')
  const boxQtdVolumes = document.getElementById('box_qtd_volumes')

  const volumeFabrica = document.getElementById('volume_saiu_correto_fabrica')
  const volumeTransmac = document.getElementById('volume_saiu_correto_transmac')
  const alertaTransportadora = document.getElementById('alerta_transportadora')

  const faturadoPor = document.getElementById('faturado_por')
  const produtoSelect = document.getElementById('produto_select')
  const quantidadeItem = document.getElementById('quantidade_item')
  const btnAdicionarItem = document.getElementById('btnAdicionarItem')
  const tabelaItensBody = document.querySelector('#tabelaItens tbody')
  const itensJson = document.getElementById('itens_json')

  const faltouItem = document.getElementById('faltou_item')
  const sobrouItem = document.getElementById('sobrou_item')
  const faltouItemFabrica = document.getElementById('faltou_item_fabrica')
  const sobrouItemFabrica = document.getElementById('sobrou_item_fabrica')

  let itens = []

  function aplicarMascaraCnpj(valor) {
    return valor
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18)
  }

  function atualizarItensJson() {
    itensJson.value = JSON.stringify(itens)
  }

  function renderizarItens() {
    tabelaItensBody.innerHTML = ''

    if (!itens.length) {
      tabelaItensBody.innerHTML = `
        <tr id="linhaSemItens">
          <td colspan="5">Nenhum item adicionado.</td>
        </tr>
      `
      atualizarItensJson()
      return
    }

    itens.forEach((item, index) => {
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${item.codigo_produto || ''}</td>
        <td>${item.nome_produto || ''}</td>
        <td>${item.empresa || ''}</td>
        <td>${item.quantidade || ''}</td>
        <td><button type="button" class="btn-remover-item" data-index="${index}">Remover</button></td>
      `
      tabelaItensBody.appendChild(tr)
    })

    atualizarItensJson()
  }

  async function carregarProdutos(empresa) {
    produtoSelect.innerHTML = '<option value="">Carregando...</option>'

    if (!empresa) {
      produtoSelect.innerHTML = '<option value="">Selecione o faturado por primeiro</option>'
      return
    }

    try {
      const response = await fetch(`/ocorrencias/produtos?empresa=${encodeURIComponent(empresa)}`)
      const data = await response.json()

      produtoSelect.innerHTML = '<option value="">Selecione</option>'

      if (!data.produtos || !data.produtos.length) {
        produtoSelect.innerHTML = '<option value="">Nenhum produto encontrado</option>'
        return
      }

      data.produtos.forEach(produto => {
        const option = document.createElement('option')
        option.value = produto.id
        option.dataset.codigo = produto.codigo
        option.dataset.nome = produto.nome
        option.dataset.empresa = produto.empresa
        option.textContent = `${produto.codigo} - ${produto.nome}`
        produtoSelect.appendChild(option)
      })
    } catch (error) {
      produtoSelect.innerHTML = '<option value="">Erro ao carregar produtos</option>'
    }
  }

  function atualizarQuestionario() {
    const origem = origemErro.value

    questionarioTransportadora.classList.add('hidden')
    questionarioFabrica.classList.add('hidden')

    if (origem === 'Transportadora') {
      questionarioTransportadora.classList.remove('hidden')
    }

    if (origem === 'Fábrica') {
      questionarioFabrica.classList.remove('hidden')
      faltouItem.value = faltouItemFabrica.value || ''
      sobrouItem.value = sobrouItemFabrica.value || ''
    }
  }

  function atualizarAlertaTransportadora() {
    const fabricaOk = volumeFabrica.value === 'true'
    const transmacOk = volumeTransmac.value === 'true'
    alertaTransportadora.classList.toggle('hidden', !(fabricaOk && transmacOk))
  }

  temNfd.addEventListener('change', () => {
    const mostrar = temNfd.value === 'true'
    boxNumeroNfd.classList.toggle('hidden', !mostrar)
    numeroNfd.required = mostrar
    if (!mostrar) numeroNfd.value = ''
  })

  origemErro.addEventListener('change', atualizarQuestionario)

  faltouVolume.addEventListener('change', () => {
    const mostrar = faltouVolume.value === 'true'
    boxQtdVolumes.classList.toggle('hidden', !mostrar)
  })

  volumeFabrica.addEventListener('change', atualizarAlertaTransportadora)
  volumeTransmac.addEventListener('change', atualizarAlertaTransportadora)

  faturadoPor.addEventListener('change', () => {
    itens = []
    renderizarItens()
    carregarProdutos(faturadoPor.value)
  })

  btnAdicionarItem.addEventListener('click', () => {
    const selected = produtoSelect.options[produtoSelect.selectedIndex]
    const produtoId = produtoSelect.value
    const quantidade = quantidadeItem.value

    if (!faturadoPor.value) {
      alert('Selecione primeiro o campo "Faturado por".')
      return
    }

    if (!produtoId) {
      alert('Selecione um produto.')
      return
    }

    if (!quantidade || Number(quantidade) <= 0) {
      alert('Informe uma quantidade válida.')
      return
    }

    itens.push({
      produto_id: Number(produtoId),
      codigo_produto: selected.dataset.codigo,
      nome_produto: selected.dataset.nome,
      empresa: selected.dataset.empresa,
      quantidade: Number(quantidade),
      tipo_bloco: 'principal'
    })

    produtoSelect.value = ''
    quantidadeItem.value = ''
    renderizarItens()
  })

  tabelaItensBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remover-item')) {
      const index = Number(e.target.dataset.index)
      itens.splice(index, 1)
      renderizarItens()
    }
  })

  cnpjInput.addEventListener('input', () => {
    cnpjInput.value = aplicarMascaraCnpj(cnpjInput.value)
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    if (temNfd.value === 'true' && !numeroNfd.value.trim()) {
      alert('Informe o número da NFD.')
      return
    }

    if (origemErro.value === 'Fábrica') {
      faltouItem.value = faltouItemFabrica.value || ''
      sobrouItem.value = sobrouItemFabrica.value || ''
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

  renderizarItens()
})
