/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(token);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const sb = await getSupabase();

    // Get schedules with creator name
    const { data: schedules, error } = await sb
      .from('audit_schedules')
      .select('*, created_by_user:users!created_by(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get task counts for each schedule
    const schedulesWithCounts = await Promise.all(
      (schedules || []).map(async (schedule: any) => {
        const { count: totalTasks } = await sb
          .from('audit_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('audit_schedule_id', schedule.id);

        const { count: completedTasks } = await sb
          .from('audit_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('audit_schedule_id', schedule.id)
          .eq('status', 'completed');

        return {
          ...schedule,
          created_by_name: schedule.created_by_user?.name || null,
          created_by_user: undefined,
          total_tasks: totalTasks || 0,
          completed_tasks: completedTasks || 0
        };
      })
    );

    return NextResponse.json({ schedules: schedulesWithCounts });
  } catch (err: any) {
    console.error('Get schedules error:', err?.message);
    return NextResponse.json({ error: 'Failed to fetch schedules', detail: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(token);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { title, audit_type, scope_branches, scope_vehicles, start_date, end_date, special_instructions } = body;

  if (!title || !audit_type || !scope_branches || !start_date || !end_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const sb = await getSupabase();
    const id = uuid();

    const { error } = await sb.from('audit_schedules').insert({
      id,
      title,
      audit_type,
      scope_branches: JSON.stringify(scope_branches),
      scope_vehicles: scope_vehicles ? JSON.stringify(scope_vehicles) : null,
      start_date,
      end_date,
      special_instructions: special_instructions || null,
      status: 'draft',
      created_by: user.id
    });

    if (error) throw error;

    return NextResponse.json({ id, message: 'Audit schedule created as draft' });
  } catch (err: any) {
    console.error('Create schedule error:', err?.message);
    return NextResponse.json({ error: 'Failed to create schedule', detail: err?.message }, { status: 500 });
  }
}
