import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAdmin } from '@/lib/auth';
import { queryMultiple } from '@/lib/db';
import { buildCaduUpload } from '@/lib/upload-cadu';

export const dynamic = 'force-dynamic';

const WEBHOOK_CADU = process.env.WEBHOOK_EXTRACAO_CADU_URL;

async function sendToWebhook(content: string, fileName: string): Promise<{ ok: boolean; message?: string }> {
  if (!WEBHOOK_CADU?.trim()) return { ok: false };
  try {
    const blob = new Blob([content], { type: 'text/csv' });
    const formData = new FormData();
    formData.set('file', blob, fileName || 'cadu.csv');
    const res = await fetch(WEBHOOK_CADU, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `Webhook respondeu ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro de conexão';
    return { ok: false, message: msg };
  }
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!requireAdmin(user)) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

  let content: string;
  let file: File;
  try {
    const formData = await request.formData();
    const f = formData.get('file') as File | null;
    if (!f || !(f instanceof File)) {
      return NextResponse.json({ error: 'Envie um arquivo CSV do CADU (campo "file"). Delimitador: ponto e vírgula (;).' }, { status: 400 });
    }
    file = f;
    content = await file.text();
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao ler o arquivo.' }, { status: 400 });
  }

  const { createStatements, insertStatements, rowCount } = buildCaduUpload(content);
  if (rowCount === 0) {
    return NextResponse.json({ error: 'CSV sem dados (só cabeçalho ou vazio).' }, { status: 400 });
  }

  const webhookResult = await sendToWebhook(content, file.name || 'cadu.csv');
  if (!webhookResult.ok && webhookResult.message) {
    console.warn('Webhook CADU:', webhookResult.message);
  }

  try {
    const statements = [...createStatements, ...insertStatements];
    await queryMultiple(statements);
    const extra =
      WEBHOOK_CADU
        ? webhookResult.ok
          ? ' Cópia enviada ao webhook de extração.'
          : ` Webhook não enviado: ${webhookResult.message || 'URL não configurada'}.`
        : '';
    return NextResponse.json({
      message: `CADU: ${rowCount} registro(s) carregado(s). Tabela cadu_raw recriada.${extra}`,
      rowCount,
      webhookSent: webhookResult.ok,
      hint: 'Execute "Atualizar todas as views" na Manutenção e, se necessário, rode create_views_cadu.sql no banco para recriar vw_familias_limpa e vw_pessoas_limpa.',
    });
  } catch (e) {
    console.error('Upload cadu error:', e);
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Erro ao carregar CSV.',
    }, { status: 500 });
  }
}
