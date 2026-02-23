/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(token);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branch_id');

  try {
    const sb = await getSupabase();

    let query = sb
      .from('vehicles')
      .select('*, partners(name), branches(name)')
      .eq('status', 'active');

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data: vehicles, error } = await query
      .order('ownership_type', { ascending: true })
      .order('registration_number', { ascending: true });

    if (error) throw error;

    // Transform to match expected format
    const transformedVehicles = (vehicles || []).map((v: any) => ({
      ...v,
      partner_name: v.partners?.name || null,
      branch_name: v.branches?.name || null,
      partners: undefined,
      branches: undefined
    }));

    return NextResponse.json({ vehicles: transformedVehicles });
  } catch (err: any) {
    console.error('Get vehicles error:', err?.message);
    return NextResponse.json({ error: 'Failed to fetch vehicles', detail: err?.message }, { status: 500 });
  }
}
