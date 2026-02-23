/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(token);
  if (!user || !['supervisor', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { action, rejection_reason } = body;

  try {
    const sb = await getSupabase();

    if (action === 'approve') {
      const { error: updateError } = await sb
        .from('inspections')
        .update({
          status: 'approved',
          supervisor_id: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', params.id);

      if (updateError) throw updateError;

      // Get inspection to find inspector
      const { data: inspection, error: inspectionError } = await sb
        .from('inspections')
        .select('inspector_id')
        .eq('id', params.id)
        .single();

      if (inspectionError) throw inspectionError;
      if (inspection) {
        const { error: notifError } = await sb
          .from('notifications')
          .insert({
            id: uuid(),
            user_id: inspection.inspector_id,
            notification_type: 'inspection_approved',
            title: 'Inspection Approved',
            message: 'Your inspection has been approved by the supervisor.'
          });

        if (notifError) throw notifError;
      }
    } else if (action === 'reject') {
      const { error: updateError } = await sb
        .from('inspections')
        .update({
          status: 'rejected',
          supervisor_id: user.id,
          rejection_reason: rejection_reason || 'Needs revision'
        })
        .eq('id', params.id);

      if (updateError) throw updateError;

      // Get inspection to find inspector and audit task
      const { data: inspection, error: inspectionError } = await sb
        .from('inspections')
        .select('inspector_id, audit_task_id')
        .eq('id', params.id)
        .single();

      if (inspectionError) throw inspectionError;
      if (inspection) {
        // Update audit task status back to pending
        const { error: taskError } = await sb
          .from('audit_tasks')
          .update({ status: 'pending' })
          .eq('id', inspection.audit_task_id);

        if (taskError) throw taskError;

        // Create rejection notification
        const { error: notifError } = await sb
          .from('notifications')
          .insert({
            id: uuid(),
            user_id: inspection.inspector_id,
            notification_type: 'inspection_rejected',
            title: 'Inspection Rejected',
            message: `Reason: ${rejection_reason || 'Needs revision'}`
          });

        if (notifError) throw notifError;
      }
    }

    const pastTense = action === 'approve' ? 'approved' : 'rejected';
    return NextResponse.json({ message: `Inspection ${pastTense}` });
  } catch (err: any) {
    console.error('Review update error:', err?.message);
    return NextResponse.json({ error: 'Failed to update inspection', detail: err?.message }, { status: 500 });
  }
}
