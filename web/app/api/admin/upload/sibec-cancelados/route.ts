import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAdmin } from '@/lib/auth';
import { queryMultiple } from '@/lib/db';
import { buildSibecUpload, SIBEC_CANCELADOS } from '@/lib/upload-sibec';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!requireAdmin(user)) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

  let content: string;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Envie um arquivo CSV (campo "file").' }, { status: 400 });
    }
    content = await file.text();
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao ler o arquivo.' }, { status: 400 });
  }

  const { truncateSql, insertStatements, rowCount } = buildSibecUpload(content, SIBEC_CANCELADOS);
  if (rowCount === 0) {
    return NextResponse.json({ error: 'CSV sem dados (só cabeçalho ou vazio).' }, { status: 400 });
  }

  try {
    const statements = [truncateSql, ...insertStatements];
    await queryMultiple(statements);
    return NextResponse.json({
      message: `SIBEC Cancelados: ${rowCount} registro(s) carregado(s).`,
      rowCount,
      hint: 'Clique em "Atualizar todas as views" na Manutenção para repopular as consultas.',
    });
  } catch (e) {
    console.error('Upload sibec-cancelados error:', e);
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Erro ao carregar CSV.',
    }, { status: 500 });
  }
}
