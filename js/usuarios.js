document.addEventListener('DOMContentLoaded', () => {
    verificarAcessoSeguro();
});

// 1. Bloqueia a página para quem não for Admin
async function verificarAcessoSeguro() {
    // Como o auth.js já rodou, o supabaseClient está disponível
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    // Busca o cargo do usuário que está tentando acessar a página
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('cargo')
        .eq('id', session.user.id)
        .single();

    if (error || !data || data.cargo !== 'admin') {
        toast('Acesso negado. Apenas administradores!');
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        return;
    }

    document.getElementById('app-content').style.display = 'block';

    // Se chegou aqui, é admin de verdade. Pode carregar a tabela.
    carregarListaUsuarios();
}

// 2. Busca e renderiza todos os usuários do sistema
async function carregarListaUsuarios() {
    const { data: usuarios, error } = await supabaseClient
        .from('profiles')
        .select('id, nome, email, cargo, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar usuários:', error);
        toast('Erro ao carregar lista.');
        return;
    }

    const tbody = document.getElementById('tabela-usuarios');
    tbody.innerHTML = ''; 

    usuarios.forEach(user => {
        const tr = document.createElement('tr');
        const dataCadastro = new Date(user.created_at).toLocaleDateString('pt-BR');
        
        const options = ['leitor', 'editor', 'admin']
            .map(c => `<option value="${c}" ${user.cargo === c ? 'selected' : ''}>${c.toUpperCase()}</option>`)
            .join('');

        tr.innerHTML = `
            <td class="name">${user.nome || 'Sem nome'}</td>
            <td>${user.email}</td>
            <td>${dataCadastro}</td>
            <td>
                <select id="cargo-${user.id}" class="search" style="width: 120px;">
                    ${options}
                </select>
            </td>
            <td>
                <div class="actions">
                    <button class="btn sm primary" onclick="salvarCargo('${user.id}')">Salvar</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// FILTRO DE BUSCA (Em tempo real)
// ==========================================
document.getElementById('busca-usuario').addEventListener('input', function(e) {
    const termo = e.target.value.toLowerCase();
    const linhas = document.querySelectorAll('#tabela-usuarios tr');

    linhas.forEach(linha => {
        // Ignora a linha de "Carregando" ou "Vazio" se ela existir
        if (linha.cells.length === 1) return;

        // Pega o texto do Nome (coluna 0) e E-mail (coluna 1)
        const nome = linha.cells[0].textContent.toLowerCase();
        const email = linha.cells[1].textContent.toLowerCase();

        // Se o termo digitado estiver no nome ou no e-mail, mostra a linha. Senão, esconde.
        if (nome.includes(termo) || email.includes(termo)) {
            linha.style.display = '';
        } else {
            linha.style.display = 'none';
        }
    });
});

// 3. Salva o novo cargo no Supabase
async function salvarCargo(userId) {
    const novoCargo = document.getElementById(`cargo-${userId}`).value;

    const { error } = await supabaseClient
        .from('profiles')
        .update({ cargo: novoCargo })
        .eq('id', userId);

    if (error) {
        console.error('Erro ao atualizar cargo:', error);
        toast('Erro ao atualizar o cargo!');
    } else {
        toast('Cargo atualizado com sucesso!');
    }
}