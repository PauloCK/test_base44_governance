# Como desenvolver no app

Como fazer uma mudança no app, do computador até produção. Pré-requisito: o [setup inicial](SETUP.md) feito.

Escrito para ser seguido por uma pessoa ou pela IA dela. A IA executa os passos e mostra o resultado; a pessoa decide o que mudar e aprova os comandos.

## Regras

1. Toda mudança entra por PR. Nunca enviar direto para a `main` (o GitHub recusa).
2. Nunca publicar pelo computador (`base44 deploy`) nem mudar o app pelo editor do Base44 ou pelo conector do Base44. A publicação acontece sozinha depois que o PR é aprovado e mergeado.
3. Dados de produção não são usados para testar. O app local usa só os dados fictícios de `base44/dados-exemplo/`.
4. Dados de exemplo nunca contêm dados reais: nomes, valores e emails inventados (emails `@exemplo.invalid`).
5. Acesso de usuários só se dá mudando `base44/papeis.json` por PR. Nunca pelo painel do Base44.
6. Não aprovar nem mergear o próprio PR sem a aprovação de quem é responsável pela área (veja `.github/CODEOWNERS`).
7. Senhas, chaves e tokens nunca entram no código, no chat ou nos dados de exemplo.

## Onde fica cada coisa

| O que mudar | Onde |
| --- | --- |
| Telas | `src/pages/` e `src/components/` |
| Tabelas (entidades) e regras de acesso (RLS e FLS) | `base44/entities/` |
| Funções do servidor | `base44/functions/` |
| Dados fictícios para testar | `base44/dados-exemplo/` (um arquivo por entidade) |
| Quem tem qual papel | `base44/papeis.json` |
| Quem aprova cada área | `.github/CODEOWNERS` |

## Passo a passo de uma mudança

1. Ir para a pasta do repositório e atualizar a `main`:
   ```powershell
   Set-Location "$HOME\Projetos\test_base44_governance"
   git switch main
   git pull
   npm install
   ```
2. Criar uma branch com um nome curto que descreva a mudança:
   ```powershell
   git switch -c ajuste-titulo-inicio
   ```
3. Subir o app local, num terminal separado, e deixar rodando:
   ```powershell
   npm run dev:local
   ```
   Para ver o app como outro papel veria: `npm run dev:local -- --papel <papel>`.
4. Abrir `http://localhost:5173` e entrar com o email do `base44 whoami` e qualquer senha.
5. Fazer a mudança nos arquivos (tabela "Onde fica cada coisa"). O app local atualiza sozinho; funções e regras também valem na hora.
6. Mostrar o resultado no app local e confirmar com a pessoa que é isso que ela quer.
7. Se mudou uma entidade (campo novo, tabela nova), atualizar os dados de exemplo dela e conferir:
   ```powershell
   npm run dados-exemplo:conferir
   ```
   Se o servidor local estiver rodando, recarregar os dados: `npm run dados-exemplo`.
8. Se mudou `base44/papeis.json`, conferir:
   ```powershell
   npm run papeis:conferir
   ```
9. Conferir que o app compila:
   ```powershell
   npm run build
   ```
10. Registrar a mudança, com uma mensagem que diga o que mudou:
    ```powershell
    git add -A
    git status
    git commit -m "Ajusta o título da tela inicial"
    ```
    Antes do commit, conferir no `git status` que não entrou nenhum arquivo de configuração local (`.env.local`, `base44/.app.jsonc`).
11. Enviar a branch e abrir o PR, explicando o que mudou e por quê:
    ```powershell
    git push -u origin HEAD
    gh pr create --base main --title "Ajusta o título da tela inicial" --body "O que mudou e por quê, em poucas linhas."
    ```
12. Ver quem precisa aprovar e avisar essa pessoa com o link do PR:
    ```powershell
    gh pr view --web
    ```
    O GitHub mostra os responsáveis pedidos. O CI roda sozinho e precisa ficar verde.
13. Esperar a aprovação. Se o responsável pedir ajustes, voltar ao passo 5 na mesma branch; cada novo `git push` atualiza o PR.
14. Depois de aprovado, fazer o merge:
    ```powershell
    gh pr merge --merge --delete-branch
    ```
15. Acompanhar a publicação automática (leva de 2 a 3 minutos):
    ```powershell
    gh run watch
    ```
    Ela desliga a proteção do Base44, publica, aplica os papéis e religa a proteção.
16. Conferir a mudança no app em produção (recarregar com Ctrl+F5) e voltar para a `main`:
    ```powershell
    git switch main
    git pull
    ```

## Casos específicos

### Dar, trocar ou tirar acesso de alguém

1. Seguir os passos 1 e 2.
2. Em `base44/papeis.json`, acrescentar ou mudar a linha da pessoa (`email` e `papel`). O papel precisa existir na lista de papéis da entidade `User`.
3. Seguir os passos 8 a 16. Quem aprova acessos está no `.github/CODEOWNERS`.

### Tabela nova ou campo novo

1. Criar ou mudar o arquivo em `base44/entities/`.
2. Criar ou atualizar o arquivo da entidade em `base44/dados-exemplo/`, com pelo menos um registro e usando todos os campos.
3. Seguir a partir do passo 7. Mudanças em entidades e regras de acesso precisam de aprovação do responsável por `base44/`.

## Limites do app local

1. No app local só existem os papéis `admin` e `user`. Regras de acesso de outros papéis só podem ser vistas funcionando depois da publicação.
2. Buscas com objeto de opções (por exemplo `filter(query, { sort, limit })` ou `list({ limit })`) e atualização em lote (`bulkUpdate`) não funcionam no app local. Usar a forma com argumentos soltos, que faz o mesmo: `filter(query, '-created_date', 50)` ou `list('-created_date', 50)`.
3. Mudar o schema de uma entidade apaga os dados locais dela. Recarregar com `npm run dados-exemplo`.
4. Entidades que ninguém pode criar (por exemplo um log de auditoria) ficam sem dados de exemplo no local.

## Se algo der errado

| Sintoma | O que fazer |
| --- | --- |
| `git push` recusado com "Changes must be made through a pull request" | Enviar a branch (`git push -u origin HEAD`) em vez da `main` |
| CI vermelho no PR | Abrir os detalhes do check, corrigir na mesma branch e enviar de novo |
| Merge bloqueado | Falta a aprovação do responsável, ou entrou um commit depois da aprovação |
| Publicação falhou | Avisar o responsável pelo repositório; não tentar publicar pelo computador |
| Tela vazia no local com dados no servidor | Ver o item 2 de "Limites do app local" |
