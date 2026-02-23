/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getSupabase } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'bvc-inspection-dev-secret-change-in-production';

export interface UserPayload {
  id: string;
  name: string;
  email: string;
  role: 'inspector' | 'supervisor' | 'fleet_manager' | 'admin';
  branch_id: string;
}

export async function authenticateUser(email: string, password: string): Promise<UserPayload | null> {
  const sb = getSupabase();
  const { data: user, error } = await sb
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('active', true)
    .single();

  if (error || !user) return null;
  if (!bcrypt.compareSync(password, user.password_hash)) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role, branch_id: user.branch_id };
}

export function generateToken(user: UserPayload): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}
