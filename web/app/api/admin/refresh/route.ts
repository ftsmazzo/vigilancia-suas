import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAdmin } from '@/lib/auth';
import { runRefreshStatements } from '@/lib/db';
import { getRefreshSql, type RefreshAction } from '@/lib/refresh-sql';

const VALID_ACTIONS: RefreshAction[] = ['familia_cpf_visitas', 'folha_rf', 'geo', 'todas'];

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
    const { refreshed, failed, skipped } = await runRefreshStatements(statements);

    let message =
      action === 'todas'
        ? 'Refresh executado: Família/CPF/Visitas, Folha RF e Geo.'
        : action === 'geo'
          ? 'Refresh executado: match Geo (mv_familias_geo).'
          : `Refresh executado: ${action}.`;
    if (refreshed.length) message += ` Atualizadas: ${refreshed.join(', ')}.`;
    if (skipped.length) {
      message += ` Ignoradas (não existem ainda): ${skipped.join(', ')}. Use "Criar/recriar mv_familias_geo" na página Geolocalização.`;
    }
    if (failed.length) {
      message += ` Falharam: ${failed.map((f) => f.name).join(', ')}. Ver ESTRUTURA_BANCO_VIEWS.md → Restaurar views.`;
    }

    return NextResponse.json({
      ok: true,
      action,
      message,
      refreshed,
      skipped: skipped.length ? skipped : undefined,
      failed: failed.length ? failed : undefined,
    });
  } catch (e) {
    console.error('Refresh error:', e);
    const message = e instanceof Error ? e.message : 'Erro ao executar refresh.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
