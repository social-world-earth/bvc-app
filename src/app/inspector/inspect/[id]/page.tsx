/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react/no-unescaped-entities */
'use client';
import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/app-shell';
import { useAuth } from '@/lib/auth-context';
import { useParams, useRouter } from 'next/navigation';

const CATEGORIES = [
  { key: 'exterior', label: 'Exterior', icon: '🚗' },
  { key: 'engine', label: 'Engine Bay', icon: '🔧' },
  { key: 'interior', label: 'Interior', icon: '💺' },
  { key: 'safety', label: 'Safety Equipment', icon: '🛡️' },
  { key: 'documentation', label: 'Documentation', icon: '📄' },
];

export default function InspectionFormPage() {
  const { token } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [inspection, setInspection] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [currentCategory, setCurrentCategory] = useState(0);
  const [odometer, setOdometer] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const fetchInspection = useCallback(async () => {
    const res = await fetch(`/api/inspector/inspections/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setInspection(data.inspection);
    setItems(data.items || []);
    if (data.inspection?.odometer_reading) setOdometer(String(data.inspection.odometer_reading));
    if (data.inspection?.notes) setNotes(data.inspection.notes);
    setLoading(false);
  }, [params.id, token]);

  useEffect(() => { fetchInspection(); }, [fetchInspection]);

  const updateItemStatus = (itemId: string, status: string) => {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, status } : item));
  };

  const updateItemNotes = (itemId: string, itemNotes: string) => {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, notes: itemNotes } : item));
  };

  const saveProgress = async (action = 'save') => {
    setSaving(true);
    await fetch(`/api/inspector/inspections/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items, odometer_reading: odometer ? parseInt(odometer) : null, notes, action }),
    });
    setSaving(false);
    if (action === 'submit') {
      router.push('/inspector');
    }
  };

  if (loading) {
    return (
      <AppShell title="Inspection" allowedRoles={['inspector']}>
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div></div>
      </AppShell>
    );
  }

  const categoryItems = items.filter(i => i.category === CATEGORIES[currentCategory]?.key);
  const allItemsChecked = items.every(i => i.status !== 'pending' && i.status !== null);
  const _currentCategoryComplete = categoryItems.every(i => i.status !== 'pending' && i.status !== null);
  const failCount = items.filter(i => i.status === 'fail').length;
  const attentionCount = items.filter(i => i.status === 'needs_attention').length;

  return (
    <AppShell title="Vehicle Inspection" allowedRoles={['inspector']}>
      {/* Vehicle Info Bar */}
      <div className="bg-white rounded-xl p-3 shadow mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-bold">{inspection?.registration_number}</p>
            <p className="text-xs text-gray-500">{inspection?.make} {inspection?.model} • {inspection?.chassis_number}</p>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${inspection?.ownership_type === 'bvc' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
            {inspection?.ownership_type === 'bvc' ? 'BVC' : inspection?.partner_name}
          </span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto gap-2 mb-4 pb-1 -mx-1 px-1">
        {CATEGORIES.map((cat, idx) => {
          const catItems = items.filter(i => i.category === cat.key);
          const done = catItems.filter(i => i.status !== 'pending' && i.status !== null).length;
          const total = catItems.length;
          return (
            <button key={cat.key} onClick={() => setCurrentCategory(idx)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition ${currentCategory === idx ? 'bg-blue-900 text-white' : 'bg-white text-gray-600 shadow'}`}>
              <span className="mr-1">{cat.icon}</span> {cat.label}
              <span className="ml-1 opacity-75">({done}/{total})</span>
            </button>
          );
        })}
      </div>

      {/* Checklist Items */}
      <div className="space-y-3 mb-4">
        {categoryItems.map(item => (
          <div key={item.id} className="bg-white rounded-xl p-3 shadow">
            <p className="font-medium text-sm mb-2">{item.item_name}</p>
            
            {/* Status Buttons */}
            <div className="flex gap-2 mb-2">
              {['pass', 'fail', 'needs_attention'].map(status => (
                <button key={status} onClick={() => updateItemStatus(item.id, status)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                    item.status === status
                      ? status === 'pass' ? 'bg-green-600 text-white' : status === 'fail' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                  {status === 'pass' ? '✓ Pass' : status === 'fail' ? '✗ Fail' : '⚠ Attention'}
                </button>
              ))}
            </div>

            {/* Notes for failed/attention items */}
            {(item.status === 'fail' || item.status === 'needs_attention') && (
              <input type="text" value={item.notes || ''} onChange={e => updateItemNotes(item.id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Add notes about this issue..." />
            )}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mb-4">
        {currentCategory > 0 && (
          <button onClick={() => setCurrentCategory(prev => prev - 1)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold">
            Previous
          </button>
        )}
        {currentCategory < CATEGORIES.length - 1 ? (
          <button onClick={() => { saveProgress(); setCurrentCategory(prev => prev + 1); }}
            className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-semibold">
            Save & Next
          </button>
        ) : (
          <button onClick={() => saveProgress()} className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-semibold">
            Save Progress
          </button>
        )}
      </div>

      {/* Submit Section */}
      {currentCategory === CATEGORIES.length - 1 && (
        <div className="bg-white rounded-xl p-4 shadow space-y-3">
          <h3 className="font-bold">Finalize Inspection</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Odometer Reading</label>
            <input type="number" value={odometer} onChange={e => setOdometer(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base" placeholder="Current km reading" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base" placeholder="Any additional observations..." />
          </div>
          
          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-sm font-medium">Summary: {items.filter(i => i.status === 'pass').length} pass, {failCount} fail, {attentionCount} needs attention, {items.filter(i => !i.status || i.status === 'pending').length} unchecked</p>
          </div>

          {!allItemsChecked && (
            <p className="text-sm text-red-600">Please complete all checklist items before submitting.</p>
          )}

          <button onClick={() => setShowSubmitConfirm(true)} disabled={!allItemsChecked}
            className="w-full bg-green-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
            Submit for Review
          </button>
        </div>
      )}

      {/* Confirm Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">Submit Inspection?</h3>
            <p className="text-sm text-gray-600 mb-4">This will send the inspection to your supervisor for review. You wonYou won'tapos;t be able to edit it after submission.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSubmitConfirm(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold">Cancel</button>
              <button onClick={() => { setShowSubmitConfirm(false); saveProgress('submit'); }} disabled={saving}
                className="flex-1 bg-green-700 text-white py-2.5 rounded-xl font-semibold disabled:opacity-50">
                {saving ? 'Submitting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
