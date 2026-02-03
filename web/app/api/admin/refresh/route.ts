import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAdmin } from '@/lib/auth';
import { queryMultiple } from '@/lib/db';
import { getRefreshSql, type RefreshAction } from '@/lib/refresh-sql';

const VALID_ACTIONS: RefreshAction[] = ['familia_cpf_visitas', 'folha_rf', 'todas'];

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = (body.action as string) || '';
    if (!VALID_ACTIONS.includes(action as RefreshAction)) {
      return NextResponse.json(
        { error: `Ação inválida. Use: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const statements = getRefreshSql(action as RefreshAction);
    await queryMultiple(statements);

    const message =
      action === 'todas'
        ? 'Refresh executado: Família/CPF/Visitas e Folha RF.'
        : `Refresh executado: ${action}.`;
    return NextResponse.json({
      ok: true,
      action,
      message,
    });
  } catch (e) {
    console.error('Refresh error:', e);
    const message = e instanceof Error ? e.message : 'Erro ao executar refresh.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
