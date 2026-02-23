/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(token);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const sb = await getSupabase();

    // Get branches with vehicle count
    const { data: branches, error } = await sb
      .from('branches')
      .select('*')
      .order('region', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    // Get vehicle counts for each branch
    const branchesWithCounts = await Promise.all(
      (branches || []).map(async (branch) => {
        const { count } = await sb
          .from('vehicles')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', branch.id)
          .eq('status', 'active');

        return {
          ...branch,
          vehicle_count: count || 0
        };
      })
    );

    return NextResponse.json({ branches: branchesWithCounts });
  } catch (err: any) {
    console.error('Get branches error:', err?.message);
    return NextResponse.json({ error: 'Failed to fetch branches', detail: err?.message }, { status: 500 });
  }
}
