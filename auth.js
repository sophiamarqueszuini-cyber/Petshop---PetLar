/*
 * Login do site PetLar com Firebase:
 * - Firebase Authentication guarda e-mail/senha e mantém a sessão até clicar em "Sair da conta" (perfil.html);
 * - Firestore guarda os dados do cliente na coleção "usuarios" (mesmos campos do Usuario.kt do app).
 * Depende de firebase-app/auth/firestore-compat.js e de firebase-config.js carregados antes.
 */
(function () {
    const PAGINA_LOGIN = 'login.html';
    const COLECAO = 'usuarios';

    /** Conta da equipe, igual ao app (UsuarioRepositorio.ADMIN_EMAIL). */
    const ADMIN_EMAIL = 'admin@petlar.com';

    /** Os dois acessos, ligados aos perfis do banco (tabela Perfil). */
    const PERFIL = { CLIENTE: 1, ADMINISTRATIVO: 2 };

    const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const config = window.PETLAR_FIREBASE_CONFIG || {};
    const configurado = !!config.apiKey && config.apiKey !== 'COLE_AQUI';

    let auth = null;
    let db = null;
    if (configurado) {
        firebase.initializeApp(config);
        auth = firebase.auth();
        auth.languageCode = 'pt-BR';
        db = firebase.firestore();
    }

    function agora() {
        return new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    function documento(uid) {
        return db.collection(COLECAO).doc(uid);
    }

    /** Lê os dados do cliente; contas criadas pelo console do Firebase ainda não têm documento, então ele é criado aqui. */
    async function carregarUsuario(contaFirebase, dadosCadastro) {
        const ref = documento(contaFirebase.uid);
        const snap = await ref.get();
        if (snap.exists) return snap.data();

        // Igual ao e-mail da conta (as regras do Firestore conferem isso).
        const email = contaFirebase.email;
        const data = agora();
        const usuario = {
            idUsuario: contaFirebase.uid,
            nome: (dadosCadastro && dadosCadastro.nome) || contaFirebase.displayName || email.split('@')[0],
            email: email,
            telefone: (dadosCadastro && dadosCadastro.telefone) || null,
            cpf: (dadosCadastro && dadosCadastro.cpf) || null,
            dataNascimento: null,
            status: 'ATIVO',
            emailVerificado: contaFirebase.emailVerified,
            ultimoLogin: data,
            dataCadastro: data,
            dataAtualizacao: data,
            idPerfil: email.toLowerCase() === ADMIN_EMAIL ? PERFIL.ADMINISTRATIVO : PERFIL.CLIENTE
        };
        await ref.set(usuario);
        return usuario;
    }

    /** Resolve com o usuário logado (ou null) assim que o Firebase recupera a sessão salva. */
    const pronto = new Promise(resolve => {
        if (!configurado) return resolve(null);
        const parar = auth.onAuthStateChanged(async conta => {
            parar();
            if (!conta) return resolve(null);
            try {
                resolve(await carregarUsuario(conta));
            } catch (e) {
                console.error('PetLar: erro ao ler o cadastro', e);
                resolve(null);
            }
        });
    });

    function mensagemDeErro(e) {
        switch (e && e.code) {
            case 'auth/invalid-credential':
            case 'auth/invalid-login-credentials':
            case 'auth/wrong-password':
            case 'auth/user-not-found':
                return 'E-mail ou senha incorretos';
            case 'auth/email-already-in-use':
                return 'Já existe uma conta com este e-mail';
            case 'auth/invalid-email':
                return 'E-mail inválido';
            case 'auth/weak-password':
                return 'A senha deve ter pelo menos 6 caracteres';
            case 'auth/too-many-requests':
                return 'Muitas tentativas. Aguarde alguns minutos e tente de novo';
            case 'auth/network-request-failed':
                return 'Sem conexão com a internet';
            default:
                console.error('PetLar:', e);
                return 'Não foi possível concluir. Tente novamente';
        }
    }

    /** Retorna o usuário logado; lança Error com a mensagem pronta para a tela. */
    async function entrar(email, senha) {
        try {
            const { user } = await auth.signInWithEmailAndPassword(email.trim(), senha);
            const usuario = await carregarUsuario(user);
            usuario.ultimoLogin = agora();
            await documento(user.uid).update({ ultimoLogin: usuario.ultimoLogin });
            return usuario;
        } catch (e) {
            throw new Error(mensagemDeErro(e));
        }
    }

    /** Cadastro pelo site: sempre cria um cliente e já deixa logado. */
    async function cadastrar(nome, email, telefone, cpf, senha) {
        try {
            const { user } = await auth.createUserWithEmailAndPassword(email.trim(), senha);
            await user.updateProfile({ displayName: nome });
            return await carregarUsuario(user, { nome, telefone, cpf });
        } catch (e) {
            throw new Error(mensagemDeErro(e));
        }
    }

    /** O Firebase envia de verdade o e-mail com o link para criar uma nova senha. */
    async function recuperarSenha(email) {
        try {
            await auth.sendPasswordResetEmail(email.trim());
        } catch (e) {
            // Não revela se o e-mail tem conta; só avisa problemas de conexão/limite.
            if (e.code === 'auth/network-request-failed' || e.code === 'auth/too-many-requests') {
                throw new Error(mensagemDeErro(e));
            }
        }
    }

    async function sair() {
        if (auth) await auth.signOut();
        window.location.replace(PAGINA_LOGIN);
    }

    /** Atualiza o cadastro do cliente logado (nome, telefone, CPF, endereços...). */
    async function atualizarPerfil(dados) {
        const conta = auth && auth.currentUser;
        if (!conta) throw new Error('Sua sessão expirou. Entre de novo');
        const alteracoes = Object.assign({}, dados, { dataAtualizacao: agora() });
        try {
            await documento(conta.uid).update(alteracoes);
            if (dados.nome) await conta.updateProfile({ displayName: dados.nome });
        } catch (e) {
            throw new Error(mensagemDeErro(e));
        }
        return alteracoes;
    }

    /** Coloca o primeiro nome do cliente nos elementos marcados com data-nome-usuario (ex.: "Olá, Sophia" na capa). */
    function mostrarUsuario(usuario) {
        if (!usuario) return;
        const primeiroNome = usuario.nome.split(' ')[0];
        document.querySelectorAll('[data-nome-usuario]').forEach(el => {
            el.textContent = primeiroNome;
        });
    }

    /**
     * Chamar no <head> das páginas protegidas: esconde a página enquanto confere a sessão;
     * sem login, volta para o login; logado, mostra o nome do usuário e chama aoEntrar(usuario), se houver.
     */
    function exigirLogin(aoEntrar) {
        const html = document.documentElement;
        html.style.visibility = 'hidden';
        pronto.then(usuario => {
            if (!usuario) {
                const destino = window.location.pathname.split('/').pop() + window.location.hash;
                window.location.replace(PAGINA_LOGIN + '?voltar=' + encodeURIComponent(destino));
                return;
            }
            const exibir = () => {
                mostrarUsuario(usuario);
                if (aoEntrar) aoEntrar(usuario);
                html.style.visibility = '';
            };
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', exibir);
            } else {
                exibir();
            }
        });
    }

    window.PetLarAuth = {
        EMAIL_VALIDO,
        PERFIL,
        configurado,
        pronto,
        entrar,
        cadastrar,
        recuperarSenha,
        atualizarPerfil,
        sair,
        exigirLogin
    };
})();
