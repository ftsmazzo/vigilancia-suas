import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

const AWESOME_API = 'https://cep.awesomeapi.com.br/json';
const MAX_CEPS = 250;
const BATCH_SIZE = 5;
const DELAY_MS = 180;

function cepSoNumeros(cep: string | null): string {
  if (!cep) return '';
  return cep.replace(/\D/g, '').slice(0, 8);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Busca lat/lng na AwesomeAPI por CEP (georreferência por CEP, não pelo banco). */
async function geocodeCep(cep8: string): Promise<{ lat: number; lng: number } | null> {
  if (cep8.length < 8) return null;
  try {
    const res = await fetch(`${AWESOME_API}/${cep8}`, { method: 'GET', signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat?: string; lng?: string };
    const lat = data?.lat != null ? Number(data.lat) : NaN;
    const lng = data?.lng != null ? Number(data.lng) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  } catch {
    return null;
  }
}

/**
 * GET /api/data/ceps-mapa
 * Pontos para o mapa: um por CEP da tbl_ceps. Coordenadas vêm da AwesomeAPI (georreferência por CEP).
 * Query params: limite (default 500, máx 250), bairro (opcional).
 */
export async function GET(request: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limite = Math.min(Math.max(Number(searchParams.get('limite')) || 500, 1), MAX_CEPS);
  const bairro = searchParams.get('bairro')?.trim() || null;

  const sql = `
    SELECT DISTINCT ON (NULLIF(TRIM(cep), ''))
      cep,
      endereco,
      bairro
    FROM tbl_ceps
    WHERE cep IS NOT NULL AND TRIM(cep) != ''
    ${bairro ? 'AND TRIM(COALESCE(bairro, \'\')) = $2' : ''}
    ORDER BY NULLIF(TRIM(cep), ''), id
    LIMIT $1
  `;
  const params = bairro ? [limite, bairro] : [limite];

  let rows: { cep: string | null; endereco: string | null; bairro: string | null }[];
  try {
    const result = await query<{ cep: string | null; endereco: string | null; bairro: string | null }>(sql, params);
    rows = result.rows;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('does not exist') || msg.includes('não existe')) {
      return NextResponse.json({ pontos: [], total: 0, error: 'Tabela tbl_ceps não existe.' });
    }
    console.error('ceps-mapa', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const pontos: { cep: string; endereco: string; bairro: string; lat: number; lng: number }[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (r) => {
      const cep8 = cepSoNumeros(r.cep);
      if (cep8.length < 8 || seen.has(cep8)) return null;
      seen.add(cep8);
      const coords = await geocodeCep(cep8);
      if (!coords) return null;
      return {
        cep: (r.cep ?? '').trim() || cep8,
        endereco: (r.endereco ?? '').trim(),
        bairro: (r.bairro ?? '').trim(),
        lat: coords.lat,
        lng: coords.lng,
      };
    });
    const results = await Promise.all(promises);
    for (const p of results) {
      if (p) pontos.push(p);
    }
    if (i + BATCH_SIZE < rows.length) await sleep(DELAY_MS);
  }

  return NextResponse.json({ pontos, total: pontos.length });
}
