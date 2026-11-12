import { createClientFromRequest } from 'npm:@base44/sdk';

// Lê com service role, então só pode responder a admin: confere quem chamou antes de ler.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user || user.role !== 'admin') {
    return Response.json({ erro: 'proibido' }, { status: 403 });
  }
  const registros = await base44.asServiceRole.entities.TesteRLS.list();
  return Response.json({ usuario: user.email, titulos: registros.map((r) => r.titulo) });
});
