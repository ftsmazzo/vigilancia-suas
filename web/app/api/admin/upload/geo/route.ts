import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAdmin } from '@/lib/auth';
import { queryMultiple } from '@/lib/db';
import { buildGeoUpload } from '@/lib/upload-geo';

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
      return NextResponse.json({ error: 'Envie um arquivo CSV do Geo (campo "file"). Delimitador: vírgula, cabeçalho: endereco, bairro, cep, id_endereco, id_cidade, id_bairro, lat_char, long_char, lat_num, long_num, cras, creas.' }, { status: 400 });
    }
    content = await file.text();
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao ler o arquivo.' }, { status: 400 });
  }

  const { truncateSql, insertStatements, updateCepNormSql, rowCount } = buildGeoUpload(content);
  if (rowCount === 0) {
    return NextResponse.json({ error: 'CSV sem dados válidos (só cabeçalho ou linhas sem endereço/CEP).' }, { status: 400 });
  }

  try {
    const statements = [truncateSql, ...insertStatements, updateCepNormSql];
    await queryMultiple(statements);
    return NextResponse.json({
      message: `Geo: ${rowCount} registro(s) carregado(s). Tabela tbl_geo atualizada. cep_norm preenchido.`,
      rowCount,
      hint: 'Se usar vw_familias_geo, execute create_geo_match.sql no banco (uma vez) e as consultas já usarão os dados.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('tbl_geo') && (msg.includes('does not exist') || msg.includes('não existe'))) {
      return NextResponse.json({
        error: 'Tabela tbl_geo não existe. Execute create_tbl_geo.sql no banco (PGAdmin) primeiro.',
      }, { status: 400 });
    }
    console.error('Upload geo error:', e);
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Erro ao carregar CSV.',
    }, { status: 500 });
  }
}
