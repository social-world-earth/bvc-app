/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(token);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const sb = await getSupabase();

    // Get schedule
    const { data: schedule, error: scheduleError } = await sb
      .from('audit_schedules')
      .select('*')
      .eq('id', params.id)
      .single();

    if (scheduleError) throw scheduleError;
    if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    if (schedule.status !== 'draft') return NextResponse.json({ error: 'Can only approve draft schedules' }, { status: 400 });

    // Handle possible double-encoding of JSON
    let scopeBranches: string[];
    try {
      let parsed = JSON.parse(schedule.scope_branches);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      scopeBranches = parsed;
    } catch (e) {
      return NextResponse.json({ error: 'Invalid scope_branches data' }, { status: 400 });
    }
    let scopeVehicles: string[] | null = null;
    if (schedule.scope_vehicles) {
      try {
        let parsed = JSON.parse(schedule.scope_vehicles);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        scopeVehicles = parsed;
      } catch { /* ignore */ }
    }

    // Get vehicles in scope
    let vehicles: any[];
    if (scopeVehicles && scopeVehicles.length > 0) {
      const { data: vehiclesData, error: vehiclesError } = await sb
        .from('vehicles')
        .select('id, branch_id')
        .in('id', scopeVehicles)
        .eq('status', 'active');

      if (vehiclesError) throw vehiclesError;
      vehicles = vehiclesData || [];
    } else {
      const { data: vehiclesData, error: vehiclesError } = await sb
        .from('vehicles')
        .select('id, branch_id')
        .in('branch_id', scopeBranches)
        .eq('status', 'active');

      if (vehiclesError) throw vehiclesError;
      vehicles = vehiclesData || [];
    }

    if (vehicles.length === 0) {
      return NextResponse.json({ error: 'No active vehicles found in the selected scope' }, { status: 400 });
    }

    // Get inspectors for assignment (round-robin by branch)
    const inspectorsByBranch: Record<string, any[]> = {};
    for (const branchId of scopeBranches) {
      const { data: inspectors, error: inspectorsError } = await sb
        .from('users')
        .select('id')
        .eq('role', 'inspector')
        .eq('branch_id', branchId)
        .eq('active', true);

      if (inspectorsError) throw inspectorsError;
      inspectorsByBranch[branchId] = inspectors || [];
    }

    // Create audit tasks
    const tasksToInsert: any[] = [];
    const counters: Record<string, number> = {};
    for (const vehicle of vehicles) {
      const branchInspectors = inspectorsByBranch[vehicle.branch_id] || [];
      let inspectorId = null;
      if (branchInspectors.length > 0) {
        const idx = (counters[vehicle.branch_id] || 0) % branchInspectors.length;
        inspectorId = branchInspectors[idx].id;
        counters[vehicle.branch_id] = (counters[vehicle.branch_id] || 0) + 1;
      }
      tasksToInsert.push({
        id: uuid(),
        audit_schedule_id: params.id,
        vehicle_id: vehicle.id,
        inspector_id: inspectorId,
        branch_id: vehicle.branch_id,
        status: 'pending',
        assigned_at: new Date().toISOString(),
        deadline: schedule.end_date
      });
    }

    // Insert all tasks
    const { error: insertError } = await sb
      .from('audit_tasks')
      .insert(tasksToInsert);

    if (insertError) throw insertError;

    // Update schedule status
    const { error: updateError } = await sb
      .from('audit_schedules')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id);

    if (updateError) throw updateError;

    // Create notifications for assigned inspectors
    const { data: assignedTasks, error: tasksQueryError } = await sb
      .from('audit_tasks')
      .select('inspector_id')
      .eq('audit_schedule_id', params.id)
      .not('inspector_id', 'is', null);

    if (tasksQueryError) throw tasksQueryError;

    // Deduplicate inspector IDs in JS since Supabase doesn't support DISTINCT in select
    const uniqueInspectorIds = [...new Set((assignedTasks || []).map((t: any) => t.inspector_id))];

    const notificationsToInsert = uniqueInspectorIds.map((inspectorId: string) => ({
      id: uuid(),
      user_id: inspectorId,
      notification_type: 'audit_assigned',
      title: 'New Audit Assigned',
      message: `You have been assigned vehicles for audit: ${schedule.title}`
    }));

    if (notificationsToInsert.length > 0) {
      const { error: notifError } = await sb
        .from('notifications')
        .insert(notificationsToInsert);

      if (notifError) throw notifError;
    }

    return NextResponse.json({
      message: 'Audit approved and tasks assigned',
      tasks_created: vehicles.length
    });
  } catch (err: any) {
    console.error('Approve error:', err?.message, err?.stack);
    return NextResponse.json({ error: 'Failed to approve', detail: err?.message }, { status: 500 });
  }
}
