/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(token);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const sb = await getSupabase();

    // Get schedule with creator name
    const { data: schedule, error: scheduleError } = await sb
      .from('audit_schedules')
      .select('*, created_by_user:users!created_by(name)')
      .eq('id', params.id)
      .single();

    if (scheduleError) throw scheduleError;
    if (!schedule) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Get tasks with vehicle and branch details
    const { data: tasks, error: tasksError } = await sb
      .from('audit_tasks')
      .select(`
        *,
        vehicles(id, registration_number, chassis_number, make, model, ownership_type),
        branches(name),
        partner:vehicles(partners(name)),
        inspector:users!inspector_id(name),
        inspections(status)
      `)
      .eq('audit_schedule_id', params.id)
      .order('vehicles(registration_number)', { ascending: true });

    if (tasksError) throw tasksError;

    // Transform tasks to match expected format
    const transformedTasks = (tasks || []).map((task: any) => ({
      ...task,
      registration_number: task.vehicles?.registration_number,
      chassis_number: task.vehicles?.chassis_number,
      make: task.vehicles?.make,
      model: task.vehicles?.model,
      ownership_type: task.vehicles?.ownership_type,
      branch_name: task.branches?.name,
      partner_name: task.partner?.[0]?.partners?.name || null,
      inspector_name: task.inspector?.name || null,
      inspection_status: task.inspections?.[0]?.status || null,
      vehicles: undefined,
      branches: undefined,
      partner: undefined,
      inspector: undefined,
      inspections: undefined
    }));

    const transformedSchedule = {
      ...schedule,
      created_by_name: schedule.created_by_user?.name || null,
      created_by_user: undefined
    };

    return NextResponse.json({ schedule: transformedSchedule, tasks: transformedTasks });
  } catch (err: any) {
    console.error('Get schedule error:', err?.message);
    return NextResponse.json({ error: 'Failed to fetch schedule', detail: err?.message }, { status: 500 });
  }
}
