/*
 * Login do site PetLar — mesma regra do app (UsuarioRepositorio.kt):
 * usuários guardados no próprio navegador (localStorage) enquanto não existe
 * backend, senha salva como hash SHA-256 e sessão lembrada até clicar em "Sair".
 */
(function () {
    const PREFIXO = 'petlarUsuario_';
    const CHAVE_SESSAO = 'petlarSessao';
    const PAGINA_LOGIN = 'login.html';

    const ADMIN_EMAIL = 'admin@petlar.com';
    const ADMIN_SENHA = 'admin123';
    /** Clientes de demonstração do app (DadosExemplo.kt), todos com esta senha. */
    const SENHA_EXEMPLO = 'cliente123';
    const CLIENTES_EXEMPLO = [
        [1001, 'Mariana Costa', 'mariana.costa@email.com', '11987654321', '39053344705'],
        [1002, 'Rafael Almeida', 'rafael.almeida@email.com', '11991234567', null],
        [1003, 'Juliana Ferreira', 'juliana.ferreira@email.com', '11976543210', '52998224725'],
        [1004, 'Lucas Oliveira', 'lucas.oliveira@email.com', null, null],
        [1005, 'Beatriz Santos', 'beatriz.santos@email.com', '11965432109', null],
        [1006, 'Pedro Henrique Lima', 'pedro.lima@email.com', '11954321098', '11144477735']
    ];

    /** Os dois acessos, ligados aos perfis do banco (tabela Perfil). */
    const PERFIL = { CLIENTE: 1, ADMINISTRATIVO: 2 };

    const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function chave(email) {
        return PREFIXO + email.trim().toLowerCase();
    }

    function agora() {
        return new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    function buscar(email) {
        const json = localStorage.getItem(chave(email));
        return json ? JSON.parse(json) : null;
    }

    function salvar(usuario) {
        localStorage.setItem(chave(usuario.email), JSON.stringify(usuario));
    }

    async function hash(senha) {
        if (window.crypto && crypto.subtle) {
            const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(senha));
            return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        return sha256(senha);
    }

    async function criar(nome, email, telefone, cpf, senha, idPerfil, id) {
        const data = agora();
        salvar({
            idUsuario: id || Date.now(),
            nome: nome,
            email: email.trim().toLowerCase(),
            telefone: telefone || null,
            cpf: cpf || null,
            senhaHash: await hash(senha),
            dataNascimento: null,
            status: 'ATIVO',
            emailVerificado: false,
            ultimoLogin: null,
            dataCadastro: data,
            dataAtualizacao: data,
            idPerfil: idPerfil
        });
    }

    /** Sem backend não há como cadastrar a equipe, então o site cria as contas padrão do app. */
    async function carregarContasPadrao() {
        if (!emailCadastrado(ADMIN_EMAIL)) {
            await criar('Administração PetLar', ADMIN_EMAIL, null, null, ADMIN_SENHA, PERFIL.ADMINISTRATIVO);
        }
        for (const [id, nome, email, telefone, cpf] of CLIENTES_EXEMPLO) {
            if (!emailCadastrado(email)) {
                await criar(nome, email, telefone, cpf, SENHA_EXEMPLO, PERFIL.CLIENTE, id);
            }
        }
    }

    function emailCadastrado(email) {
        return localStorage.getItem(chave(email)) !== null;
    }

    /** Cadastro pelo site: sempre cria um cliente. */
    async function cadastrar(nome, email, telefone, cpf, senha) {
        if (emailCadastrado(email)) return false;
        await criar(nome, email, telefone, cpf, senha, PERFIL.CLIENTE);
        return true;
    }

    /** Retorna o usuário logado, ou null se e-mail ou senha estiverem errados. */
    async function entrar(email, senha) {
        const usuario = buscar(email);
        if (!usuario || usuario.senhaHash !== await hash(senha)) return null;
        usuario.ultimoLogin = agora();
        salvar(usuario);
        localStorage.setItem(CHAVE_SESSAO, usuario.email);
        return usuario;
    }

    function usuarioLogado() {
        const email = localStorage.getItem(CHAVE_SESSAO);
        return email ? buscar(email) : null;
    }

    function sair() {
        localStorage.removeItem(CHAVE_SESSAO);
        window.location.replace(PAGINA_LOGIN);
    }

    /** Chamar no <head> das páginas protegidas: sem sessão, volta para o login. */
    function exigirLogin() {
        if (!usuarioLogado()) {
            const destino = window.location.pathname.split('/').pop() + window.location.hash;
            window.location.replace(PAGINA_LOGIN + '?voltar=' + encodeURIComponent(destino));
        }
    }

    /** Coloca "Olá, Nome · Sair" na navbar. */
    function mostrarUsuario(container) {
        const usuario = usuarioLogado();
        if (!usuario || !container) return;

        const saudacao = document.createElement('span');
        saudacao.className = 'usuario-logado';
        saudacao.textContent = 'Olá, ' + usuario.nome.split(' ')[0];

        const botaoSair = document.createElement('a');
        botaoSair.href = '#';
        botaoSair.className = 'btn-sair';
        botaoSair.textContent = 'Sair';
        botaoSair.addEventListener('click', function (e) {
            e.preventDefault();
            sair();
        });

        container.prepend(saudacao);
        container.append(botaoSair);
    }

    /** SHA-256 em JS puro, usado quando o navegador não libera crypto.subtle (ex.: http fora do localhost). */
    function sha256(texto) {
        const k = [];
        const h = [];
        let primo = 2;
        for (let n = 0; n < 64; primo++) {
            let ehPrimo = true;
            for (let d = 2; d * d <= primo; d++) if (primo % d === 0) { ehPrimo = false; break; }
            if (!ehPrimo) continue;
            if (n < 8) h[n] = (Math.pow(primo, 1 / 2) * 0x100000000) | 0;
            k[n++] = (Math.pow(primo, 1 / 3) * 0x100000000) | 0;
        }

        const bytes = Array.from(new TextEncoder().encode(texto));
        const tamanhoBits = bytes.length * 8;
        bytes.push(0x80);
        while (bytes.length % 64 !== 56) bytes.push(0);
        for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (tamanhoBits >>> (i * 8)) & 0xff);

        const rotr = (x, n) => (x >>> n) | (x << (32 - n));
        for (let bloco = 0; bloco < bytes.length; bloco += 64) {
            const w = [];
            for (let i = 0; i < 64; i++) {
                if (i < 16) {
                    const j = bloco + i * 4;
                    w[i] = (bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3];
                } else {
                    const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
                    const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
                    w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
                }
            }
            let [a, b, c, d, e, f, g, hh] = h;
            for (let i = 0; i < 64; i++) {
                const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + k[i] + w[i]) | 0;
                const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
                hh = g; g = f; f = e; e = (d + t1) | 0;
                d = c; c = b; b = a; a = (t1 + t2) | 0;
            }
            [a, b, c, d, e, f, g, hh].forEach((v, i) => { h[i] = (h[i] + v) | 0; });
        }
        return h.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
    }

    window.PetLarAuth = {
        EMAIL_VALIDO,
        carregarContasPadrao,
        emailCadastrado,
        cadastrar,
        entrar,
        usuarioLogado,
        sair,
        exigirLogin,
        mostrarUsuario
    };
})();
