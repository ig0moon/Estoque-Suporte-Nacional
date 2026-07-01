// ==========================================
// CONFIGURAÇÃO DO SUPABASE (auth.js)
// ==========================================
const supabaseUrl = 'https://etijsbxyidgjqjxmhxmr.supabase.co'; 
const supabaseKey = 'sb_publishable_B0FafSksKHq1yukFmp-Iuw_wfd8H8YP';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// VERIFICAÇÃO DE SESSÃO
// ==========================================
async function verificarSessao() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    // Descobre em qual página o usuário está no momento
    const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';

    if (session) {
        if (paginaAtual === 'index.html' || paginaAtual === '') {
            document.getElementById('auth-screen').classList.add('hidden');
            // Força a exibição do Hub
            document.getElementById('app-content').style.display = 'block';
        }
    } else {
        if (paginaAtual === 'index.html' || paginaAtual === '') {
            document.getElementById('auth-screen').classList.remove('hidden');
            document.getElementById('app-content').style.display = 'none';
        } else {
            // Se tentar acessar estoque ou PCs sem logar, vai pro Hub logar
            window.location.href = 'index.html';
        }
    }
}

// AUTENTICAÇÃO E LOGIN
function toggleAuth(type) {
    if (type === 'register') {
        document.getElementById('login-box').classList.add('hidden');
        document.getElementById('register-box').classList.remove('hidden');
    } else {
        document.getElementById('register-box').classList.add('hidden');
        document.getElementById('login-box').classList.remove('hidden');
    }
}

async function fazerLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-senha').value;

    if(!email || !password) return toast('Preencha email e senha');
    
    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    btn.disabled = false;
    btn.textContent = 'Entrar no Sistema';

    if (error) {
        toast('Erro: Credenciais inválidas');
    } else {
        const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';
        if (paginaAtual === 'index.html' || paginaAtual === '') {
            document.getElementById('auth-screen').classList.add('hidden');
            // Mostra o Hub assim que clica em "Entrar"
            document.getElementById('app-content').style.display = 'block';
            toast('Bem-vindo de volta!');
        } else {
            window.location.href = 'index.html';
        }
    }
}

async function fazerRegistro() {
    const nome = document.getElementById('reg-nome').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-senha').value;

    if(!nome || !email || !password) return toast('Preencha todos os campos');
    if(password.length < 6) return toast('A senha deve ter no mínimo 6 caracteres');
    
    const btn = document.getElementById('btn-register');
    btn.disabled = true;
    btn.textContent = 'Cadastrando...';

    const { data, error } = await supabaseClient.auth.signUp({ 
        email, 
        password,
        options: {
            data: { nome: nome }
        }
    });

    btn.disabled = false;
    btn.textContent = 'Cadastrar';

    if (error) {
        toast('Erro: ' + (error.message || 'Verifique os dados.'));
    } else {
        toast('Conta criada com sucesso!');
        document.getElementById('reg-nome').value = '';
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-senha').value = '';
        document.getElementById('login-email').value = email;
        toggleAuth('login');
    }
}

async function fazerLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

// ==========================================
// HELPERS UI DO LOGIN
// ==========================================
function toast(msg) {
    const el = document.getElementById('toast');
    if(el) {
        el.textContent = msg;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 2500);
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}

// Inicializa a página de login
initTheme();
verificarSessao();