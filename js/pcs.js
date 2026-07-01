// LÓGICA DE PCs DO ESCRITÓRIO 

(function() {
    let listaPCs = []; 
    let usuarioTemPermissao = false; // Por padrão, bloqueia tudo até provar o contrário

    // -------------------------------------------------------------
    // 2. VERIFICAÇÃO DE SESSÃO E CARGO
    // -------------------------------------------------------------
    async function iniciarApp() {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (!session) {
            window.location.href = 'index.html'; // Expulsa se não estiver logado
            return;
        }

        // Exibe o conteúdo da página
        const appContent = document.getElementById('app-content');
        if(appContent) appContent.style.display = 'block';

        // Busca o cargo do usuário na tabela profiles
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('cargo')
            .eq('id', session.user.id)
            .single();

        // Se o banco retornar um cargo e ele for DIFERENTE de 'leitor', libera o CRUD
        if (data && data.cargo && data.cargo !== 'leitor') {
            usuarioTemPermissao = true;
        } else {
            usuarioTemPermissao = false; // Se for 'leitor' ou der erro, fica sem permissão
        }

        // Após definir as permissões, carrega os dados
        await carregarPCs();
    }

    // -------------------------------------------------------------
    // 3. FUNÇÕES PRIVADAS DE LÓGICA E RENDERIZAÇÃO
    // -------------------------------------------------------------
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

        // Controle do botão Adicionar (Topo)
        const btnAddPc = document.querySelector('button[onclick="abrirModalPC()"]');
        if (btnAddPc) {
            btnAddPc.style.display = usuarioTemPermissao ? 'inline-flex' : 'none';
        }

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
                acoesHTML = `<span style="color: var(--text-muted); font-size: 12px; opacity: 0.6;">Apenas visualização</span>`;
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

    function esc(s) {
        return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // -------------------------------------------------------------
    // 4. EXPOSIÇÃO CONTROLADA PARA O HTML (window)
    // -------------------------------------------------------------
    
    window.carregarPCs = function() {
        renderizarPCs(); 
    };

    window.abrirModalPC = function(id = null) {
        if (!usuarioTemPermissao) return toast('Acesso restrito. Sem permissão.');

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
            modalTitle.textContent = 'Adicionar';
            btnSave.textContent = 'Cadastrar PC';
        }
        
        overlay.classList.remove('hidden');
    };

    window.fecharModalPC = function() {
        const overlay = document.getElementById('overlay-pc');
        if (overlay) overlay.classList.add('hidden');
    };

    window.salvarPC = async function() {
        if (!usuarioTemPermissao) return toast('Você não tem permissão para fazer alterações.');

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
            return toast('Erro ao salvar no banco. Verifique suas permissões.');
        }
        
        toast('Salvo com sucesso!');
        window.fecharModalPC();

        listaPCs = [];
        await carregarPCs(); // Recarrega os dados do banco para atualizar a tabela
    };

    window.removerPC = async function(id) {
        if (!usuarioTemPermissao) return toast('Você não tem permissão para remover itens.');
        
        if (!confirm('Remover este registro de PC?')) return;
        
        const { error } = await supabaseClient.from('pcs_escritorio').delete().eq('id', id);
        if (error) {
            console.error(error);
            return toast('Erro ao remover do banco. Verifique suas permissões.');
        }

        listaPCs = [];
        await carregarPCs();
    };

    // -------------------------------------------------------------
    // 5. INICIALIZAÇÃO
    // -------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('tbody-pcs')) {
            iniciarApp();
        }
    });

})();