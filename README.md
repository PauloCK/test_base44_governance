# Teste Code First

App de teste de governança: código no GitHub como fonte da verdade, deploy no Base44 só pelo GitHub Actions.

## Desenvolvimento local

Setup, uma vez por máquina:

1. Instalar Node 22, Deno, Git e o Base44 CLI (`npm install -g base44`).
2. Clonar o repo e rodar `npm install`.
3. `base44 login` com a sua conta. Não precisa ser colaborador do app.
4. `base44 link` para criar o `base44/.app.jsonc`, e criar o `.env.local` com `VITE_BASE44_APP_ID`. Nenhum dos dois vai para o repo.

No dia a dia:

```
git pull
npm run dev:local                  # sobe o servidor local e carrega os dados de exemplo como admin
npm run dev:local -- --papel rh    # carrega só o que o papel rh veria em produção
```

Abra `http://localhost:5173` e entre com o email do `base44 login` e qualquer senha. Tudo roda na sua máquina: nada é lido nem gravado em produção.

### Dados de exemplo

- Ficam em `base44/dados-exemplo/<Entidade>.json`, um arquivo por entidade, só com dados fictícios.
- `{{eu}}` vira o seu email. `"_criado_por": "outro"` simula um registro criado por outra pessoa.
- Emails precisam ser de domínio fictício (`@exemplo.invalid`).
- Entidade nova na sua branch: todos os exemplos são carregados. Entidade que já existe na main: só o que o papel escolhido leria em produção.
- O servidor local apaga os dados de uma entidade quando o schema dela muda. Para recarregar sem reiniciar: `npm run dados-exemplo -- --papel <papel>`.
- O CI confere que toda entidade tem exemplos, com os campos obrigatórios, tipos e valores permitidos certos, e que todo campo aparece em pelo menos um exemplo.

## Papéis dos usuários

Quem tem qual papel fica em `base44/papeis.json`, e mudar esse arquivo por PR é o jeito oficial de dar, trocar ou liberar acesso. Não use o painel do Base44 para isso.

- A cada deploy, o workflow reaplica o arquivo em produção: troca o papel de quem está diferente e libera o acesso de quem ainda não entrou no app, já com o papel certo e sem enviar convite.
- Quem está no app e não está no arquivo não é alterado. Aparece como aviso no log do deploy.
- Uma mudança feita pelo painel vale só até o próximo deploy.
- O CI confere se os emails são válidos e únicos e se os papéis existem no app.
- No desenvolvimento local, o `npm run dev:local` usa o seu papel deste arquivo, na versão da main, se você não passar `--papel`.
