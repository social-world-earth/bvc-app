/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(token);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  // Support both field names for compatibility
  const audit_task_id = body.audit_task_id || body.task_id;
  if (!audit_task_id) return NextResponse.json({ error: 'task_id is required' }, { status: 400 });

  try {
    const sb = await getSupabase();

    // Check task assignment
    const { data: task, error: taskError } = await sb
      .from('audit_tasks')
      .select('*')
      .eq('id', audit_task_id)
      .eq('inspector_id', user.id)
      .single();

    if (taskError) throw taskError;
    if (!task) return NextResponse.json({ error: 'Task not assigned to you' }, { status: 403 });

    // Use vehicle_id from the task if not provided
    const vehicle_id = body.vehicle_id || task.vehicle_id;

    // Check no existing inspection
    const { data: existing, error: existingError } = await sb
      .from('inspections')
      .select('id')
      .eq('audit_task_id', audit_task_id)
      .single();

    if (existing) return NextResponse.json({ error: 'Inspection already started', inspection_id: existing.id }, { status: 400 });

    // Get checklist templates
    const { data: templates, error: templatesError } = await sb
      .from('checklist_templates')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (templatesError) throw templatesError;

    const inspectionId = uuid();

    // Create inspection
    const { error: createError } = await sb
      .from('inspections')
      .insert({
        id: inspectionId,
        audit_task_id,
        vehicle_id,
        inspector_id: user.id,
        status: 'draft'
      });

    if (createError) throw createError;

    // Create inspection items from checklist
    const itemsToInsert: any[] = [];
    for (const template of templates || []) {
      const items = JSON.parse(template.items);
      for (const item of items) {
        itemsToInsert.push({
          id: uuid(),
          inspection_id: inspectionId,
          checklist_item_id: item.id,
          category: template.category,
          item_name: item.name
        });
      }
    }

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await sb
        .from('inspection_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    // Update task status
    const { error: taskUpdateError } = await sb
      .from('audit_tasks')
      .update({ status: 'in_progress' })
      .eq('id', audit_task_id);

    if (taskUpdateError) throw taskUpdateError;

    return NextResponse.json({ inspection_id: inspectionId });
  } catch (err: any) {
    console.error('Create inspection error:', err?.message);
    return NextResponse.json({ error: 'Failed to create inspection', detail: err?.message }, { status: 500 });
  }
}
