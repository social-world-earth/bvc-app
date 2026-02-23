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

    const { data: inspection, error: inspectionError } = await sb
      .from('inspections')
      .select(`
        *,
        vehicles(registration_number, chassis_number, make, model, ownership_type, vehicle_type),
        partners:vehicles(partners(name)),
        branches:vehicles(branches(name))
      `)
      .eq('id', params.id)
      .single();

    if (inspectionError) throw inspectionError;
    if (!inspection) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: items, error: itemsError } = await sb
      .from('inspection_items')
      .select('*')
      .eq('inspection_id', params.id)
      .order('category', { ascending: true })
      .order('item_name', { ascending: true });

    if (itemsError) throw itemsError;

    // Transform inspection to match expected format
    const transformedInspection = {
      ...inspection,
      registration_number: inspection.vehicles?.registration_number,
      chassis_number: inspection.vehicles?.chassis_number,
      make: inspection.vehicles?.make,
      model: inspection.vehicles?.model,
      ownership_type: inspection.vehicles?.ownership_type,
      vehicle_type: inspection.vehicles?.vehicle_type,
      partner_name: inspection.partners?.[0]?.partners?.name || null,
      branch_name: inspection.branches?.[0]?.branches?.name || null,
      vehicles: undefined,
      partners: undefined,
      branches: undefined
    };

    return NextResponse.json({ inspection: transformedInspection, items });
  } catch (err: any) {
    console.error('Get inspection error:', err?.message);
    return NextResponse.json({ error: 'Failed to fetch inspection', detail: err?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(token);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { items, odometer_reading, notes, action } = body;

  try {
    const sb = await getSupabase();

    const { data: inspection, error: inspectionError } = await sb
      .from('inspections')
      .select('*')
      .eq('id', params.id)
      .eq('inspector_id', user.id)
      .single();

    if (inspectionError) throw inspectionError;
    if (!inspection) return NextResponse.json({ error: 'Not found or not yours' }, { status: 404 });

    // Update items
    if (items) {
      for (const item of items) {
        const { error: itemError } = await sb
          .from('inspection_items')
          .update({
            status: item.status,
            notes: item.notes || null,
            photo_urls: JSON.stringify(item.photo_urls || [])
          })
          .eq('id', item.id)
          .eq('inspection_id', params.id);

        if (itemError) throw itemError;
      }
    }

    // Update inspection
    if (odometer_reading) {
      const { error: updateError } = await sb
        .from('inspections')
        .update({ odometer_reading })
        .eq('id', params.id);

      if (updateError) throw updateError;
    }
    if (notes) {
      const { error: updateError } = await sb
        .from('inspections')
        .update({ notes })
        .eq('id', params.id);

      if (updateError) throw updateError;
    }

    // Submit
    if (action === 'submit') {
      const { error: submitError } = await sb
        .from('inspections')
        .update({
          status: 'submitted',
          completed_at: new Date().toISOString()
        })
        .eq('id', params.id);

      if (submitError) throw submitError;

      const { error: taskError } = await sb
        .from('audit_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', inspection.audit_task_id);

      if (taskError) throw taskError;
    }

    return NextResponse.json({ message: action === 'submit' ? 'Inspection submitted' : 'Inspection saved' });
  } catch (err: any) {
    console.error('Update inspection error:', err?.message);
    return NextResponse.json({ error: 'Failed to update inspection', detail: err?.message }, { status: 500 });
  }
}
