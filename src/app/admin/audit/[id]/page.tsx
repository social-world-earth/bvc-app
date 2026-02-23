/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
'use client';
import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/app-shell';
import { useAuth } from '@/lib/auth-context';
import { useParams, useRouter } from 'next/navigation';

export default function AuditDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [schedule, setSchedule] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/admin/audit-schedules/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setSchedule(data.schedule);
    setTasks(data.tasks || []);
    setLoading(false);
  }, [params.id, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async () => {
    setApproving(true);
    const res = await fetch(`/api/admin/audit-schedules/${params.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      fetchData();
    }
    setApproving(false);
  };

  if (loading) {
    return (
      <AppShell title="Audit Detail" allowedRoles={['admin']}>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
        </div>
      </AppShell>
    );
  }

  if (!schedule) {
    return (
      <AppShell title="Audit Detail" allowedRoles={['admin']}>
        <p className="text-center text-gray-500 py-12">Audit not found</p>
      </AppShell>
    );
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    pending: 'bg-gray-100 text-gray-600',
    overdue: 'bg-red-100 text-red-800',
  };

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const _pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const bvcCount = tasks.filter(t => t.ownership_type === 'bvc').length;
  const partnerCount = tasks.filter(t => t.ownership_type === 'partner').length;

  return (
    <AppShell title="Audit Detail" allowedRoles={['admin']}>
      <button onClick={() => router.push('/admin')} className="text-blue-900 text-sm font-medium mb-4 inline-block">&larr; Back to Dashboard</button>

      {/* Header Card */}
      <div className="bg-white rounded-xl p-4 shadow mb-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{schedule.title}</h2>
            <p className="text-sm text-gray-500">{schedule.audit_type} audit • {schedule.start_date} to {schedule.end_date}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[schedule.status]}`}>
            {schedule.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {schedule.special_instructions && (
          <div className="bg-blue-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-blue-800"><strong>Instructions:</strong> {schedule.special_instructions}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-900">{tasks.length}</p>
            <p className="text-xs text-gray-500">Total Vehicles</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{completedTasks}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{bvcCount}</p>
            <p className="text-xs text-gray-500">BVC Vehicles</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-700">{partnerCount}</p>
            <p className="text-xs text-gray-500">Partner Vehicles</p>
          </div>
        </div>

        {/* Approve Button */}
        {schedule.status === 'draft' && (
          <button onClick={handleApprove} disabled={approving} className="w-full bg-green-700 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition disabled:opacity-50">
            {approving ? 'Approving...' : `Approve & Assign ${tasks.length > 0 ? tasks.length : 'All'} Vehicle Tasks`}
          </button>
        )}
      </div>

      {/* Task List */}
      {tasks.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Assigned Tasks</h3>
          <div className="space-y-2">
            {tasks.map(t => (
              <div key={t.id} className="bg-white rounded-xl p-3 shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm">{t.registration_number}</p>
                    <p className="text-xs text-gray-500">{t.make} {t.model} • {t.chassis_number}</p>
                    <p className="text-xs text-gray-500">{t.branch_name} {t.inspector_name ? `• Assigned: ${t.inspector_name}` : '• Unassigned'}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.ownership_type === 'bvc' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                      {t.ownership_type === 'bvc' ? 'BVC' : t.partner_name}
                    </span>
                    <p className={`mt-1 text-xs font-medium ${statusColors[t.status] ? '' : ''}`}>
                      <span className={`px-2 py-0.5 rounded-full ${statusColors[t.status] || 'bg-gray-100 text-gray-600'}`}>
                        {t.status}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
