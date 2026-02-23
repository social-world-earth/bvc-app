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
    const sb = getSupabase();

    // First get vehicle IDs that belong to this supervisor's branch
    const { data: branchVehicles, error: vError } = await sb
      .from('vehicles')
      .select('id')
      .eq('branch_id', user.branch_id);

    if (vError) throw vError;
    const vehicleIds = (branchVehicles || []).map((v: any) => v.id);

    if (vehicleIds.length === 0) {
      return NextResponse.json({ inspections: [] });
    }

    const { data: inspections, error } = await sb
      .from('inspections')
      .select(`
        *,
        vehicles(registration_number, chassis_number, make, model, ownership_type, branch_id,
          branches(name),
          partners(name)
        ),
        inspector:users!inspector_id(name),
        audit_task:audit_tasks(audit_schedules(title))
      `)
      .in('status', ['submitted', 'approved', 'rejected'])
      .in('vehicle_id', vehicleIds)
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
      branch_name: i.vehicles?.branches?.name || null,
      partner_name: i.vehicles?.partners?.name || null,
      inspector_name: i.inspector?.name,
      audit_title: i.audit_task?.[0]?.audit_schedules?.title || null,
      vehicles: undefined,
      inspector: undefined,
      audit_task: undefined
    }));

    return NextResponse.json({ inspections: transformedInspections });
  } catch (err: any) {
    console.error('Get reviews error:', err?.message);
    return NextResponse.json({ error: 'Failed to fetch reviews', detail: err?.message }, { status: 500 });
  }
}
