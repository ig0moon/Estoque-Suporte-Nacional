// LÓGICA DE FONES DO ESCRITÓRIO 

(function() {
    let listaFones = []; 
    let cargoUsuario = 'leitor'; // Default restrito

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

        if (data && data.cargo) {
            cargoUsuario = data.cargo; // 'admin', 'editor', ou 'leitor'
        }

        // Após definir as permissões, carrega os dados
        await carregarFones();
    }

    // -------------------------------------------------------------
    // 3. FUNÇÕES PRIVADAS DE LÓGICA E RENDERIZAÇÃO
    // -------------------------------------------------------------
    async function carregarFones() {
        const tbody = document.getElementById('tbody-fones');
        if (!tbody) return;

        if (listaFones.length > 0) {
            renderizarFones();
            return;
        }

        toast('Carregando...');
        const { data, error } = await supabaseClient.from('fones_escritorio').select('*').order('nome_funcionario');

        if (error) {
            console.error(error);
            toast('Erro ao buscar Fones');
            return;
        }

        listaFones = data;
        renderizarFones();
    }

    function renderizarFones() {
        const tbody = document.getElementById('tbody-fones');
        if (!tbody) return;

        const searchInput = document.getElementById('search-fones');
        const termo = searchInput ? searchInput.value.trim().toLowerCase() : '';

        const data = termo
            ? listaFones.filter(fone => {
                const funcionario = (fone.nome_funcionario || '').toLowerCase();
                const marca = (fone.marca || '').toLowerCase();
                const numeracao = (fone.numeracao || '').toLowerCase();
                const supervisor = (fone.supervisor || '').toLowerCase();
                const carteira = (fone.carteira || '').toLowerCase();
                
                return funcionario.includes(termo) || 
                    marca.includes(termo) || 
                    numeracao.includes(termo) ||
                    supervisor.includes(termo) || 
                    carteira.includes(termo);
            })
            : listaFones;

        // Controle do botão Adicionar (Topo) - Oculta para leitores
        const btnAddFone = document.getElementById('btn-add-fone');
        if (btnAddFone) {
            btnAddFone.style.display = (cargoUsuario === 'admin' || cargoUsuario === 'editor') ? 'inline-flex' : 'none';
        }

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; opacity:.7;">Nenhum fone encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(fone => {
            let acoesHTML = '';
            
            // Permissões de exibição dos botões na tabela
            if (cargoUsuario === 'admin' || cargoUsuario === 'editor') {
                const btnEditar = `
                    <button class="btn sm icon-btn" onclick="abrirModalFone(${fone.id})" title="Editar">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                `;
                
                // Botão de remover APENAS para admins
                const btnRemover = cargoUsuario === 'admin' ? `
                    <button class="btn sm icon-btn danger" onclick="removerFone(${fone.id})" title="Remover">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1-1v2"/>
                        </svg>
                    </button>
                ` : '';

                acoesHTML = `<div class="actions">${btnEditar}${btnRemover}</div>`;
            } else {
                // Leitor vê um aviso ou espaço em branco
                acoesHTML = `<span style="color: var(--text-muted); font-size: 12px; opacity: 0.6;">Apenas vis.</span>`;
            }

            return `
                <tr>
                    <td>${esc(fone.numeracao || '')}</td>
                    <td>${esc(fone.nome_funcionario)}</td>
                    <td>${esc(fone.marca || '')}</td>
                    <td>${esc(fone.supervisor || '')}</td>
                    <td>${esc(fone.carteira || '')}</td>
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
    
    window.carregarFones = function() {
        renderizarFones(); 
    };

    window.abrirModalFone = function(id = null) {
        if (cargoUsuario === 'leitor') return toast('Acesso restrito. Apenas leitura.');

        const overlay = document.getElementById('overlay-fone');
        const modalTitle = document.getElementById('modal-title');
        const btnSave = document.getElementById('btn-save-fone');
        
        document.getElementById('f-id').value = id || '';
        
        if (id) {
            const fone = listaFones.find(i => i.id === id);
            if (fone) {
                document.getElementById('f-func').value = fone.nome_funcionario || '';
                document.getElementById('f-marca').value = fone.marca || '';
                document.getElementById('f-numeracao').value = fone.numeracao || '';
                document.getElementById('f-supervisor').value = fone.supervisor || '';
                document.getElementById('f-carteira').value = fone.carteira || '';
                
                modalTitle.textContent = 'Editar Fone';
                btnSave.textContent = 'Salvar';
            }
        } else {
            document.getElementById('f-func').value = '';
            document.getElementById('f-marca').value = '';
            document.getElementById('f-numeracao').value = '';
            document.getElementById('f-supervisor').value = '';
            document.getElementById('f-carteira').value = '';
            
            modalTitle.textContent = 'Adicionar';
            btnSave.textContent = 'Salvar';
        }
        
        overlay.classList.remove('hidden');
    };

    window.fecharModalFone = function() {
        const overlay = document.getElementById('overlay-fone');
        if (overlay) overlay.classList.add('hidden');
    };

    window.salvarFone = async function() {
        if (cargoUsuario === 'leitor') return toast('Você não tem permissão para fazer alterações.');

        const id = document.getElementById('f-id').value;
        const foneData = {
            numeracao: document.getElementById('f-numeracao').value.trim(),
            nome_funcionario: document.getElementById('f-func').value.trim(),
            marca: document.getElementById('f-marca').value.trim(),
            supervisor: document.getElementById('f-supervisor').value.trim(),
            carteira: document.getElementById('f-carteira').value.trim()
        };

        if (!foneData.nome_funcionario || !foneData.marca) return toast('Preencha os campos obrigatórios');

        let error;
        if (id) {
            ({ error } = await supabaseClient.from('fones_escritorio').update(foneData).eq('id', id));
        } else {
            ({ error } = await supabaseClient.from('fones_escritorio').insert([foneData]));
        }

        if (error) {
            console.error(error);
            return toast('Erro ao salvar no banco. Verifique suas permissões.');
        }
        
        toast('Salvo com sucesso!');
        window.fecharModalFone();

        listaFones = [];
        await carregarFones(); // Recarrega os dados
    };

    window.removerFone = async function(id) {
        if (cargoUsuario !== 'admin') return toast('Apenas administradores podem remover itens.');
        
        if (!confirm('Remover este registro de Fone?')) return;
        
        const { error } = await supabaseClient.from('fones_escritorio').delete().eq('id', id);
        if (error) {
            console.error(error);
            return toast('Erro ao remover do banco. Verifique suas permissões.');
        }

        listaFones = [];
        await carregarFones();
    };

    // -------------------------------------------------------------
    // 5. INICIALIZAÇÃO
    // -------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('tbody-fones')) {
            iniciarApp();
        }
    });

})();