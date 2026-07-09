/* ==========================================================================
   BS AÇAITERIA — Sistema de Gestão
   Módulos: DB (localStorage) · Entrada · Criação · PDV · Estoque · Financeiro
   ========================================================================== */

/* ==================== MÓDULO: BANCO DE DADOS (localStorage) ==================== */
const DB = (() => {
  const KEYS = {
    estoque: 'bs_estoque',
    produtos: 'bs_produtos',
    vendas: 'bs_vendas'
  };

  function _get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch (e) { return []; }
  }
  function _set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  return {
    // ----- Estoque (matérias-primas / condimentos / unidades) -----
    getEstoque: () => _get(KEYS.estoque),
    saveEstoque: (list) => _set(KEYS.estoque, list),
    addEstoqueItem(item) {
      const list = this.getEstoque();
      item.id = 'E' + Date.now();
      item.criadoEm = new Date().toISOString();
      list.push(item);
      this.saveEstoque(list);
      return item;
    },
    updateEstoqueItem(id, patch) {
      const list = this.getEstoque();
      const idx = list.findIndex(i => i.id === id);
      if (idx > -1) { list[idx] = { ...list[idx], ...patch }; this.saveEstoque(list); }
    },
    deleteEstoqueItem(id) {
      this.saveEstoque(this.getEstoque().filter(i => i.id !== id));
    },
    adjustEstoqueQtd(id, delta) {
      const list = this.getEstoque();
      const idx = list.findIndex(i => i.id === id);
      if (idx > -1) {
        list[idx].quantidade = Math.max(0, (parseFloat(list[idx].quantidade) || 0) + delta);
        this.saveEstoque(list);
      }
    },

    // ----- Produtos (criados / vendidos no PDV) -----
    getProdutos: () => _get(KEYS.produtos),
    saveProdutos: (list) => _set(KEYS.produtos, list),
    addProduto(p) {
      const list = this.getProdutos();
      p.id = 'P' + Date.now();
      p.criadoEm = new Date().toISOString();
      list.push(p);
      this.saveProdutos(list);
      return p;
    },
    updateProduto(id, patch) {
      const list = this.getProdutos();
      const idx = list.findIndex(i => i.id === id);
      if (idx > -1) { list[idx] = { ...list[idx], ...patch }; this.saveProdutos(list); }
    },
    deleteProduto(id) {
      this.saveProdutos(this.getProdutos().filter(i => i.id !== id));
    },

    // ----- Vendas -----
    getVendas: () => _get(KEYS.vendas),
    saveVendas: (list) => _set(KEYS.vendas, list),
    addVenda(v) {
      const list = this.getVendas();
      v.id = 'V' + Date.now();
      v.dataHora = new Date().toISOString();
      list.push(v);
      this.saveVendas(list);
      return v;
    }
  };
})();

/* ==================== UTILITÁRIOS ==================== */
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2200);
}
function brl(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function uid(prefix) { return prefix + Math.random().toString(36).slice(2, 7); }

/* ==================== NAVEGAÇÃO ==================== */
function initNav() {
  const btns = document.querySelectorAll('.tab-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById('screen-' + btn.dataset.tab).classList.add('active');
      refreshCurrentScreen(btn.dataset.tab);
    });
  });
}
function refreshCurrentScreen(tab) {
  if (tab === 'entrada') { Entrada.render(); Criacao.render(); }
  if (tab === 'venda') PDV.render();
  if (tab === 'estoque') Estoque.render();
  if (tab === 'financeiro') Financeiro.render();
}

/* ==================== MÓDULO 1: ENTRADA DE PRODUTOS ==================== */
const Entrada = (() => {
  function clearForm() {
    ['ent-nome','ent-marca','ent-valor','ent-qtd','ent-tipo','ent-fornecedor'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('ent-unidade').value = 'L';
  }

  function add() {
    const nome = document.getElementById('ent-nome').value.trim();
    const marca = document.getElementById('ent-marca').value.trim();
    const valor = parseFloat(document.getElementById('ent-valor').value) || 0;
    const unidade = document.getElementById('ent-unidade').value;
    const qtd = parseFloat(document.getElementById('ent-qtd').value) || 0;
    const tipo = document.getElementById('ent-tipo').value.trim() || 'Matéria-prima';
    const fornecedor = document.getElementById('ent-fornecedor').value.trim();

    if (!nome || qtd <= 0) { toast('Preencha nome e quantidade.'); return; }

    DB.addEstoqueItem({
      nome, marca, valor, unidade, quantidade: qtd, tipo, fornecedor,
      estoqueMax: qtd * 2, estoqueIdeal: qtd
    });
    clearForm();
    render();
    Criacao.refreshIngredientOptions();
    toast('Produto adicionado ao estoque ✅');
  }

  function render(filter = '') {
    const list = DB.getEstoque()
      .filter(i => !filter || i.nome.toLowerCase().includes(filter.toLowerCase()))
      .sort((a,b) => new Date(b.criadoEm) - new Date(a.criadoEm));
    const container = document.getElementById('ent-list');
    container.innerHTML = '';
    if (!list.length) { container.innerHTML = '<div class="empty-note">Nenhum item cadastrado ainda.</div>'; return; }
    list.forEach(item => {
      const d = new Date(item.criadoEm);
      const row = document.createElement('div');
      row.className = 'list-item';
      row.innerHTML = `
        <div>
          <div class="li-main">${item.nome} ${item.marca ? '· ' + item.marca : ''}</div>
          <div class="li-sub">${brl(item.valor)} · ${item.quantidade}${item.unidade} · ${item.fornecedor || 'sem fornecedor'}</div>
          <div class="li-sub">${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        <div class="li-actions">
          <button class="li-icon-btn" data-edit="${item.id}">✏️</button>
          <button class="li-icon-btn danger" data-del="${item.id}">🗑️</button>
        </div>`;
      container.appendChild(row);
    });
    container.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      DB.deleteEstoqueItem(b.dataset.del); render(document.getElementById('ent-search').value);
    }));
    container.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editItem(b.dataset.edit)));
  }

  function editItem(id) {
    const item = DB.getEstoque().find(i => i.id === id);
    if (!item) return;
    const novoValor = prompt('Novo valor de compra (R$):', item.valor);
    const novaQtd = prompt('Nova quantidade (' + item.unidade + '):', item.quantidade);
    if (novoValor !== null) item.valor = parseFloat(novoValor) || item.valor;
    if (novaQtd !== null) item.quantidade = parseFloat(novaQtd) || item.quantidade;
    DB.updateEstoqueItem(id, item);
    render(document.getElementById('ent-search').value);
    toast('Item atualizado.');
  }

  function init() {
    document.getElementById('ent-add').addEventListener('click', add);
    document.getElementById('ent-search').addEventListener('input', e => render(e.target.value));
  }

  return { init, render };
})();

/* ==================== MÓDULO 2: CRIAÇÃO DE PRODUTOS ==================== */
const Criacao = (() => {
  let recipe = []; // [{estoqueId, nome, qtd, unidade, custoUnit}]

  function refreshIngredientOptions() {
    const sel = document.getElementById('cri-ingrediente');
    const estoque = DB.getEstoque();
    sel.innerHTML = estoque.map(i => `<option value="${i.id}">${i.nome} (${i.unidade})</option>`).join('')
      || '<option value="">Cadastre itens no estoque primeiro</option>';
  }

  function addIngredient() {
    const sel = document.getElementById('cri-ingrediente');
    const qtdInput = document.getElementById('cri-ing-qtd');
    const estoqueId = sel.value;
    const qtd = parseFloat(qtdInput.value);
    if (!estoqueId || !qtd || qtd <= 0) { toast('Escolha um ingrediente e a quantidade.'); return; }
    const item = DB.getEstoque().find(i => i.id === estoqueId);
    if (!item) return;
    const custoUnit = (item.quantidade > 0) ? (item.valor / item.quantidade) : 0;
    recipe.push({ estoqueId, nome: item.nome, qtd, unidade: item.unidade, custoUnit });
    qtdInput.value = '';
    renderRecipe();
  }

  function renderRecipe() {
    const container = document.getElementById('cri-recipe-list');
    container.innerHTML = recipe.map((r, idx) => `
      <div class="recipe-row">
        <span>${r.qtd}${r.unidade} de ${r.nome}</span>
        <button data-idx="${idx}">✕</button>
      </div>`).join('') || '<div class="empty-note">Adicione ingredientes à receita.</div>';
    container.querySelectorAll('button[data-idx]').forEach(b => b.addEventListener('click', () => {
      recipe.splice(parseInt(b.dataset.idx), 1);
      renderRecipe(); updateCostSummary();
    }));
    updateCostSummary();
  }

  function updateCostSummary() {
    const custo = recipe.reduce((sum, r) => sum + (r.qtd * r.custoUnit), 0);
    const preco = parseFloat(document.getElementById('cri-preco').value) || 0;
    const lucro = preco - custo;
    const margem = preco > 0 ? (lucro / preco) * 100 : 0;
    document.getElementById('cri-custo').textContent = brl(custo);
    document.getElementById('cri-lucro').textContent = brl(lucro);
    document.getElementById('cri-margem').textContent = margem.toFixed(1) + '%';
  }

  function clearForm() {
    document.getElementById('cri-nome').value = '';
    document.getElementById('cri-preco').value = '';
    document.getElementById('cri-tamanho').value = '300ml';
    recipe = [];
    renderRecipe();
  }

  function finalize() {
    const nome = document.getElementById('cri-nome').value.trim();
    const preco = parseFloat(document.getElementById('cri-preco').value) || 0;
    const tamanho = document.getElementById('cri-tamanho').value;
    if (!nome || preco <= 0) { toast('Informe nome e preço de venda.'); return; }
    if (!recipe.length) { toast('Adicione ao menos um ingrediente.'); return; }
    const custo = recipe.reduce((sum, r) => sum + (r.qtd * r.custoUnit), 0);
    const lucro = preco - custo;
    const margem = preco > 0 ? (lucro / preco) * 100 : 0;
    DB.addProduto({
      nome, preco, tamanho, receita: recipe, custo, lucro, margem, categoria: 'produto'
    });
    clearForm();
    toast('Produto criado e disponível no PDV ✅');
    PDV.render();
  }

  function init() {
    document.getElementById('cri-ing-add').addEventListener('click', addIngredient);
    document.getElementById('cri-preco').addEventListener('input', updateCostSummary);
    document.getElementById('cri-del').addEventListener('click', clearForm);
    document.getElementById('cri-add').addEventListener('click', finalize);
    refreshIngredientOptions();
    renderRecipe();
  }

  function render() { refreshIngredientOptions(); }

  return { init, render, refreshIngredientOptions };
})();

/* ==================== MÓDULO 3: PDV (VENDA) ==================== */
const PDV = (() => {
  let cart = []; // [{id, tipo:'produto'|'extra', nome, preco, qtd, obs, custo}]
  let currentCat = 'produtos';
  let payment = 'Dinheiro';

  const EXTRAS_KEY = 'bs_extras';
  function getExtras() {
    let extras = JSON.parse(localStorage.getItem(EXTRAS_KEY) || 'null');
    if (!extras) {
      extras = [
        { id: 'X1', nome: 'Coca-Cola', preco: 6 },
        { id: 'X2', nome: 'Água', preco: 3 },
        { id: 'X3', nome: 'Bombom', preco: 4 },
        { id: 'X4', nome: 'Salgadinho', preco: 7 },
        { id: 'X5', nome: 'Nutella (adicional)', preco: 5 },
        { id: 'X6', nome: 'Granola (adicional)', preco: 2 },
        { id: 'X7', nome: 'Morango (adicional)', preco: 3 },
        { id: 'X8', nome: 'Leite condensado (adicional)', preco: 2 }
      ];
      localStorage.setItem(EXTRAS_KEY, JSON.stringify(extras));
    }
    return extras;
  }

  function renderProductGrid() {
    const grid = document.getElementById('pdv-product-grid');
    grid.innerHTML = '';
    const items = currentCat === 'produtos' ? DB.getProdutos() : getExtras();
    if (!items.length) { grid.innerHTML = '<div class="empty-note">Nenhum item cadastrado.</div>'; return; }
    items.forEach(p => {
      const inCart = cart.find(c => c.refId === p.id);
      const btn = document.createElement('button');
      btn.className = 'pdv-prod-btn';
      btn.innerHTML = `<span>${p.nome}</span><span>${brl(p.preco)}</span>${inCart ? `<span class="qty-badge">x${inCart.qtd}</span>` : ''}`;
      btn.addEventListener('click', () => addToCart(p, currentCat === 'produtos' ? 'produto' : 'extra'));
      grid.appendChild(btn);
    });
  }

  function addToCart(p, tipo) {
    const existing = cart.find(c => c.refId === p.id);
    if (existing) existing.qtd += 1;
    else cart.push({ refId: p.id, tipo, nome: p.nome, preco: p.preco, qtd: 1, obs: '', custo: p.custo || 0 });
    renderProductGrid();
    renderBag();
    renderComanda();
  }

  function renderBag() {
    const container = document.getElementById('pdv-bag-list');
    container.innerHTML = '';
    if (!cart.length) { container.innerHTML = '<div class="empty-note">Sacola vazia. Toque em um produto.</div>'; return; }
    cart.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'list-item';
      row.innerHTML = `
        <div>
          <div class="li-main">${item.nome}</div>
          <div class="li-sub">${item.obs || 'sem observações'}</div>
        </div>
        <div class="li-actions">
          <button class="li-icon-btn" data-minus="${idx}">−</button>
          <span class="li-main">${item.qtd}</span>
          <button class="li-icon-btn" data-plus="${idx}">+</button>
        </div>`;
      container.appendChild(row);
    });
    container.querySelectorAll('[data-plus]').forEach(b => b.addEventListener('click', () => {
      cart[b.dataset.plus].qtd++; renderAll();
    }));
    container.querySelectorAll('[data-minus]').forEach(b => b.addEventListener('click', () => {
      const i = b.dataset.minus;
      cart[i].qtd--;
      if (cart[i].qtd <= 0) cart.splice(i, 1);
      renderAll();
    }));
  }

  function renderComanda() {
    const container = document.getElementById('pdv-comanda-list');
    container.innerHTML = '';
    if (!cart.length) { container.innerHTML = '<div class="empty-note">Nenhum item na comanda.</div>'; }
    let total = 0;
    cart.forEach(item => {
      total += item.preco * item.qtd;
      const row = document.createElement('div');
      row.className = 'list-item';
      row.innerHTML = `<span>${item.qtd}x ${item.nome}</span><span>${brl(item.preco * item.qtd)}</span>`;
      container.appendChild(row);
    });
    document.getElementById('pdv-total').textContent = brl(total);
  }

  function renderAll() { renderProductGrid(); renderBag(); renderComanda(); }

  function finalize() {
    if (!cart.length) { toast('Adicione itens antes de finalizar.'); return; }
    const total = cart.reduce((s, i) => s + i.preco * i.qtd, 0);
    const custoTotal = cart.reduce((s, i) => s + (i.custo || 0) * i.qtd, 0);
    DB.addVenda({
      itens: cart, total, custoTotal, lucro: total - custoTotal, formaPagamento: payment
    });

    // baixa automática no estoque das receitas
    cart.forEach(item => {
      if (item.tipo === 'produto') {
        const produto = DB.getProdutos().find(p => p.id === item.refId);
        if (produto && produto.receita) {
          produto.receita.forEach(r => DB.adjustEstoqueQtd(r.estoqueId, -(r.qtd * item.qtd)));
        }
      }
    });

    cart = [];
    renderAll();
    toast('Venda finalizada ✅ Estoque e financeiro atualizados.');
  }

  function init() {
    document.getElementById('pdv-cat-toggle').addEventListener('click', e => {
      const btn = e.target.closest('.chip'); if (!btn) return;
      document.querySelectorAll('#pdv-cat-toggle .chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      currentCat = btn.dataset.cat;
      renderProductGrid();
    });
    document.getElementById('pdv-payment').addEventListener('click', e => {
      const btn = e.target.closest('.pay-chip'); if (!btn) return;
      document.querySelectorAll('.pay-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      payment = btn.dataset.pay;
    });
    document.getElementById('pdv-del').addEventListener('click', () => { cart.pop(); renderAll(); });
    document.getElementById('pdv-add-item').addEventListener('click', () => toast('Toque em um produto acima para adicionar.'));
    document.getElementById('pdv-finalizar').addEventListener('click', finalize);
  }

  function render() { renderAll(); }

  return { init, render };
})();

/* ==================== MÓDULO 4: ESTOQUE ==================== */
const Estoque = (() => {
  let currentCat = 'Condimento';
  let selectedMonthIdx = 0;

  function statusClass(item) {
    const ideal = item.estoqueIdeal || 1;
    const ratio = item.quantidade / ideal;
    if (ratio >= 0.7) return 'stock-green';
    if (ratio >= 0.3) return 'stock-yellow';
    return 'stock-red';
  }

  function renderList() {
    const container = document.getElementById('estoque-list');
    const list = DB.getEstoque().filter(i => (i.tipo || '').toLowerCase().includes(currentCat.toLowerCase()) ||
      (currentCat === 'Condimento' && !['matéria-prima','unidade'].includes((i.tipo||'').toLowerCase())));
    container.innerHTML = '';
    if (!list.length) { container.innerHTML = '<div class="empty-note">Nenhum item nesta categoria.</div>'; return; }
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'list-item ' + statusClass(item);
      row.innerHTML = `
        <div>
          <div class="li-main">${item.nome}</div>
          <div class="li-sub">Atual: ${item.quantidade}${item.unidade} · Ideal: ${item.estoqueIdeal}${item.unidade} · Máx: ${item.estoqueMax}${item.unidade}</div>
        </div>
        <div class="li-actions">
          <button class="li-icon-btn" data-edit="${item.id}">✏️</button>
        </div>`;
      container.appendChild(row);
    });
    container.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editStock(b.dataset.edit)));
  }

  function editStock(id) {
    const item = DB.getEstoque().find(i => i.id === id);
    if (!item) return;
    const atual = prompt('Estoque atual:', item.quantidade);
    const ideal = prompt('Estoque ideal:', item.estoqueIdeal);
    const max = prompt('Estoque máximo:', item.estoqueMax);
    if (atual !== null) item.quantidade = parseFloat(atual) || item.quantidade;
    if (ideal !== null) item.estoqueIdeal = parseFloat(ideal) || item.estoqueIdeal;
    if (max !== null) item.estoqueMax = parseFloat(max) || item.estoqueMax;
    DB.updateEstoqueItem(id, item);
    renderAll();
    toast('Estoque atualizado.');
  }

  function renderChart() {
    const canvas = document.getElementById('estoque-chart');
    const items = DB.getEstoque().slice(0, 6);
    const labels = items.map(i => i.nome.slice(0, 6));
    const ideal = items.map(i => i.estoqueIdeal || 0);
    const atual = items.map(i => i.quantidade || 0);
    drawBarChart(canvas, labels, [
      { data: ideal, color: '#5b8ef2' },
      { data: atual, color: '#b98cf2' }
    ]);
  }

  function renderMonths() {
    const container = document.getElementById('estoque-months');
    const meses = getLastMonths();
    container.innerHTML = meses.map((m, idx) =>
      `<button class="month-chip ${idx === selectedMonthIdx ? 'active' : ''}" data-idx="${idx}">${m.label}</button>`
    ).join('');
    container.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      selectedMonthIdx = parseInt(b.dataset.idx);
      renderMonths();
    }));
  }

  function renderCompras() {
    const container = document.getElementById('estoque-compras');
    const list = DB.getEstoque().filter(i => i.quantidade < i.estoqueIdeal);
    container.innerHTML = '';
    if (!list.length) { container.innerHTML = '<div class="empty-note">Estoque em dia — nada a comprar.</div>'; return; }
    list.forEach(item => {
      const necessario = (item.estoqueIdeal - item.quantidade).toFixed(2);
      const row = document.createElement('div');
      row.className = 'list-item ' + statusClass(item);
      row.innerHTML = `<span>${item.nome}</span><span>Atual ${item.quantidade}${item.unidade} · Ideal ${item.estoqueIdeal}${item.unidade} · Comprar ${necessario}${item.unidade}</span>`;
      container.appendChild(row);
    });
  }

  function renderAll() { renderList(); renderChart(); renderMonths(); renderCompras(); }

  function init() {
    document.getElementById('estoque-cat-toggle').addEventListener('click', e => {
      const btn = e.target.closest('.chip'); if (!btn) return;
      document.querySelectorAll('#estoque-cat-toggle .chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      currentCat = btn.dataset.cat;
      renderList();
    });
  }

  return { init, render: renderAll };
})();

/* ==================== MÓDULO 5: FINANCEIRO ==================== */
const Financeiro = (() => {
  let period = 'dia';
  let selectedSize = '300ml';
  let selectedMonthIdx = 0;

  function vendasNoPeriodo() {
    const vendas = DB.getVendas();
    const now = new Date();
    return vendas.filter(v => {
      const d = new Date(v.dataHora);
      if (period === 'dia') return d.toDateString() === now.toDateString();
      if (period === 'semana') { const diff = (now - d) / 86400000; return diff <= 7; }
      if (period === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  }

  function renderKpis() {
    const vendas = vendasNoPeriodo();
    const bruta = vendas.reduce((s, v) => s + v.total, 0);
    const liquido = vendas.reduce((s, v) => s + v.lucro, 0);
    document.getElementById('fin-bruta').textContent = brl(bruta);
    document.getElementById('fin-liquido').textContent = brl(liquido);
  }

  function renderChart() {
    const canvas = document.getElementById('fin-chart');
    const vendas = DB.getVendas();
    const meses = getLastMonths(3);
    const labels = meses.map(m => m.label);
    const bruta = meses.map(m => vendas.filter(v => sameMonth(v.dataHora, m.date)).reduce((s, v) => s + v.total, 0));
    const liquido = meses.map(m => vendas.filter(v => sameMonth(v.dataHora, m.date)).reduce((s, v) => s + v.lucro, 0));
    drawBarChart(canvas, labels, [
      { data: bruta, color: '#5b8ef2' },
      { data: liquido, color: '#b98cf2' }
    ]);
  }

  function renderSizeSummary() {
    const vendas = DB.getVendas();
    const container = document.getElementById('fin-size-summary');
    let qtd = 0, fat = 0, lucro = 0;
    vendas.forEach(v => v.itens.forEach(item => {
      const produto = DB.getProdutos().find(p => p.id === item.refId);
      if (produto && produto.tamanho === selectedSize) {
        qtd += item.qtd; fat += item.preco * item.qtd; lucro += (item.preco - (item.custo||0)) * item.qtd;
      }
    }));
    container.innerHTML = `
      <div class="size-row"><span>Quantidade vendida</span><b>${qtd}</b></div>
      <div class="size-row"><span>Faturamento</span><b>${brl(fat)}</b></div>
      <div class="size-row"><span>Lucro</span><b>${brl(lucro)}</b></div>`;
  }

  function renderMonths() {
    const container = document.getElementById('fin-months');
    const meses = getLastMonths();
    container.innerHTML = meses.map((m, idx) =>
      `<button class="month-chip ${idx === selectedMonthIdx ? 'active' : ''}" data-idx="${idx}">${m.label}</button>`
    ).join('');
    container.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      selectedMonthIdx = parseInt(b.dataset.idx);
      renderMonths();
    }));
  }

  function renderTop() {
    const vendas = DB.getVendas();
    const totals = {};
    let grandTotal = 0;
    vendas.forEach(v => v.itens.forEach(item => {
      if (!totals[item.nome]) totals[item.nome] = { nome: item.nome, qtd: 0, fat: 0, lucro: 0 };
      totals[item.nome].qtd += item.qtd;
      totals[item.nome].fat += item.preco * item.qtd;
      totals[item.nome].lucro += (item.preco - (item.custo||0)) * item.qtd;
      grandTotal += item.preco * item.qtd;
    }));
    const ranked = Object.values(totals).sort((a, b) => b.fat - a.fat).slice(0, 8);
    const container = document.getElementById('fin-top');
    container.innerHTML = '';
    if (!ranked.length) { container.innerHTML = '<div class="empty-note">Nenhuma venda registrada ainda.</div>'; return; }
    ranked.forEach((r, idx) => {
      const pct = grandTotal > 0 ? ((r.fat / grandTotal) * 100).toFixed(1) : 0;
      const row = document.createElement('div');
      row.className = 'list-item';
      row.innerHTML = `<span>#${idx+1} ${r.nome} (${r.qtd}x)</span><span>${brl(r.fat)} · ${pct}%</span>`;
      container.appendChild(row);
    });
  }

  function renderAll() { renderKpis(); renderChart(); renderSizeSummary(); renderMonths(); renderTop(); }

  function init() {
    document.getElementById('fin-period').addEventListener('click', e => {
      const btn = e.target.closest('.chip'); if (!btn) return;
      document.querySelectorAll('#fin-period .chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      period = btn.dataset.period;
      renderKpis();
    });
    document.getElementById('fin-size-toggle').addEventListener('click', e => {
      const btn = e.target.closest('.chip'); if (!btn) return;
      document.querySelectorAll('#fin-size-toggle .chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      selectedSize = btn.dataset.size;
      renderSizeSummary();
    });
  }

  return { init, render: renderAll };
})();

/* ==================== HELPERS: MESES & GRÁFICO CANVAS ==================== */
function getLastMonths(n = 4) {
  const meses = [];
  const now = new Date();
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    meses.unshift({ label: nomes[d.getMonth()], date: d });
  }
  return meses.reverse().slice(0, n).reverse();
}
function sameMonth(iso, date) {
  const d = new Date(iso);
  return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
}

function drawBarChart(canvas, labels, series) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.parentElement.clientWidth - 36;
  const cssHeight = 180;
  canvas.width = cssWidth * dpr; canvas.height = cssHeight * dpr;
  canvas.style.width = cssWidth + 'px'; canvas.style.height = cssHeight + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const allVals = series.flatMap(s => s.data);
  const max = Math.max(1, ...allVals) * 1.15;
  const padding = { top: 10, bottom: 24, left: 6, right: 6 };
  const chartH = cssHeight - padding.top - padding.bottom;
  const groupW = (cssWidth - padding.left - padding.right) / Math.max(1, labels.length);
  const barW = Math.min(18, groupW / (series.length + 1.5));

  // gridlines
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.font = '10px sans-serif';
  for (let g = 0; g <= 3; g++) {
    const y = padding.top + chartH - (g / 3) * chartH;
    ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(cssWidth - padding.right, y); ctx.stroke();
  }

  labels.forEach((label, i) => {
    const groupX = padding.left + i * groupW + groupW / 2;
    series.forEach((s, si) => {
      const val = s.data[i] || 0;
      const h = (val / max) * chartH;
      const x = groupX + (si - series.length / 2) * (barW + 4);
      const y = padding.top + chartH - h;
      ctx.fillStyle = s.color;
      roundRect(ctx, x, y, barW, h, 4);
    });
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.textAlign = 'center';
    ctx.fillText(label, groupX, cssHeight - 6);
  });
}
function roundRect(ctx, x, y, w, h, r) {
  if (h <= 0) return;
  r = Math.min(r, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();
}

/* ==================== INICIALIZAÇÃO ==================== */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  Entrada.init();
  Criacao.init();
  PDV.init();
  Estoque.init();
  Financeiro.init();

  Entrada.render();
  Criacao.render();
  PDV.render();
  Estoque.render();
  Financeiro.render();

  window.addEventListener('resize', () => {
    Estoque.render();
    Financeiro.render();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
});
