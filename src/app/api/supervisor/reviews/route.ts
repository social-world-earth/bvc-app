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

    const { data: inspections, error } = await sb
      .from('inspections')
      .select(`
        *,
        vehicles(registration_number, chassis_number, make, model, ownership_type),
        branches:vehicles(branches(name)),
        partners:vehicles(partners(name)),
        inspector:users!inspector_id(name),
        audit_schedule:audit_tasks(audit_schedules(title))
      `)
      .in('status', ['submitted', 'approved', 'rejected'])
      .eq('vehicles.branch_id', user.branch_id)
      .order('status', { ascending: true })
      .order('completed_at', { ascending: false });

    if (error) throw error;

    // Transform inspections to match expected format
    const transformedInspections = (inspections || []).map((i: any) => ({
      ...i,
      registration_number: i.vehicles?.registration_number,
      chassis_number: i.vehicles?.chassis_number,
      make: i.vehicles?.make,
      model: i.vehicles?.model,
      ownership_type: i.vehicles?.ownership_type,
      branch_name: i.branches?.[0]?.branches?.name || null,
      partner_name: i.partners?.[0]?.partners?.name || null,
      inspector_name: i.inspector?.name,
      audit_title: i.audit_schedule?.[0]?.audit_schedules?.title || null,
      vehicles: undefined,
      branches: undefined,
      partners: undefined,
      inspector: undefined,
      audit_schedule: undefined
    }));

    return NextResponse.json({ inspections: transformedInspections });
  } catch (err: any) {
    console.error('Get reviews error:', err?.message);
    return NextResponse.json({ error: 'Failed to fetch reviews', detail: err?.message }, { status: 500 });
  }
}
