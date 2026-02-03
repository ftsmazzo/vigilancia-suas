import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAdmin, hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/admin/users – Lista usuários (admin apenas).
 */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!requireAdmin(user)) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

  try {
    const { rows } = await query<{ id: number; email: string; name: string | null; role: string; created_at: string }>(
      'SELECT id, email, name, role, created_at FROM app.users ORDER BY role, email'
    );
    return NextResponse.json({ users: rows });
  } catch (e) {
    console.error('List users error:', e);
    return NextResponse.json({ error: 'Erro ao listar usuários.' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users – Cria usuário consulta (admin apenas).
 * body: { email, password, name? }
 */
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!requireAdmin(user)) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password;
    const name = (body.name || '').trim() || 'Consulta';

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const { rows: existing } = await query('SELECT id FROM app.users WHERE email = $1', [email]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Já existe um usuário com este e-mail.' }, { status: 400 });
    }

    const password_hash = await hashPassword(password);
    await query(
      `INSERT INTO app.users (email, password_hash, name, role) VALUES ($1, $2, $3, 'consult')`,
      [email, password_hash, name]
    );

    const { rows: created } = await query<{ id: number; email: string; name: string | null; role: string }>(
      'SELECT id, email, name, role FROM app.users WHERE email = $1',
      [email]
    );
    return NextResponse.json({ message: 'Usuário consulta criado.', user: created[0] });
  } catch (e) {
    console.error('Create user error:', e);
    return NextResponse.json({ error: 'Erro ao criar usuário.' }, { status: 500 });
  }
}
