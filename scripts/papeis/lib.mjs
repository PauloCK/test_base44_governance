// Leitura e validação do arquivo de papéis (base44/papeis.json).
import { readFileSync, existsSync } from 'node:fs';
import { lerEntidades } from '../dados-exemplo/lib.mjs';

export const ARQUIVO_PAPEIS = 'base44/papeis.json';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function papeisDoApp() {
  const user = lerEntidades().find((e) => e.nome === 'User');
  return user?.schema?.properties?.role?.enum ?? ['admin', 'user'];
}

export function lerPapeis() {
  if (!existsSync(ARQUIVO_PAPEIS)) return null;
  return JSON.parse(readFileSync(ARQUIVO_PAPEIS, 'utf-8'));
}

// Devolve { usuarios, erros }. Emails sempre em minúsculas.
export function validarPapeis(conteudo, permitidos = papeisDoApp()) {
  const erros = [];
  if (!conteudo || !Array.isArray(conteudo.usuarios)) {
    return { usuarios: [], erros: [`${ARQUIVO_PAPEIS} precisa ter a lista "usuarios"`] };
  }
  const vistos = new Set();
  const usuarios = [];
  conteudo.usuarios.forEach((u, i) => {
    const onde = `usuarios[${i}]`;
    if (typeof u !== 'object' || u === null) { erros.push(`${onde}: precisa ser um objeto`); return; }
    const extras = Object.keys(u).filter((k) => !['email', 'papel', 'nome'].includes(k));
    if (extras.length) erros.push(`${onde}: campos desconhecidos: ${extras.join(', ')}`);
    const email = typeof u.email === 'string' ? u.email.trim().toLowerCase() : '';
    if (!EMAIL.test(email)) { erros.push(`${onde}: email inválido`); return; }
    if (vistos.has(email)) erros.push(`${onde}: email repetido (${email})`);
    vistos.add(email);
    if (!permitidos.includes(u.papel)) erros.push(`${onde}: papel "${u.papel}" não existe. Papéis do app: ${permitidos.join(', ')}`);
    if (u.nome !== undefined && typeof u.nome !== 'string') erros.push(`${onde}: nome precisa ser texto`);
    usuarios.push({ email, papel: u.papel, nome: u.nome });
  });
  return { usuarios, erros };
}

// Para logs: mostra só o começo do email.
export function mascarar(email) {
  const [nome, dominio] = email.split('@');
  return `${nome.slice(0, 2)}***@${dominio}`;
}
