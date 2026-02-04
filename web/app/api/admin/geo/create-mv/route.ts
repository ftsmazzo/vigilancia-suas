import { NextResponse } from 'next/server';
import { getSession, requireAdmin } from '@/lib/auth';
import { runCreateGeoMv } from '@/lib/geo-create-mv';

export const maxDuration = 600;

export async function POST() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
  }

  try {
    const result = await runCreateGeoMv();
    if (result.ok) {
      return NextResponse.json({
        ok: true,
        message: 'mv_familias_geo criada/recriada com sucesso. Use "Atualizar match Geo" após novos uploads de CADU ou Geo.',
      });
    }
    return NextResponse.json({ error: result.error }, { status: 500 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao criar mv_familias_geo.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
