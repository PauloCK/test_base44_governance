# AGENTS.md

## Regras deste repositório (leia antes de qualquer mudança)

Este app é gerenciado pelo GitHub. Toda mudança entra por PR aprovado e é publicada automaticamente depois do merge.

1. Para preparar um computador novo, siga `docs/SETUP.md`, passo a passo.
2. Para qualquer mudança no app (telas, entidades, regras de acesso, funções, papéis de usuários), siga `docs/DESENVOLVIMENTO.md`, passo a passo.
3. Nunca envie direto para a `main`, nunca rode `base44 deploy` e nunca mude o app pelo editor do Base44 ou pelo conector do Base44.
4. Nunca use dados de produção para testar; o app local (`npm run dev:local`) usa só `base44/dados-exemplo/`.
5. Nunca peça nem escreva senhas, chaves ou tokens no chat, no código ou nos dados de exemplo. Logins são feitos pela pessoa, no navegador.
6. Mostre o resultado no app local e confirme com a pessoa antes de abrir o PR.

## Project Context

This is a Base44 app repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Base44 References

- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md

If your agent supports Agent Skills, install or update Base44 skills before Base44-specific work:

```bash
npx skills add base44/skills
```

## Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client.
- `vite.config.js`: Vite config and Base44 Vite plugin setup.
- `.env.local`: local-only environment values; never commit secrets.

## Working Notes

- Use `npm run dev:local` (it wraps `base44 dev` and loads the example data) as the default local development command.
- When docs or code mention the frontend being started automatically, that usually means the Base44 project config includes `site.serveCommand`, for example `"serveCommand": "npm run dev"` in `base44/config.jsonc`.
- Do not use `npm run dev` against the hosted Base44 backend: development uses only the local backend and example data.
- Prefer the existing Base44 CLI workflow over adding new npm scripts for Base44-specific tasks.
- Reuse the existing SDK client and Vite plugin patterns before adding new Base44 integration paths.
- Run the relevant checks from `package.json` before finishing code changes.
