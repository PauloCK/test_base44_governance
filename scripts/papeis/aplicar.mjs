// Aplica base44/papeis.json em produção. Roda no workflow de deploy.
//
// Uso: node scripts/papeis/aplicar.mjs [--simular]
// Variáveis: BASE44_APP_ID e BASE44_TOKEN (token de quem administra o app).
//
// Para cada pessoa do arquivo:
//   - já está no app com outro papel: troca o papel;
//   - ainda não está no app: libera o acesso já com o papel (provisionamento, sem enviar convite).
// Quem está no app e não está no arquivo não é alterado; aparece como aviso.
import { lerPapeis, validarPapeis, mascarar, ARQUIVO_PAPEIS } from './lib.mjs';

const API = 'https://app.base44.com/api/apps';
const simular = process.argv.includes('--simular');
const appId = process.env.BASE44_APP_ID;
const token = process.env.BASE44_TOKEN;

function sair(msg) {
  console.log(`::error::papéis: ${msg}`);
  process.exit(1);
}

async function chamar(metodo, caminho, corpo) {
  const r = await fetch(`${API}/${appId}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await r.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* resposta sem JSON */ }
  return { status: r.status, json, texto };
}

async function principal() {
  if (!appId || !token) sair('faltam BASE44_APP_ID ou BASE44_TOKEN');
  const conteudo = lerPapeis();
  if (!conteudo) sair(`não achei ${ARQUIVO_PAPEIS}`);
  const { usuarios, erros } = validarPapeis(conteudo);
  if (erros.length) sair(erros.join(' | '));

  const lista = await chamar('GET', '/entities/User?fields=email,role&limit=10000');
  if (lista.status !== 200 || !Array.isArray(lista.json)) sair(`não consegui listar os usuários (HTTP ${lista.status})`);
  const noApp = new Map(lista.json.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u]));

  const feito = { trocados: 0, liberados: 0, iguais: 0, falhas: 0 };
  for (const { email, papel, nome } of usuarios) {
    const atual = noApp.get(email);
    if (atual && atual.role === papel) { feito.iguais++; continue; }
    if (atual) {
      console.log(`::notice::papéis: ${mascarar(email)} ${atual.role} -> ${papel}${simular ? ' (simulado)' : ''}`);
      if (simular) continue;
      const r = await chamar('PUT', `/entities/User/${atual.id}`, { role: papel });
      if (r.status === 200 && r.json?.role === papel) feito.trocados++;
      else { feito.falhas++; console.log(`::error::papéis: falha ao trocar o papel de ${mascarar(email)} (HTTP ${r.status}, papel resultante ${r.json?.role ?? '?'})`); }
      continue;
    }
    console.log(`::notice::papéis: ${mascarar(email)} liberado como ${papel}${simular ? ' (simulado)' : ''}`);
    if (simular) continue;
    const r = await chamar('POST', '/users/provisions', { email, role: papel, ...(nome ? { full_name: nome } : {}) });
    if (r.status >= 200 && r.status < 300) {
      feito.liberados++;
      if (r.json?.status === 'exists' && r.json?.role !== papel) {
        console.log(`::warning::papéis: ${mascarar(email)} já tinha acesso pendente como ${r.json.role}; o papel ${papel} só vale depois do primeiro login e do próximo deploy`);
      }
    } else { feito.falhas++; console.log(`::error::papéis: falha ao liberar ${mascarar(email)} (HTTP ${r.status})`); }
  }

  const doArquivo = new Set(usuarios.map((u) => u.email));
  const fora = [...noApp.keys()].filter((e) => !doArquivo.has(e));
  for (const email of fora) {
    console.log(`::warning::papéis: ${mascarar(email)} está no app como ${noApp.get(email).role} mas não está em ${ARQUIVO_PAPEIS}`);
  }
  console.log(`::notice::papéis: ${feito.trocados} trocados, ${feito.liberados} liberados, ${feito.iguais} sem mudança, ${fora.length} fora do arquivo, ${feito.falhas} falhas${simular ? ' (simulação)' : ''}`);
  if (feito.falhas) process.exit(1);
}

principal().catch((e) => sair(e.message));
