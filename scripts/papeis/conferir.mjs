// Check do CI: base44/papeis.json bem formado (emails válidos e únicos, papéis que existem no app).
import { lerPapeis, validarPapeis, ARQUIVO_PAPEIS } from './lib.mjs';

const conteudo = lerPapeis();
if (!conteudo) {
  console.error(`Falta ${ARQUIVO_PAPEIS}.`);
  process.exit(1);
}
const { usuarios, erros } = validarPapeis(conteudo);
if (erros.length) {
  console.error(`${ARQUIVO_PAPEIS} com problema (${erros.length}):`);
  for (const e of erros) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`${ARQUIVO_PAPEIS} ok: ${usuarios.length} usuários.`);
