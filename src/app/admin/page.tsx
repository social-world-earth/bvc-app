'use client';
import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/app-shell';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

interface AuditSchedule {
  id: string;
  title: string;
  audit_type: string;
  status: string;
  start_date: string;
  end_date: string;
  total_tasks: number;
  completed_tasks: number;
  created_at: string;
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const [schedules, setSchedules] = useState<AuditSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    const res = await fetch('/api/admin/audit-schedules', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setSchedules(data.schedules || []);
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    partially_completed: 'bg-orange-100 text-orange-800',
  };

  const typeLabels: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    ad_hoc: 'Ad Hoc',
  };

  return (
    <AppShell title="Admin Dashboard" allowedRoles={['admin']}>
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href="/admin/audit/new" className="bg-blue-900 text-white rounded-xl p-4 text-center shadow hover:bg-blue-800 transition">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <p className="font-semibold text-sm">New Audit</p>
        </Link>
        <Link href="/admin/vehicles" className="bg-white text-gray-800 rounded-xl p-4 text-center shadow border hover:bg-gray-50 transition">
          <svg className="w-8 h-8 mx-auto mb-2 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="font-semibold text-sm">Vehicles</p>
        </Link>
      </div>

      {/* Audit Schedules */}
      <h2 className="text-lg font-bold text-gray-900 mb-3">Audit Schedules</h2>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 mb-4">No audit schedules yet</p>
          <Link href="/admin/audit/new" className="inline-block bg-blue-900 text-white px-6 py-2 rounded-lg font-semibold text-sm">
            Create First Audit
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <Link key={s.id} href={`/admin/audit/${s.id}`} className="block bg-white rounded-xl p-4 shadow hover:shadow-md transition">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{s.title}</h3>
                  <p className="text-xs text-gray-500">{typeLabels[s.audit_type]} • {s.start_date} to {s.end_date}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status] || 'bg-gray-100 text-gray-800'}`}>
                  {s.status.replace('_', ' ')}
                </span>
              </div>
              {s.total_tasks > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{s.completed_tasks} of {s.total_tasks} vehicles inspected</span>
                    <span>{Math.round((s.completed_tasks / s.total_tasks) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-900 h-2 rounded-full transition-all"
                      style={{ width: `${(s.completed_tasks / s.total_tasks) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
