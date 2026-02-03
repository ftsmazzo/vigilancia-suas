import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword, createToken, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const { rows } = await query<{
      id: number;
      email: string;
      password_hash: string;
      name: string | null;
      role: string;
    }>(
      'SELECT id, email, password_hash, name, role FROM app.users WHERE email = $1',
      [String(email).trim().toLowerCase()]
    );

    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json(
        { error: 'E-mail ou senha inválidos.' },
        { status: 401 }
      );
    }

    const token = await createToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'consult' | 'admin',
    });
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (e) {
    console.error('Login error:', e);
    return NextResponse.json(
      { error: 'Erro ao fazer login.' },
      { status: 500 }
    );
  }
}
