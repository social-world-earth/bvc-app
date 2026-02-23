/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/app-shell';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function SupervisorDashboard() {
  const { token } = useAuth();
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('all');

  const fetchInspections = useCallback(async () => {
    const res = await fetch('/api/supervisor/reviews', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setInspections(data.inspections || []);
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchInspections(); }, [fetchInspections]);

  const filtered = filter === 'all' ? inspections : inspections.filter(i => i.status === filter);
  const pendingCount = inspections.filter(i => i.status === 'submitted').length;

  return (
    <AppShell title="Supervisor Review" allowedRoles={['supervisor', 'admin']}>
      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
          <p className="text-sm text-yellow-800 font-medium">{pendingCount} inspection{pendingCount !== 1 ? 's' : ''} awaiting your review</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(['all', 'submitted', 'approved', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${filter === f ? 'bg-blue-900 text-white' : 'bg-white text-gray-600 shadow'}`}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} {f === 'submitted' && pendingCount > 0 ? `(${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow">
          <p className="text-gray-500">No inspections to show</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(insp => (
            <Link key={insp.id} href={`/supervisor/review/${insp.id}`} className="block bg-white rounded-xl p-4 shadow hover:shadow-md transition">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <p className="font-bold">{insp.registration_number}</p>
                  <p className="text-xs text-gray-500">{insp.make} {insp.model} • {insp.chassis_number}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  insp.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                  insp.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {insp.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  By {insp.inspector_name} • {insp.audit_title}
                </p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${insp.ownership_type === 'bvc' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                  {insp.ownership_type === 'bvc' ? 'BVC' : insp.partner_name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
