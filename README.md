# PetLar Sanctuary — Site

Site do **PetLar Sanctuary**, um pet shop de hospitalidade e spa animal: “Onde o afeto encontra o seu lugar”.

🌐 **Acesse:** https://sophiamarqueszuini-cyber.github.io/Petshop---PetLar/

📱 **App mobile:** https://github.com/sophiamarqueszuini-cyber/Mobile-PetLar

## Funcionalidades

- **Login e cadastro**, no mesmo modelo do app: só entra no site quem tem conta.
  - Cadastro com nome, e-mail, telefone e CPF (estes dois opcionais) e senha de no mínimo 6 caracteres.
  - O login continua ativo até clicar em **Sair da conta**, no perfil.
  - **Esqueci minha senha** envia por e-mail o link para criar uma senha nova.
- **Navbar igual ao app:** ícone do carrinho (com a quantidade de itens) e ícone do bonequinho, que abre o perfil.
- **Saudação na capa:** “Olá, Nome” logo acima do título.
- **Meu perfil** (`perfil.html`), igual ao app:
  - inicial do nome, nome e e-mail do tutor, telefone e CPF;
  - **Editar perfil**: altera nome, telefone e CPF (o e-mail não muda);
  - **Meus endereços**: adiciona e remove endereços, com o CEP preenchendo rua, bairro e cidade automaticamente;
  - **Sair da conta**.
- **Página inicial** com as seções Nosso Propósito, Cuidados (serviços), Boutique (produtos), Espaço do Tutor e Contato & Redes.
- **Carrinho de compras:**
  - alterar a quantidade e remover itens;
  - calcular o frete pelo CEP;
  - aplicar o cupom `PETLAR10` (10% de desconto);
  - pagar por Pix, cartão, boleto ou carteiras digitais.
- **Cartão digital** (`cartao.html`), com links para o site, o WhatsApp, o Instagram e a localização.

## Tecnologias

- HTML, CSS e JavaScript, sem framework.
- [Firebase](https://firebase.google.com/):
  - **Authentication** guarda o e-mail e a senha.
  - **Cloud Firestore** guarda os dados dos clientes.
- Hospedagem no GitHub Pages.

## Estrutura

| Arquivo | O que é |
| --- | --- |
| `index.html` | Página inicial (exige login) |
| `carrinho.html` | Carrinho e finalização da compra (exige login) |
| `perfil.html` | Perfil do cliente, edição dos dados e endereços (exige login) |
| `login.html` | Telas de entrar, cadastrar e recuperar senha |
| `cartao.html` | Cartão de visita digital (público) |
| `auth.js` | Login, cadastro, sessão e proteção das páginas |
| `firebase-config.js` | Dados do projeto Firebase |
| `firestore.rules` | Regras de segurança do banco de dados |
| `style.css` | Estilos do site |

## Contas e segurança

- Cada cliente cria a própria conta em **Cadastre-se**. Os dados ficam na coleção `usuarios` do Firestore, com os mesmos campos do modelo `Usuario` do app.
- A conta da equipe é `admin@petlar.com` (perfil Administrativo). Ela é criada direto no console do Firebase, nunca pelo site.
- As regras do `firestore.rules` garantem duas coisas: cada cliente só vê e altera o próprio cadastro, e ninguém consegue se transformar em admin.
  - Se alterar esse arquivo, publique o novo conteúdo em **Console do Firebase › Firestore Database › Regras**.
- Os valores do `firebase-config.js` são públicos por natureza: eles só identificam o projeto. Quem protege os dados são as regras do Firestore.

## Como rodar

O site não precisa de instalação. Há três formas de abrir:

- pelo link do GitHub Pages acima;
- clicando duas vezes no `index.html`;
- usando a extensão **Live Server** do VS Code.

É preciso estar conectado à internet, porque o login depende do Firebase.
