/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/app-shell';
import { useAuth } from '@/lib/auth-context';
import { useParams, useRouter } from 'next/navigation';

export default function ReviewInspectionPage() {
  const { token } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [inspection, setInspection] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [acting, setActing] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/inspector/inspections/${params.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setInspection(data.inspection);
    setItems(data.items || []);
    setLoading(false);
  }, [params.id, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (action: 'approve' | 'reject') => {
    setActing(true);
    await fetch(`/api/supervisor/reviews/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, rejection_reason: rejectionReason }),
    });
    router.push('/supervisor');
  };

  if (loading) {
    return (
      <AppShell title="Review Inspection" allowedRoles={['supervisor', 'admin']}>
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div></div>
      </AppShell>
    );
  }

  const categories = Array.from(new Set(items.map((i: any) => i.category)));
  const failedItems = items.filter(i => i.status === 'fail');
  const attentionItems = items.filter(i => i.status === 'needs_attention');

  return (
    <AppShell title="Review Inspection" allowedRoles={['supervisor', 'admin']}>
      <button onClick={() => router.push('/supervisor')} className="text-blue-900 text-sm font-medium mb-4 inline-block">&larr; Back</button>

      {/* Vehicle Info */}
      <div className="bg-white rounded-xl p-4 shadow mb-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-bold text-lg">{inspection?.registration_number}</p>
            <p className="text-sm text-gray-500">{inspection?.make} {inspection?.model} • {inspection?.chassis_number}</p>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${inspection?.ownership_type === 'bvc' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
            {inspection?.ownership_type === 'bvc' ? 'BVC' : inspection?.partner_name}
          </span>
        </div>
        {inspection?.odometer_reading && <p className="text-sm text-gray-600">Odometer: {inspection.odometer_reading} km</p>}
        {inspection?.notes && <p className="text-sm text-gray-600 mt-1">Notes: {inspection.notes}</p>}
      </div>

      {/* Issues Summary */}
      {(failedItems.length > 0 || attentionItems.length > 0) && (
        <div className="bg-red-50 rounded-xl p-4 mb-4">
          <h3 className="font-bold text-red-800 mb-2">Issues Found</h3>
          {failedItems.map(item => (
            <div key={item.id} className="mb-2">
              <p className="text-sm font-medium text-red-700">✗ {item.item_name}</p>
              {item.notes && <p className="text-xs text-red-600 ml-4">{item.notes}</p>}
            </div>
          ))}
          {attentionItems.map(item => (
            <div key={item.id} className="mb-2">
              <p className="text-sm font-medium text-yellow-700">⚠ {item.item_name}</p>
              {item.notes && <p className="text-xs text-yellow-600 ml-4">{item.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Full Checklist */}
      {categories.map(cat => (
        <div key={cat} className="mb-4">
          <h3 className="font-bold text-sm text-gray-700 mb-2 uppercase">{cat}</h3>
          <div className="bg-white rounded-xl shadow divide-y">
            {items.filter(i => i.category === cat).map(item => (
              <div key={item.id} className="px-4 py-2.5 flex justify-between items-center">
                <p className="text-sm">{item.item_name}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  item.status === 'pass' ? 'bg-green-100 text-green-800' :
                  item.status === 'fail' ? 'bg-red-100 text-red-800' :
                  item.status === 'needs_attention' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-600'
                }`}>{item.status === 'needs_attention' ? 'Attention' : item.status}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Action Buttons */}
      {inspection?.status === 'submitted' && (
        <div className="space-y-3 mt-6">
          {showReject ? (
            <div className="bg-white rounded-xl p-4 shadow space-y-3">
              <label className="block text-sm font-medium text-gray-700">Reason for Rejection</label>
              <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base" placeholder="Explain what needs to be fixed..." />
              <div className="flex gap-3">
                <button onClick={() => setShowReject(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold">Cancel</button>
                <button onClick={() => handleAction('reject')} disabled={acting || !rejectionReason}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
                  {acting ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => setShowReject(true)} className="flex-1 bg-red-100 text-red-700 py-3 rounded-xl font-semibold">
                Reject
              </button>
              <button onClick={() => handleAction('approve')} disabled={acting}
                className="flex-1 bg-green-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
                {acting ? 'Approving...' : 'Approve'}
              </button>
            </div>
          )}
        </div>
      )}

      {inspection?.status === 'approved' && (
        <div className="bg-green-50 rounded-xl p-4 text-center mt-6">
          <p className="text-green-800 font-semibold">✓ Approved on {inspection.approved_at}</p>
        </div>
      )}
      {inspection?.status === 'rejected' && (
        <div className="bg-red-50 rounded-xl p-4 mt-6">
          <p className="text-red-800 font-semibold">✗ Rejected</p>
          <p className="text-red-600 text-sm mt-1">{inspection.rejection_reason}</p>
        </div>
      )}
    </AppShell>
  );
}
