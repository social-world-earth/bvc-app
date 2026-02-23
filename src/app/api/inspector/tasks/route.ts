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

    const { data: tasks, error } = await sb
      .from('audit_tasks')
      .select(`
        *,
        vehicles(registration_number, chassis_number, make, model, ownership_type, vehicle_type),
        branches(name),
        partners:vehicles(partners(name)),
        audit_schedules(title, audit_type, special_instructions),
        inspections(id, status)
      `)
      .eq('inspector_id', user.id)
      .in('status', ['pending', 'in_progress'])
      .order('deadline', { ascending: true });

    if (error) throw error;

    // Transform tasks to match expected format
    const transformedTasks = (tasks || []).map((task: any) => ({
      ...task,
      registration_number: task.vehicles?.registration_number,
      chassis_number: task.vehicles?.chassis_number,
      make: task.vehicles?.make,
      model: task.vehicles?.model,
      ownership_type: task.vehicles?.ownership_type,
      vehicle_type: task.vehicles?.vehicle_type,
      partner_name: task.partners?.[0]?.partners?.name || null,
      branch_name: task.branches?.name,
      audit_title: task.audit_schedules?.title,
      audit_type: task.audit_schedules?.audit_type,
      special_instructions: task.audit_schedules?.special_instructions,
      inspection_id: task.inspections?.[0]?.id || null,
      inspection_status: task.inspections?.[0]?.status || null,
      vehicles: undefined,
      branches: undefined,
      partners: undefined,
      audit_schedules: undefined,
      inspections: undefined
    }));

    return NextResponse.json({ tasks: transformedTasks });
  } catch (err: any) {
    console.error('Get tasks error:', err?.message);
    return NextResponse.json({ error: 'Failed to fetch tasks', detail: err?.message }, { status: 500 });
  }
}
