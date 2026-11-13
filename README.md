oie!! testando

# Teste Code First

App de teste de governança: código no GitHub como fonte da verdade, deploy no Base44 só pelo GitHub Actions.

## Desenvolvimento local

- **Setup inicial (uma vez por computador):** [docs/SETUP.md](docs/SETUP.md)
- **Como fazer uma mudança, do computador até produção:** [docs/DESENVOLVIMENTO.md](docs/DESENVOLVIMENTO.md)

Os dois estão em passo a passo numerado, para pessoas e para a IA que ajuda quem desenvolve.

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
