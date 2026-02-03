import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

/**
 * Cria usuário admin ou consult (via SEED_SECRET).
 * POST /api/admin/seed com body: { "secret": "SEED_SECRET", "email": "...", "password": "...", "role": "admin"|"consult", "name": "..." }
 * role opcional; padrão "admin".
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SEED_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'SEED_SECRET não configurado. Ignorando seed.' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    if (body.secret !== secret) {
      return NextResponse.json({ error: 'Secret inválido.' }, { status: 403 });
    }
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password;
    if (!email || !password) {
      return NextResponse.json(
        { error: 'email e password são obrigatórios.' },
        { status: 400 }
      );
    }

    const role = body.role === 'consult' ? 'consult' : 'admin';

    const { rows: existing } = await query(
      'SELECT id FROM app.users WHERE email = $1',
      [email]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { message: 'Usuário já existe.', email },
        { status: 200 }
      );
    }

    const password_hash = await hashPassword(password);
    const name = body.name || (role === 'admin' ? 'Administrador' : 'Consulta');
    await query(
      `INSERT INTO app.users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)`,
      [email, password_hash, name, role]
    );

    return NextResponse.json({
      message: `Usuário ${role === 'admin' ? 'admin' : 'consulta'} criado.`,
      email,
      role,
    });
  } catch (e) {
    console.error('Seed error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao criar usuário.' },
      { status: 500 }
    );
  }
}
