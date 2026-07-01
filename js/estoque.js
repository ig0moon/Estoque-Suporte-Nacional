// ==========================================
// CONFIGURAÇÃO DO SUPABASE (estoque.js)
// ==========================================
const supabaseUrl = 'https://etijsbxyidgjqjxmhxmr.supabase.co'; 
const supabaseKey = 'sb_publishable_B0FafSksKHq1yukFmp-Iuw_wfd8H8YP';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- Estado --- //
let items = [];
let editId = null;
let fileHandle = null;
let userRole = 'leitor'; 

// ==========================================
// CONTROLE DE SESSÃO E PERMISSÕES
// ==========================================
async function verificarSessao() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        iniciarApp(session.user);
    } else {
        // Expulsa pro index se tentar acessar sem logar
        window.location.href = 'index.html';
    }
}

async function fazerLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

async function iniciarApp(user) {
    document.getElementById('app-content').style.display = 'block';

    // 1. Busca o cargo do usuário na tabela profiles
    if (user) {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('cargo')
            .eq('id', user.id)
            .single();

        if (data && data.cargo) {
            userRole = data.cargo;
        }
    }

    // 2. Esconde botões do painel superior se for apenas 'leitor'
    const btnNovoItem = document.querySelector('button[onclick="openModal()"]');
    const btnImportar = document.querySelector('button[onclick="importXLSX()"]');
    
    if (userRole === 'leitor') {
        if (btnNovoItem) btnNovoItem.style.display = 'none';
        if (btnImportar) btnImportar.style.display = 'none';
    }

    carregarEstoque();
}

// ==========================================
// BANCO DE DADOS (CRUD)
// ==========================================
async function carregarEstoque() {
    if (!document.getElementById('tbody')) return; 

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
        min: parseInt(document.getElementById('f-min').value) || 0
    };

    if (editId) {
        const { error } = await supabaseClient.from('estoque').update(itemData).eq('id', editId);
        if (error) toast('Erro ao atualizar');
        else toast('Item atualizado');
    } else {
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
    if(el) {
        el.textContent = msg;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 2500);
    }
}

function atualizarCategorias() {
    const select = document.getElementById('filter-cat');
    if (!select) return; 

    const categoriaAtual = select.value;
    const categorias = [...new Set(items.map(i => i.cat).filter(Boolean))].sort();
    
    select.innerHTML = '<option value="">Todas Categorias</option>' + 
        categorias.map(cat => `<option value="${cat}">${cat}</option>`).join('');

    select.value = categoriaAtual;
}

function render() {
    const searchInput = document.getElementById('search');
    if (!searchInput) return; 

    const q = searchInput.value.toLowerCase();
    const statusFiltro = document.getElementById('filter-status').value;
    const categoriaFiltro = document.getElementById('filter-cat').value;

    const list = items.filter(i => {
        const busca = i.nome.toLowerCase().includes(q) || i.cat.toLowerCase().includes(q);
        const statusOk = !statusFiltro || status(i.qty, i.min) === statusFiltro;
        const categoriaOk = !categoriaFiltro || i.cat === categoriaFiltro;
        return busca && statusOk && categoriaOk;
    });

    const low = items.filter(i => status(i.qty,i.min) === 'low').length;
    const out = items.filter(i => status(i.qty,i.min) === 'out').length;

    const statsEl = document.getElementById('stats');
    if (statsEl) {
        statsEl.innerHTML = `
            <div class="stat"><div class="label">Total de itens</div><div class="value">${items.length}</div></div>
            <div class="stat"><div class="label">Estoque baixo</div><div class="value warn">${low}</div></div>
            <div class="stat"><div class="label">Sem estoque</div><div class="value danger">${out}</div></div>
        `;
    }

    const tbody = document.getElementById('tbody');
    const empty = document.getElementById('empty');

    if (!list.length) {
        tbody.innerHTML = '';
        empty.classList.remove('hidden');
    } else {
        empty.classList.add('hidden');
        tbody.innerHTML = list.map(i => {
            const s = status(i.qty, i.min);
            
            let acoesHtml = '';
            if (userRole === 'editor' || userRole === 'admin') {
                acoesHtml = `
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
                `;
            } else {
                acoesHtml = `<span style="font-size: 11px; color: var(--text-muted)">Apenas leitura</span>`;
            }

            return `<tr>
                <td class="name">${esc(i.nome)}</td>
                <td>${esc(i.cat)}</td>
                <td>${i.qty}</td>
                <td>${i.min}</td>
                <td><span class="badge ${s}">${statusLabel(s)}</span></td>
                <td>${acoesHtml}</td>
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
            Mínimo: i.min
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 12 }, { wch: 10 }];
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
                min: parseInt(r['Mínimo'] || r['minimo'] || 0)
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
// MODO ESCURO (DARK MODE)
// ==========================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon('dark');
    }
}

function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    if (newTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    }
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (!icon) return;
    
    if (theme === 'dark') {
        icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    } else {
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    }
}

// ==========================================
// INICIALIZAÇÃO GERAL
// ==========================================
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

const elDate = document.getElementById('header-date');
if (elDate) {
    const dataHeader = new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
    elDate.textContent = dataHeader.charAt(0).toUpperCase() + dataHeader.slice(1);
}

initTheme();
verificarSessao();