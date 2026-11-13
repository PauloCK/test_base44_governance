# Setup inicial

Faz uma vez por computador. No fim, a pessoa consegue rodar o app no próprio computador, com dados fictícios, e abrir PRs.

Escrito para ser seguido por uma pessoa ou pela IA dela. A IA executa os comandos e a pessoa aprova cada um. Os comandos são para Windows (PowerShell); no Mac, troque `winget install` por `brew install`.

## Regras do setup

1. Senhas, códigos e tokens nunca são digitados no chat nem colados em arquivos. Todo login (GitHub e Base44) é feito pela própria pessoa, no navegador que o comando abrir.
2. Não é preciso ser colaborador do app no Base44. O acesso ao app no editor do Base44 não é usado para desenvolver.
3. Se um passo falhar, pare, mostre o erro e só siga depois de resolver. Não pule passos.
4. Antes de instalar algo, confira se já está instalado (passo 1). Não reinstale o que já existe.

## Passo a passo

1. Conferir o que já está instalado:
   ```powershell
   git --version
   node --version
   gh --version
   base44 --version
   ```
   Anote o que respondeu com versão e pule a instalação correspondente nos passos 2 a 5.
2. Instalar o Git:
   ```powershell
   winget install --id Git.Git -e
   ```
3. Instalar o Node.js (versão 22 ou mais nova):
   ```powershell
   winget install --id OpenJS.NodeJS.LTS -e
   ```
4. Instalar o GitHub CLI:
   ```powershell
   winget install --id GitHub.cli -e
   ```
5. Fechar e abrir o terminal de novo, para ele enxergar o que foi instalado, e instalar o Base44 CLI:
   ```powershell
   npm install -g base44
   ```
6. Repetir o passo 1. Todos os quatro comandos precisam responder com uma versão.
7. Entrar no GitHub. O comando abre o navegador; a pessoa entra com a própria conta e autoriza:
   ```powershell
   gh auth login --hostname github.com --git-protocol https --web
   gh auth setup-git
   ```
   Conferir com `gh auth status`: deve mostrar a conta da pessoa.
8. Conferir que a conta tem acesso ao repositório:
   ```powershell
   gh repo view PauloCK/test_base44_governance
   ```
   Se responder que não encontrou, a pessoa ainda não foi convidada: peça ao responsável pelo repositório e espere o convite ser aceito.
9. Baixar o repositório numa pasta de projetos:
   ```powershell
   New-Item -ItemType Directory -Force "$HOME\Projetos" | Out-Null
   Set-Location "$HOME\Projetos"
   gh repo clone PauloCK/test_base44_governance
   Set-Location test_base44_governance
   ```
10. Instalar as dependências do app:
    ```powershell
    npm install
    ```
11. Entrar no Base44. O comando abre o navegador; a pessoa entra com a própria conta:
    ```powershell
    base44 login
    base44 whoami
    ```
    O `whoami` deve mostrar o email da pessoa.
12. Obter o ID do app. O responsável pelo repositório deixa o ID disponível para quem faz o setup; peça a ele antes de começar, se ainda não tiver. Quem tem permissão no repositório também consegue ler:
    ```powershell
    gh variable get BASE44_APP_ID
    ```
    O ID não é segredo, mas nunca é escrito no código, nos workflows nem em arquivos que vão para o repositório. Ele só entra nos dois arquivos locais do passo 13.
13. Ligar a pasta ao app e criar o arquivo de configuração local, trocando `<ID>` pelo ID do passo 12:
    ```powershell
    base44 link --app-id <ID>
    Set-Content -Path .env.local -Value "VITE_BASE44_APP_ID=<ID>"
    ```
    Os dois arquivos criados (`base44/.app.jsonc` e `.env.local`) ficam só no computador e não vão para o repositório.
14. Testar o app local:
    ```powershell
    npm run dev:local
    ```
    Esperar aparecer o resumo "[dados-exemplo] carregado para ...". Abrir `http://localhost:5173` e entrar com o email mostrado pelo `base44 whoami` e qualquer senha.
15. Parar o app com Ctrl+C. O setup terminou. Para desenvolver, siga [DESENVOLVIMENTO.md](DESENVOLVIMENTO.md).

## Problemas comuns

| Sintoma | O que fazer |
| --- | --- |
| Comando "não reconhecido" logo depois de instalar | Fechar e abrir o terminal |
| `npm install -g base44` dá erro de permissão | Abrir o PowerShell como a própria pessoa (não como administrador) e repetir |
| Tela em branco no `localhost:5173` | Conferir se `.env.local` e `base44/.app.jsonc` existem (passo 13) |
| Login local recusado | Usar exatamente o email do `base44 whoami`; a senha pode ser qualquer uma |
| `gh repo clone` diz que não encontrou | Falta o convite ao repositório (passo 8) |
