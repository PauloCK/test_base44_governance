// Sobe o `base44 dev` e carrega os dados de exemplo no servidor local.
//
// Uso:
//   npm run dev:local                      sobe o servidor e carrega os dados como admin
//   npm run dev:local -- --papel rh        carrega só o que o papel rh veria em produção
//   npm run dados-exemplo -- --papel pd    recarrega os dados com o servidor já no ar
//
// O papel padrão pode ficar no .env.local:  PAPEL_LOCAL=rh
//
// Regras do filtro:
//   - entidade que ainda não existe na main (nova na sua branch): carrega todos os exemplos;
//   - entidade que já existe na main: carrega só o que o papel escolhido leria em produção,
//     usando a regra de leitura da main.
// Os dados vêm só de base44/dados-exemplo/ e vão só para o servidor local. Nada é lido de produção.
import { spawn, execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import {
  lerEntidades, lerExemplos, lerArquivoJsonc, entidadeNaMain, refExiste, podeLer, prepararRegistro,
} from './lib.mjs';

const REF_PRODUCAO = 'origin/main';
const SENHA_LOCAL = 'senha-local-dev'; // o servidor local aceita qualquer senha para a conta de desenvolvedor

function argumento(nome) {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function lerEnvLocal() {
  if (!existsSync('.env.local')) return {};
  const env = {};
  for (const linha of readFileSync('.env.local', 'utf-8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const semCor = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

function falhar(msg) {
  console.error(`\n[dados-exemplo] ${msg}`);
  process.exit(1);
}

function idDoApp() {
  if (!existsSync('base44/.app.jsonc')) falhar('não achei base44/.app.jsonc. Rode `base44 link` na pasta do projeto.');
  const { id } = lerArquivoJsonc('base44/.app.jsonc');
  if (!id) falhar('base44/.app.jsonc não tem o id do app.');
  return id;
}

function emailDoDesenvolvedor() {
  let saida = '';
  try {
    saida = semCor(execSync('base44 whoami', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }));
  } catch (e) {
    falhar(`não consegui rodar \`base44 whoami\`. Faça \`base44 login\` antes.\n${e.stderr ?? ''}`);
  }
  const m = saida.match(/Logged in as:\s*([^\s]+@[^\s]+)/);
  if (!m) falhar(`não achei o email na saída do \`base44 whoami\`:\n${saida}`);
  return m[1];
}

function papelEscolhido() {
  const papel = argumento('papel') ?? lerEnvLocal().PAPEL_LOCAL ?? 'admin';
  const user = lerEntidades().find((e) => e.nome === 'User');
  const permitidos = user?.schema?.properties?.role?.enum ?? ['admin', 'user'];
  if (!permitidos.includes(papel)) falhar(`papel "${papel}" não existe. Papéis do app: ${permitidos.join(', ')}`);
  return papel;
}

async function chamar(base, appId, token, metodo, caminho, corpo) {
  const r = await fetch(`${base}/api/apps/${appId}${caminho}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      'Base44-App-Id': appId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await r.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* resposta sem JSON */ }
  return { status: r.status, json, texto };
}

export async function carregar({ porta, appId, email, papel }) {
  const base = `http://localhost:${porta}`;
  const login = await chamar(base, appId, null, 'POST', '/auth/login', { email, password: SENHA_LOCAL });
  if (!login.json?.access_token) falhar(`login local falhou (${login.status}): ${login.texto.slice(0, 200)}`);
  const token = login.json.access_token;

  const temMain = refExiste(REF_PRODUCAO);
  if (!temMain) {
    console.warn(`[dados-exemplo] aviso: não achei ${REF_PRODUCAO}. Rode \`git fetch\`. Sem ela, uso as regras da sua branch e trato toda entidade como já existente.`);
  }

  const usuario = { email, role: papel };
  const resumo = [];
  for (const entidade of lerEntidades().filter((e) => e.nome !== 'User')) {
    const exemplos = lerExemplos('.', entidade.nome);
    if (!exemplos) { resumo.push([entidade.nome, '-', 'sem arquivo de exemplos']); continue; }

    const naMain = temMain ? entidadeNaMain(entidade.arquivo, REF_PRODUCAO) : entidade.schema;
    const nova = temMain && naMain === null;
    const regraLeitura = nova ? undefined : naMain.rls?.read;

    const escolhidos = exemplos
      .map((r) => prepararRegistro(r, email))
      .filter(({ paraFiltro }) => nova || podeLer(regraLeitura, paraFiltro, usuario));

    const apagar = await chamar(base, appId, token, 'DELETE', `/entities/${entidade.nome}`, {});
    if (apagar.status >= 300) { resumo.push([entidade.nome, 0, `não consegui limpar (${apagar.status})`]); continue; }

    let ok = 0;
    const falhas = new Set();
    for (const { paraCarga } of escolhidos) {
      const r = await chamar(base, appId, token, 'POST', `/entities/${entidade.nome}`, paraCarga);
      if (r.status === 201) ok++;
      else falhas.add(`${r.status} ${r.texto.slice(0, 120)}`);
    }
    const obs = [nova ? 'entidade nova: todos os exemplos' : `regra da main para ${papel}`];
    if (falhas.size) obs.push(`falhou: ${[...falhas].join(' | ')}`);
    resumo.push([entidade.nome, `${ok}/${exemplos.length}`, obs.join('; ')]);
  }

  console.log(`\n[dados-exemplo] carregado para ${email} simulando o papel "${papel}":`);
  for (const [nome, qtd, obs] of resumo) console.log(`  ${nome.padEnd(20)} ${String(qtd).padEnd(7)} ${obs}`);
  if (papel !== 'admin') {
    console.log('  Lembrete: no servidor local você continua admin. Só os dados carregados seguem o papel escolhido.');
  }
  console.log('  Para recarregar com o servidor no ar: npm run dados-exemplo -- --papel <papel>\n');
}

async function principal() {
  const appId = idDoApp();
  const papel = papelEscolhido();
  const email = emailDoDesenvolvedor();
  const porta = Number(argumento('porta') ?? 4400);

  if (process.argv.includes('--so-carregar')) {
    await carregar({ porta, appId, email, papel });
    return;
  }

  const filho = spawn('base44 dev', { shell: true, stdio: ['inherit', 'pipe', 'pipe'] });
  let carregado = false;
  const observar = (pedaco, destino) => {
    destino.write(pedaco);
    if (carregado) return;
    const m = semCor(pedaco.toString()).match(/Backend running on http:\/\/localhost:(\d+)/);
    if (m) {
      carregado = true;
      carregar({ porta: Number(m[1]), appId, email, papel }).catch((e) => console.error('[dados-exemplo] erro na carga:', e));
    }
  };
  filho.stdout.on('data', (p) => observar(p, process.stdout));
  filho.stderr.on('data', (p) => observar(p, process.stderr));
  filho.on('exit', (codigo) => process.exit(codigo ?? 0));
  process.on('SIGINT', () => filho.kill('SIGINT'));
}

principal().catch((e) => falhar(e.stack ?? String(e)));
