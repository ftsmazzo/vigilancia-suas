import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * DELETE /api/admin/users/[id] – Exclui usuário (apenas role consult, admin apenas).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!requireAdmin(user)) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }

  try {
    const { rows } = await query<{ role: string }>('SELECT role FROM app.users WHERE id = $1', [id]);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }
    if (rows[0].role !== 'consult') {
      return NextResponse.json({ error: 'Só é possível excluir usuários com perfil consulta.' }, { status: 403 });
    }

    await query('DELETE FROM app.users WHERE id = $1', [id]);
    return NextResponse.json({ message: 'Usuário excluído.' });
  } catch (e) {
    console.error('Delete user error:', e);
    return NextResponse.json({ error: 'Erro ao excluir usuário.' }, { status: 500 });
  }
}
