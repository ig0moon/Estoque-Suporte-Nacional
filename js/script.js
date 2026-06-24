// ==========================================
// CONFIGURAÇÃO DO SUPABASE (COLE AQUI)
// ==========================================
const supabaseUrl = 'https://etijsbxyidgjqjxmhxmr.supabase.co'; 
const supabaseKey = 'sb_publishable_B0FafSksKHq1yukFmp-Iuw_wfd8H8YP';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- Estado --- //
let items = [];
let editId = null;
let fileHandle = null;

// ==========================================
// AUTENTICAÇÃO E LOGIN
// ==========================================
async function verificarSessao() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        iniciarApp();
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
    }
}

async function fazerLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-senha').value;

    if(!email || !password) return toast('Preencha email e senha');
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        toast('Erro: Credenciais inválidas');
    } else {
        iniciarApp();
    }
}

async function fazerLogout() {
    await supabaseClient.auth.signOut();
    location.reload();
}

function iniciarApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-content').style.display = 'block';
    carregarEstoque();
}

// ==========================================
// BANCO DE DADOS (CRUD)
// ==========================================
async function carregarEstoque() {
    toast('Carregando...');
    const { data, error } = await supabaseClient.from('estoque').select('*').order('nome');

    if (error) {
        console.error(error);
        toast('Erro ao carregar o estoque');
        return;
    }

    items = data || [];
    atualizarCategorias();
    render();
}

async function saveItem() {
    const nome = document.getElementById('f-nome').value.trim();
    if (!nome) {
        document.getElementById('f-nome').classList.add('error');
        document.getElementById('f-nome').focus();
        return;
    }

    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    const itemData = {
    nome,
    cat: document.getElementById('f-cat').value.trim() || 'Geral',
    qty: parseInt(document.getElementById('f-qty').value) || 0,
    min: parseInt(document.getElementById('f-min').value) || 0,
    price: parseFloat(document.getElementById('f-price').value) || 0,
    loc: document.getElementById('f-loc').value.trim() || '-',
    };

    if (editId) {
        // UPDATE
        const { error } = await supabaseClient.from('estoque').update(itemData).eq('id', editId);
        if (error) toast('Erro ao atualizar');
        else toast('Item atualizado');
    } else {
        // INSERT
        const { error } = await supabaseClient.from('estoque').insert([itemData]);
        if (error) toast('Erro ao adicionar');
        else toast('Item adicionado');
    }

    btn.disabled = false;
    btn.textContent = 'Salvar item';
    
    closeModal();
    carregarEstoque(); 
}

async function removeItem(id) {
    const item = items.find(i => i.id === id);
    if (!confirm(`Remover "${item?.nome}" do banco de dados?`)) return;
    
    const { error } = await supabaseClient.from('estoque').delete().eq('id', id);
    
    if (error) {
        toast('Erro ao remover');
    } else {
        toast('Item removido');
        carregarEstoque(); 
    }
}

// ==========================================
// HELPERS E RENDERIZAÇÃO
// ==========================================
function status(qty, min) {
    if (qty === 0) return 'out';
    if (qty <= min) return 'low';
    return 'ok';
}

function statusLabel(s) {
    return s === 'out' ? 'Sem estoque' : s === 'low' ? 'Estoque baixo' : 'OK';
}

function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
}

function atualizarCategorias() {
    const select = document.getElementById('filter-cat');
    const categoriaAtual = select.value;
    const categorias = [...new Set(items.map(i => i.cat).filter(Boolean))].sort();
    
    select.innerHTML = '<option value="">Todas Categorias</option>' + 
        categorias.map(cat => `<option value="${cat}">${cat}</option>`).join('');

    select.value = categoriaAtual;
}

function render() {
    const q = document.getElementById('search').value.toLowerCase();
    const statusFiltro = document.getElementById('filter-status').value;
    const categoriaFiltro = document.getElementById('filter-cat').value;

    const list = items.filter(i => {
        const busca = i.nome.toLowerCase().includes(q) || 
        i.cat.toLowerCase().includes(q) || (i.loc || '').toLowerCase().includes(q);

        const statusOk = !statusFiltro || status(i.qty, i.min) === statusFiltro;
        const categoriaOk = !categoriaFiltro || i.cat === categoriaFiltro;
        return busca && statusOk && categoriaOk;
    }
);

// Stats
const totalValor = items.reduce((a,i) => a + i.qty * i.price, 0);
const low = items.filter(i => status(i.qty,i.min) === 'low').length;
const out = items.filter(i => status(i.qty,i.min) === 'out').length;

document.getElementById('stats').innerHTML = `
    <div class="stat"><div class="label">Total de itens</div><div class="value">${items.length}</div></div>
    <div class="stat"><div class="label">Estoque baixo</div><div class="value warn">${low}</div></div>
    <div class="stat"><div class="label">Sem estoque</div><div class="value danger">${out}</div></div>
    <div class="stat"><div class="label">Valor total</div><div class="value">R$&nbsp;${totalValor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
`;

// Table
const tbody = document.getElementById('tbody');
const empty = document.getElementById('empty');

if (!list.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    } else {
        empty.classList.add('hidden');
        tbody.innerHTML = list.map(i => {
            const s = status(i.qty, i.min);
            return `<tr>
                <td class="name">${esc(i.nome)}</td>
                <td>${esc(i.cat)}</td>
                <td>${i.qty}</td>
                <td>${i.min}</td>
                <td>R$ ${i.price.toFixed(2)}</td>
                <td>${esc(i.loc)}</td>
                <td><span class="badge ${s}">${statusLabel(s)}</span></td>
                <td>

                    <div class="actions">
                        <button class="btn sm icon-btn" onclick="openModal(${i.id})" title="Editar">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                            stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>

                        <button class="btn sm icon-btn danger" onclick="removeItem(${i.id})" title="Remover">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                            stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1-1v2"/></svg>
                        </button>
                    </div>

                </td>
            </tr>`;
        }).join('');
    }
}

// ==========================================
// MODAL CONTROLS
// ==========================================
function openModal(id) {
    editId = id || null;
    document.getElementById('modal-title').textContent = id ? 'Editar item' : 'Novo item';
    const item = id ? items.find(i => i.id === id) : null;
    
    document.getElementById('f-nome').value = item?.nome || '';
    document.getElementById('f-cat').value = item?.cat || '';
    document.getElementById('f-qty').value = item != null ? item.qty : '';
    document.getElementById('f-min').value = item != null ? item.min : '';
    document.getElementById('f-price').value = item != null ? item.price : '';
    document.getElementById('f-loc').value = item?.loc || '';
    
    document.getElementById('f-nome').classList.remove('error');
    document.getElementById('overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('f-nome').focus(), 50);
}

function closeModal() {
    document.getElementById('overlay').classList.add('hidden');
    editId = null;
}

// ==========================================
// EXPORTAR & IMPORTAR XLSX
// ==========================================
async function exportXLSX() {
    try {
        const rows = items.map(i => ({
            Nome: i.nome,
            Categoria: i.cat,
            Quantidade: i.qty,
            Mínimo: i.min,
            Preço: i.price,
            Localização: i.loc
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estoque');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    if (!fileHandle) {
        fileHandle = await window.showSaveFilePicker({
            suggestedName: 'estoque.xlsx',
            types: [{
                description: 'Planilha Excel',
                accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
            }]
        });
    }

    const writable = await fileHandle.createWritable();
    await writable.write(excelBuffer);
    await writable.close();
        toast('Arquivo exportado com sucesso!');
    } catch (err) {
    console.error(err);
        toast('Exportação cancelada ou falhou.');
    }
}

function importXLSX() { 
    document.getElementById('file-input').click(); 
}

function handleFile(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = async e => {
        try {
            const wb = XLSX.read(e.target.result, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);
            if (!data.length) {
                alert('Planilha vazia ou formato inválido.');
                return;
            }

            if (!confirm('ATENÇÃO: O banco de dados atual será APAGADO e substituído pelos itens da planilha. Continuar?')) return;
                toast('Processando...');

            const novos = data.map(r => ({
                nome: r['Nome'] || r['nome'] || 'Item sem nome',
                cat: r['Categoria'] || r['categoria'] || 'Geral',
                qty: parseInt(r['Quantidade'] || r['quantidade'] || 0),
                min: parseInt(r['Mínimo'] || r['minimo'] || 0),
                price: parseFloat(r['Preço'] || r['preco'] || 0),
                loc: r['Localização'] || r['localizacao'] || '-'
            }));

            const { error: delErr } = await supabaseClient.from('estoque').delete().not('id', 'is', null);
            if (delErr) throw delErr;
            const { error: insErr } = await supabaseClient.from('estoque').insert(novos);

            if (insErr) throw insErr;
                toast(`Sucesso! ${novos.length} itens importados.`);
                carregarEstoque();
        } catch (err) {
            console.error(err);
            alert('Erro ao processar o arquivo. Verifique o console.');
        }
    };

    reader.readAsBinaryString(file);
    input.value = '';
}

// ==========================================
// INICIALIZAÇÃO GERAL
// ==========================================
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

const dataHeader = new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
document.getElementById('header-date').textContent = dataHeader.charAt(0).toUpperCase() + dataHeader.slice(1);

verificarSessao();