// ==========================================
// LÓGICA DE PCs DO ESCRITÓRIO
// ==========================================

// 1. DECLARE A VARIÁVEL GLOBAL AQUI NO TOPO
let listaPCs = []; 

// Função para buscar os dados no banco (só roda quando precisa recarregar)
async function carregarPCs() {
    const tbody = document.getElementById('tbody-pcs');
    if (!tbody) return;

    if (listaPCs.length > 0) {
        renderizarPCs();
        return;
    }

    toast('Carregando PCs...');
    const { data, error } = await supabaseClient.from('pcs_escritorio').select('*').order('nome_funcionario');

    if (error) {
        console.error(error);
        toast('Erro ao buscar PCs');
        return;
    }

    listaPCs = data;
    renderizarPCs();
}

// Função para filtrar (busca) e desenhar a tabela, sem ir ao banco de novo
function renderizarPCs() {
    const tbody = document.getElementById('tbody-pcs');
    if (!tbody) return;

    const searchInput = document.getElementById('search-pcs');
    const termo = searchInput ? searchInput.value.trim().toLowerCase() : '';

    const data = termo
        ? listaPCs.filter(pc => {
            const funcionario = (pc.nome_funcionario || '').toLowerCase();
            const serie = (pc.numero_serie || '').toLowerCase();
            const pecas = (pc.pecas_info || '').toLowerCase();
            const carteira = (pc.carteira || '').toLowerCase();
            const supervisor = (pc.supervisor || '').toLowerCase();
            return funcionario.includes(termo) || serie.includes(termo) || pecas.includes(termo)
                || carteira.includes(termo) || supervisor.includes(termo);
        })
        : listaPCs;

    const usuarioTemPermissao = true; 

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; opacity:.7;">Nenhum PC encontrado</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(pc => {
        let acoesHTML = '';
        if (usuarioTemPermissao) {
            acoesHTML = `
                <div class="actions">
                    <button class="btn sm icon-btn" onclick="abrirModalPC(${pc.id})" title="Editar">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                            stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="btn sm icon-btn danger" onclick="removerPC(${pc.id})" title="Remover">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                            stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1-1v2"/></svg></button>
                </div>
            `;
        } else {
            acoesHTML = `<span>-</span>`;
        }

        return `
            <tr>
                <td>${esc(pc.nome_funcionario)}</td>
                <td>${esc(pc.numero_serie)}</td>
                <td>${esc(pc.pecas_info || '')}</td>
                <td>${esc(pc.carteira || '')}</td>
                <td>${esc(pc.supervisor || '')}</td>
                <td>${acoesHTML}</td>
            </tr>
        `;
    }).join('');
}

// Salvar / Editar
async function salvarPC() {
    const id = document.getElementById('f-id').value;
    const pcData = {
        nome_funcionario: document.getElementById('f-func').value.trim(),
        numero_serie: document.getElementById('f-serie').value.trim(),
        pecas_info: document.getElementById('f-pecas').value.trim(),
        carteira: document.getElementById('f-carteira').value.trim(),
        supervisor: document.getElementById('f-supervisor').value.trim()
    };

    if (!pcData.nome_funcionario || !pcData.numero_serie) return toast('Preencha os campos obrigatórios');

    let error;
    if (id) {
        ({ error } = await supabaseClient.from('pcs_escritorio').update(pcData).eq('id', id));
    } else {
        ({ error } = await supabaseClient.from('pcs_escritorio').insert([pcData]));
    }

    if (error) {
        console.error(error);
        return toast('Erro ao salvar no banco');
    }
    
    toast('Salvo com sucesso!');
    fecharModalPC();

    listaPCs = [];
    carregarPCs();
}

// Remover
async function removerPC(id) {
    if (!confirm('Remover este registro de PC?')) return;
    const { error } = await supabaseClient.from('pcs_escritorio').delete().eq('id', id);
    if (error) return toast('Erro ao remover');

    listaPCs = [];
    carregarPCs();
}

// Modal
function abrirModalPC(id = null) {
    const overlay = document.getElementById('overlay-pc');
    const modalTitle = document.getElementById('modal-title');
    const btnSave = document.getElementById('btn-save-pc');
    
    document.getElementById('f-id').value = id || '';
    
    if (id) {
        const pc = listaPCs.find(i => i.id === id);
        if (pc) {
            document.getElementById('f-func').value = pc.nome_funcionario;
            document.getElementById('f-serie').value = pc.numero_serie;
            document.getElementById('f-pecas').value = pc.pecas_info || '';
            document.getElementById('f-carteira').value = pc.carteira || '';
            document.getElementById('f-supervisor').value = pc.supervisor || '';
            modalTitle.textContent = 'Editar PC';
            btnSave.textContent = 'Salvar Alterações';
        }
    } else {
        document.getElementById('f-func').value = '';
        document.getElementById('f-serie').value = '';
        document.getElementById('f-pecas').value = '';
        document.getElementById('f-carteira').value = '';
        document.getElementById('f-supervisor').value = '';
        modalTitle.textContent = 'Cadastrar PC';
        btnSave.textContent = 'Cadastrar PC';
    }
    
    overlay.classList.remove('hidden');
}

function fecharModalPC() {
    document.getElementById('overlay-pc').classList.add('hidden');
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tbody-pcs')) {
        carregarPCs();
    }
});