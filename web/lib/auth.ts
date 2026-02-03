import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { query } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'vigilancia-secret-change-in-production'
);
const COOKIE_NAME = 'vigilancia_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 dias
};

export type UserRole = 'consult' | 'admin';

export interface AppUser {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(user: AppUser): Promise<string> {
  return new SignJWT({
    sub: String(user.id),
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AppUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const sub = payload.sub;
    const role = payload.role as UserRole;
    if (!sub || !role) return null;
    const { rows } = await query<{ id: number; email: string; name: string | null; role: string }>(
      'SELECT id, email, name, role FROM app.users WHERE id = $1',
      [Number(sub)]
    );
    const u = rows[0];
    if (!u) return null;
    return { id: u.id, email: u.email, name: u.name, role: u.role as UserRole };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS);
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function requireAdmin(user: AppUser | null): boolean {
  return user?.role === 'admin';
}
