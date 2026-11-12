// Check do CI: toda entidade (menos User) precisa de dados de exemplo válidos.
// Uso: node scripts/dados-exemplo/conferir.mjs
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { lerEntidades, lerExemplos, validarEntidade, PASTA_EXEMPLOS } from './lib.mjs';

const raiz = '.';
const entidades = lerEntidades(raiz).filter((e) => e.nome !== 'User');
const erros = [];

for (const entidade of entidades) {
  let exemplos;
  try {
    exemplos = lerExemplos(raiz, entidade.nome);
  } catch (e) {
    erros.push(`${entidade.nome}: arquivo de exemplos não é JSON válido (${e.message})`);
    continue;
  }
  erros.push(...validarEntidade(entidade, exemplos));
}

const pasta = join(raiz, PASTA_EXEMPLOS);
if (existsSync(pasta)) {
  const nomes = new Set(entidades.map((e) => e.nome));
  for (const f of readdirSync(pasta).filter((f) => f.endsWith('.json'))) {
    const nome = f.replace(/\.json$/, '');
    if (!nomes.has(nome)) erros.push(`${PASTA_EXEMPLOS}/${f}: não existe entidade ${nome}`);
  }
}

if (erros.length) {
  console.error(`Dados de exemplo com problema (${erros.length}):`);
  for (const e of erros) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`Dados de exemplo ok para ${entidades.length} entidades.`);
