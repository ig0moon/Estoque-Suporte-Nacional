// LÓGICA DE CELULARES CORPORATIVOS

(function () {
    let listaCelulares = [];
    let cargoUsuario = "leitor"; // Default restrito

  // -------------------------------------------------------------
  // 2. VERIFICAÇÃO DE SESSÃO E CARGO
  // -------------------------------------------------------------
    async function iniciarApp() {
        const {
            data: { session },
            error: sessionError,
        } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "index.html";
        return;
    }

    const appContent = document.getElementById("app-content");
    if (appContent) appContent.style.display = "block";

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("cargo")
        .eq("id", session.user.id)
        .single();

    if (data && data.cargo) {
        cargoUsuario = data.cargo;
    }

    await carregarCelulares();
    }

// -------------------------------------------------------------
// 3. FUNÇÕES PRIVADAS DE LÓGICA E RENDERIZAÇÃO
// -------------------------------------------------------------
    async function carregarCelulares() {
        const tbody = document.getElementById("tbody-celulares");
        if (!tbody) return;

        if (listaCelulares.length > 0) {
            renderizarCelulares();
            return;
        }

        toast("Carregando...");
        const { data, error } = await supabaseClient
            .from("celulares")
            .select("*")
            .order("numero");

        if (error) {
            console.error(error);
            toast("Erro ao buscar Celulares");
            return;
        }

        listaCelulares = data;
        renderizarCelulares();
    }

    function renderizarCelulares() {
        const tbody = document.getElementById("tbody-celulares");
        if (!tbody) return;

        const searchInput = document.getElementById("search-celulares");
        const termo = searchInput ? searchInput.value.trim().toLowerCase() : "";

        const data = termo
            ? listaCelulares.filter((celular) => {
                const num = (celular.numero || "").toLowerCase();
                const modelo = (celular.modelo || "").toLowerCase();
                const c1 = (celular.chip1 || "").toLowerCase();
                const c2 = (celular.chip2 || "").toLowerCase();
                const sup = (celular.supervisor || "").toLowerCase();
                const cart = (celular.carteira || "").toLowerCase();

                return (
                    num.includes(termo) ||
                    modelo.includes(termo) ||
                    c1.includes(termo) ||
                    c2.includes(termo) ||
                    sup.includes(termo) ||
                    cart.includes(termo)
                );
            })
        : listaCelulares;

        const btnAddCelular = document.getElementById("btn-add-celular");
        if (btnAddCelular) {
        btnAddCelular.style.display =
            cargoUsuario === "admin" || cargoUsuario === "editor"
                ? "inline-flex"
                : "none";
        }

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; opacity:.7;">Nenhum celular encontrado.</td></tr>`;
            return;
        }

    tbody.innerHTML = data
        .map((celular) => {
            let acoesHTML = "";

            if (cargoUsuario === "admin" || cargoUsuario === "editor") {
                const btnEditar = `
                    <button class="btn sm icon-btn" onclick="abrirModalCelular(${celular.id})" title="Editar">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                `;

                const btnRemover =
                    cargoUsuario === "admin"
                        ? `
                            <button class="btn sm icon-btn danger" onclick="removerCelular(${celular.id})" title="Remover">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                    <path d="M10 11v6M14 11v6"/>
                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1-1v2"/>
                                </svg>
                            </button>
                        `
                    : "";

                acoesHTML = `<div class="actions">${btnEditar}${btnRemover}</div>`;
            } else {
                acoesHTML = `<span style="color: var(--text-muted); font-size: 12px; opacity: 0.6;">Apenas vis.</span>`;
            }

        return `
                <tr>
                    <td>${esc(celular.numero)}</td>
                    <td>${esc(celular.modelo)}</td>
                    <td>${esc(celular.chip1 || "-")}</td>
                    <td>${esc(celular.chip2 || "-")}</td>
                    <td>${esc(celular.supervisor || "-")}</td>
                    <td>${esc(celular.carteira || "-")}</td>
                    <td>${acoesHTML}</td>
                </tr>
            `;
        })
        .join("");
    }

    function esc(s) {
        return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

// -------------------------------------------------------------
// 4. EXPOSIÇÃO CONTROLADA PARA O HTML
// -----------------------------------------------------------

    window.carregarCelulares = function () {
        renderizarCelulares();
    };

    window.abrirModalCelular = function (id = null) {
        if (cargoUsuario === "leitor")
        return toast("Acesso restrito. Apenas leitura.");

        const overlay = document.getElementById("overlay-celular");
        const modalTitle = document.getElementById("modal-title");
        const btnSave = document.getElementById("btn-save-celular");

        document.getElementById("c-id").value = id || "";

        if (id) {
            const celular = listaCelulares.find((i) => i.id === id);
            if (celular) {
                document.getElementById("c-numero").value = celular.numero || "";
                document.getElementById("c-modelo").value = celular.modelo || "";
                document.getElementById("c-chip1").value = celular.chip1 || "";
                document.getElementById("c-chip2").value = celular.chip2 || "";
                document.getElementById("c-supervisor").value = celular.supervisor || "";
                document.getElementById("c-carteira").value = celular.carteira || "";

                modalTitle.textContent = "Editar Celular";
                btnSave.textContent = "Salvar";
            }
        } else {
            document.getElementById("c-numero").value = "";
            document.getElementById("c-modelo").value = "";
            document.getElementById("c-chip1").value = "";
            document.getElementById("c-chip2").value = "";
            document.getElementById("c-supervisor").value = "";
            document.getElementById("c-carteira").value = "";

            modalTitle.textContent = "Adicionar Celular";
            btnSave.textContent = "Salvar";
        }

        overlay.classList.remove("hidden");
    };

    window.fecharModalCelular = function () {
        const overlay = document.getElementById("overlay-celular");
        if (overlay) overlay.classList.add("hidden");
    };

    window.salvarCelular = async function () {
        if (cargoUsuario === "leitor")
            return toast("Você não tem permissão para fazer alterações.");

        const id = document.getElementById("c-id").value;
        const celularData = {
            numero: document.getElementById("c-numero").value.trim(),
            modelo: document.getElementById("c-modelo").value.trim(),
            chip1: document.getElementById("c-chip1").value.trim(),
            chip2: document.getElementById("c-chip2").value.trim(),
            supervisor: document.getElementById("c-supervisor").value.trim(),
            carteira: document.getElementById("c-carteira").value.trim(),
        };

        if (!celularData.numero || !celularData.modelo)
            return toast("Preencha Número e Modelo");

        let error;
            if (id) {
                ({ error } = await supabaseClient
                .from("celulares")
                .update(celularData)
                .eq("id", id));
            } else {
                ({ error } = await supabaseClient
                .from("celulares")
                .insert([celularData]));
            }

        if (error) {
            console.error(error);
                return toast("Erro ao salvar. Verifique suas permissões no banco.");
        }

        toast("Salvo com sucesso!");
        window.fecharModalCelular();

        listaCelulares = [];
        await carregarCelulares();
    };

    window.removerCelular = async function (id) {
        if (cargoUsuario !== "admin")
            return toast("Apenas administradores podem remover itens.");

        if (!confirm("Remover este registro de Celular?")) return;

        const { error } = await supabaseClient
            .from("celulares")
            .delete()
            .eq("id", id);
        if (error) {
            console.error(error);
            return toast("Erro ao remover do banco. Verifique suas permissões.");
        }

        listaCelulares = [];
        await carregarCelulares();
    };

// -------------------------------------------------------------
// 5. INICIALIZAÇÃO
// -------------------------------------------------------------
    document.addEventListener("DOMContentLoaded", () => {
        if (document.getElementById("tbody-celulares")) {
            iniciarApp();
        }
    });
})();