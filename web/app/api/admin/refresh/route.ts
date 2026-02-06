import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAdmin } from '@/lib/auth';
import { runRefreshStatements, query } from '@/lib/db';
import { getRefreshSql, type RefreshAction } from '@/lib/refresh-sql';

const VALID_ACTIONS: RefreshAction[] = ['familia_cpf_visitas', 'folha_rf', 'geo', 'todas'];

// Geo refresh pode levar >30 min em bases grandes; 2h para evitar timeout
export const maxDuration = 7200;

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

    let geo_stats: { total_mv_familias_geo: number; total_mv_familias_geo_por_logradouro: number; total_com_territorio: number; total_familias_cadastro: number } | undefined;
    if (action === 'geo' && refreshed.length > 0) {
      try {
        const { rows } = await query<{ total_mv_familias_geo: string; total_mv_familias_geo_por_logradouro: string; total_com_territorio: string; total_familias_cadastro: string }>(`
          SELECT (SELECT COUNT(*) FROM mv_familias_geo) AS total_mv_familias_geo,
                 (SELECT COUNT(*) FROM mv_familias_geo_por_logradouro) AS total_mv_familias_geo_por_logradouro,
                 (SELECT COUNT(*) FROM vw_familias_territorio WHERE cep_territorio IS NOT NULL) AS total_com_territorio,
                 (SELECT COUNT(*) FROM mv_familias_limpa) AS total_familias_cadastro
        `);
        const r = rows[0];
        if (r) {
          geo_stats = {
            total_mv_familias_geo: Number(r.total_mv_familias_geo),
            total_mv_familias_geo_por_logradouro: Number(r.total_mv_familias_geo_por_logradouro),
            total_com_territorio: Number(r.total_com_territorio),
            total_familias_cadastro: Number(r.total_familias_cadastro),
          };
          message += ` Resultado: ${geo_stats.total_mv_familias_geo.toLocaleString('pt-BR')} match CEP+logradouro, ${geo_stats.total_mv_familias_geo_por_logradouro.toLocaleString('pt-BR')} só logradouro, ${geo_stats.total_com_territorio.toLocaleString('pt-BR')} com território.`;
        }
      } catch {
        // ignora se as views não existirem
      }
    }

    return NextResponse.json({
      ok: true,
      action,
      message,
      refreshed,
      skipped: skipped.length ? skipped : undefined,
      failed: failed.length ? failed : undefined,
      geo_stats,
    });
  } catch (e) {
    console.error('Refresh error:', e);
    const message = e instanceof Error ? e.message : 'Erro ao executar refresh.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
