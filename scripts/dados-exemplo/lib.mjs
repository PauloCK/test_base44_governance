// Funções comuns aos scripts de dados de exemplo (carga local e check do CI).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

export const PASTA_ENTIDADES = 'base44/entities';
export const PASTA_EXEMPLOS = 'base44/dados-exemplo';

// Campos de controle aceitos nos arquivos de exemplo. São removidos antes da carga.
//   _criado_por: "eu" (padrão) ou "outro". Serve para simular registros de outra pessoa
//   nas regras do tipo "só quem criou vê".
export const CAMPOS_DE_CONTROLE = ['_criado_por'];

// Marcador que vira o email de quem está rodando o servidor local.
export const MARCADOR_EU = '{{eu}}';

// Email fictício usado para simular "registro criado por outra pessoa".
export const EMAIL_OUTRO = 'outra.pessoa@exemplo.invalid';

// Lê JSON com comentários (formato .jsonc dos arquivos do Base44).
export function lerJsonc(texto) {
  let saida = '';
  let emString = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    const prox = texto[i + 1];
    if (emString) {
      saida += c;
      if (c === '\\') { saida += prox ?? ''; i++; continue; }
      if (c === '"') emString = false;
      continue;
    }
    if (c === '"') { emString = true; saida += c; continue; }
    if (c === '/' && prox === '/') { while (i < texto.length && texto[i] !== '\n') i++; saida += '\n'; continue; }
    if (c === '/' && prox === '*') { i += 2; while (i < texto.length && !(texto[i] === '*' && texto[i + 1] === '/')) i++; i++; continue; }
    saida += c;
  }
  // vírgula sobrando antes de } ou ]
  return JSON.parse(saida.replace(/,(\s*[}\]])/g, '$1'));
}

export function lerArquivoJsonc(caminho) {
  return lerJsonc(readFileSync(caminho, 'utf-8'));
}

// Lista as entidades do repo: [{ nome, arquivo, schema }]
export function lerEntidades(raiz = '.') {
  const pasta = join(raiz, PASTA_ENTIDADES);
  return readdirSync(pasta)
    .filter((f) => f.endsWith('.jsonc') || f.endsWith('.json'))
    .map((f) => {
      const schema = lerArquivoJsonc(join(pasta, f));
      return { nome: schema.name ?? basename(f).replace(/\.jsonc?$/, ''), arquivo: f, schema };
    });
}

export function caminhoExemplos(raiz, nomeEntidade) {
  return join(raiz, PASTA_EXEMPLOS, `${nomeEntidade}.json`);
}

export function lerExemplos(raiz, nomeEntidade) {
  const caminho = caminhoExemplos(raiz, nomeEntidade);
  if (!existsSync(caminho)) return null;
  return JSON.parse(readFileSync(caminho, 'utf-8'));
}

// Versão da entidade na main (o que está em produção). null se a entidade não existe na main.
export function entidadeNaMain(arquivo, ref = 'origin/main') {
  try {
    const texto = execFileSync('git', ['show', `${ref}:${PASTA_ENTIDADES}/${arquivo}`], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return lerJsonc(texto);
  } catch {
    return null;
  }
}

export function refExiste(ref = 'origin/main') {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', ref], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// ---------- Avaliação de RLS ----------
// Espelha as regras que o servidor local do Base44 aplica: user_condition, $or, $and, $nor,
// campos do registro (com ou sem "data."), {{user.campo}} e os operadores $in, $nin, $ne, $all.
// Qualquer coisa fora disso gera erro, para o filtro nunca adivinhar.

const OPERADORES = ['$in', '$nin', '$ne', '$all'];

function valorDoCampo(chave, origem) {
  return origem[chave.startsWith('data.') ? chave.slice(5) : chave];
}

function resolverModelo(valor, usuario) {
  return valor.replace(/\{\{user\.([\w.]+)\}\}/g, (_m, campo) => String(valorDoCampo(campo, usuario) ?? ''));
}

function avaliarOperador(valorRegistro, operador) {
  for (const [op, v] of Object.entries(operador)) {
    switch (op) {
      case '$in': if (!Array.isArray(v) || !v.includes(valorRegistro)) return false; break;
      case '$nin': if (!Array.isArray(v) || v.includes(valorRegistro)) return false; break;
      case '$ne': if (valorRegistro === v) return false; break;
      case '$all':
        if (!Array.isArray(valorRegistro) || !Array.isArray(v) || !v.every((x) => valorRegistro.includes(x))) return false;
        break;
      default: throw new Error(`operador de RLS não suportado pelo filtro: ${op}`);
    }
  }
  return true;
}

function avaliarCondicao(condicao, registro, usuario) {
  for (const [chave, valor] of Object.entries(condicao)) {
    if (chave === 'user_condition') {
      for (const [campo, esperado] of Object.entries(valor)) {
        const v = valorDoCampo(campo, usuario);
        if (typeof esperado === 'object' && esperado !== null) { if (!avaliarOperador(v, esperado)) return false; }
        else if (v !== esperado) return false;
      }
      continue;
    }
    if (chave === '$or') { if (!valor.some((c) => avaliarCondicao(c, registro, usuario))) return false; continue; }
    if (chave === '$and') { if (!valor.every((c) => avaliarCondicao(c, registro, usuario))) return false; continue; }
    if (chave === '$nor') { if (valor.some((c) => avaliarCondicao(c, registro, usuario))) return false; continue; }
    if (chave.startsWith('$')) throw new Error(`operador de RLS não suportado pelo filtro: ${chave}`);
    const v = valorDoCampo(chave, registro);
    const esperado = typeof valor === 'string' ? resolverModelo(valor, usuario) : valor;
    if (typeof esperado === 'object' && esperado !== null) { if (!avaliarOperador(v, esperado)) return false; }
    else if (v !== esperado) return false;
  }
  return true;
}

export function podeLer(regra, registro, usuario) {
  if (regra === undefined || regra === null || regra === '') return true;
  if (typeof regra === 'boolean') return regra;
  if (typeof regra === 'object' && Object.keys(regra).length === 0) return true;
  return avaliarCondicao(regra, registro, usuario);
}

// Prepara um registro de exemplo para quem está rodando o servidor local.
// Devolve { paraFiltro, paraCarga }: o primeiro tem created_by simulado, o segundo vai para o servidor.
export function prepararRegistro(registro, emailEu) {
  const trocar = (v) => (typeof v === 'string' ? v.split(MARCADOR_EU).join(emailEu) : v);
  const paraCarga = {};
  for (const [k, v] of Object.entries(registro)) {
    if (CAMPOS_DE_CONTROLE.includes(k)) continue;
    paraCarga[k] = Array.isArray(v) ? v.map(trocar) : trocar(v);
  }
  const criadoPor = registro._criado_por === 'outro' ? EMAIL_OUTRO : emailEu;
  return { paraFiltro: { ...paraCarga, created_by: criadoPor }, paraCarga };
}

// ---------- Validação dos arquivos de exemplo (usada no CI) ----------

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const DOMINIOS_FICTICIOS = /@(exemplo\.invalid|example\.(com|org|net)|[\w.-]+\.(invalid|test|example))$/i;

function tipoConfere(tipo, valor) {
  switch (tipo) {
    case 'string': return typeof valor === 'string';
    case 'number': return typeof valor === 'number';
    case 'integer': return Number.isInteger(valor);
    case 'boolean': return typeof valor === 'boolean';
    case 'array': return Array.isArray(valor);
    case 'object': return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
    default: return true;
  }
}

function conferirRegra(regra, caminho, erros) {
  if (regra === undefined || regra === null || typeof regra !== 'object') return;
  for (const [chave, valor] of Object.entries(regra)) {
    if (['$or', '$and', '$nor'].includes(chave)) { valor.forEach((c, i) => conferirRegra(c, `${caminho}.${chave}[${i}]`, erros)); continue; }
    if (chave.startsWith('$')) erros.push(`${caminho}: operador ${chave} não é suportado pelo filtro de dados de exemplo`);
    if (typeof valor === 'object' && valor !== null && chave !== 'user_condition') {
      for (const op of Object.keys(valor)) if (!OPERADORES.includes(op)) erros.push(`${caminho}.${chave}: operador ${op} não é suportado pelo filtro`);
    }
  }
}

// Confere uma entidade e seus exemplos. Devolve lista de erros (vazia se estiver tudo certo).
export function validarEntidade({ nome, schema }, exemplos) {
  const erros = [];
  const props = schema.properties ?? {};
  const obrigatorios = schema.required ?? [];

  for (const op of ['read', 'create', 'update', 'delete']) conferirRegra(schema.rls?.[op], `${nome}.rls.${op}`, erros);

  if (exemplos === null) {
    erros.push(`${nome}: falta o arquivo ${PASTA_EXEMPLOS}/${nome}.json`);
    return erros;
  }
  if (!Array.isArray(exemplos) || exemplos.length === 0) {
    erros.push(`${nome}: o arquivo de exemplos precisa ser uma lista com pelo menos 1 registro`);
    return erros;
  }

  const camposUsados = new Set();
  exemplos.forEach((reg, i) => {
    const onde = `${nome}[${i}]`;
    if (typeof reg !== 'object' || reg === null || Array.isArray(reg)) { erros.push(`${onde}: registro precisa ser um objeto`); return; }
    for (const campo of obrigatorios) if (!(campo in reg)) erros.push(`${onde}: falta o campo obrigatório "${campo}"`);
    for (const [campo, valor] of Object.entries(reg)) {
      if (CAMPOS_DE_CONTROLE.includes(campo)) {
        if (campo === '_criado_por' && !['eu', 'outro'].includes(valor)) erros.push(`${onde}: _criado_por precisa ser "eu" ou "outro"`);
        continue;
      }
      const def = props[campo];
      if (!def) { erros.push(`${onde}: campo "${campo}" não existe na entidade`); continue; }
      camposUsados.add(campo);
      if (!tipoConfere(def.type, valor)) erros.push(`${onde}: campo "${campo}" deveria ser ${def.type}`);
      if (Array.isArray(def.enum) && !def.enum.includes(valor)) erros.push(`${onde}: campo "${campo}" fora dos valores permitidos (${def.enum.join(', ')})`);
    }
    for (const email of JSON.stringify(reg).match(EMAIL) ?? []) {
      if (!DOMINIOS_FICTICIOS.test(email)) erros.push(`${onde}: o email ${email} não é de domínio fictício; use ${MARCADOR_EU} ou um endereço @exemplo.invalid`);
    }
  });
  for (const campo of Object.keys(props)) {
    if (!camposUsados.has(campo)) erros.push(`${nome}: nenhum exemplo usa o campo "${campo}"; inclua pelo menos um`);
  }
  return erros;
}
