'use client';
import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/app-shell';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface Branch {
  id: string;
  name: string;
  region: string;
  vehicle_count: number;
}

interface Vehicle {
  id: string;
  registration_number: string;
  chassis_number: string;
  make: string;
  model: string;
  ownership_type: string;
  partner_name: string | null;
  branch_name: string;
}

export default function NewAuditPage() {
  const { token } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [auditType, setAuditType] = useState('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [selectAllVehicles, setSelectAllVehicles] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchBranches = useCallback(async () => {
    const res = await fetch('/api/branches', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setBranches(data.branches || []);
  }, [token]);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const fetchVehicles = useCallback(async () => {
    if (selectedBranches.length === 0) { setVehicles([]); return; }
    const allVehicles: Vehicle[] = [];
    for (const branchId of selectedBranches) {
      const res = await fetch(`/api/vehicles?branch_id=${branchId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      allVehicles.push(...(data.vehicles || []));
    }
    setVehicles(allVehicles);
  }, [selectedBranches, token]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const toggleBranch = (id: string) => {
    setSelectedBranches(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
    setSelectedVehicles([]);
    setSelectAllVehicles(true);
  };

  const toggleVehicle = (id: string) => {
    setSelectAllVehicles(false);
    setSelectedVehicles(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/audit-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          audit_type: auditType,
          scope_branches: selectedBranches,
          scope_vehicles: selectAllVehicles ? null : selectedVehicles,
          start_date: startDate,
          end_date: endDate,
          special_instructions: instructions,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSubmitting(false); return; }
      router.push(`/admin/audit/${data.id}`);
    } catch {
      setError('Failed to create audit');
      setSubmitting(false);
    }
  };

  const auditTypes = [
    { value: 'daily', label: 'Daily Spot Check', desc: 'Quick daily vehicle checks' },
    { value: 'weekly', label: 'Weekly Routine', desc: 'Standard weekly inspection' },
    { value: 'monthly', label: 'Monthly Comprehensive', desc: 'Full monthly audit' },
    { value: 'ad_hoc', label: 'Special / Ad Hoc', desc: 'One-time or special inspection' },
  ];

  return (
    <AppShell title="Create New Audit" allowedRoles={['admin']}>
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {s}
            </div>
            {s < 4 && <div className={`w-8 h-0.5 ${step > s ? 'bg-blue-900' : 'bg-gray-200'}`}></div>}
          </div>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="bg-white rounded-xl p-4 shadow space-y-4">
          <h2 className="text-lg font-bold">Audit Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audit Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base" placeholder="e.g., Weekly Inspection - Mumbai Feb W3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Audit Type</label>
            <div className="space-y-2">
              {auditTypes.map(t => (
                <button key={t.value} onClick={() => setAuditType(t.value)} className={`w-full text-left p-3 rounded-xl border-2 transition ${auditType === t.value ? 'border-blue-900 bg-blue-50' : 'border-gray-200'}`}>
                  <p className="font-semibold text-sm">{t.label}</p>
                  <p className="text-xs text-gray-500">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-3 border border-gray-300 rounded-xl text-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-3 border border-gray-300 rounded-xl text-base" />
            </div>
          </div>
          <button onClick={() => setStep(2)} disabled={!title || !startDate || !endDate} className="w-full bg-blue-900 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
            Next: Select Branches
          </button>
        </div>
      )}

      {/* Step 2: Select Branches */}
      {step === 2 && (
        <div className="bg-white rounded-xl p-4 shadow space-y-4">
          <h2 className="text-lg font-bold">Select Branches</h2>
          <p className="text-sm text-gray-500">Choose which branches to include in this audit.</p>
          <div className="space-y-2">
            {branches.map(b => (
              <button key={b.id} onClick={() => toggleBranch(b.id)} className={`w-full text-left p-3 rounded-xl border-2 transition ${selectedBranches.includes(b.id) ? 'border-blue-900 bg-blue-50' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm">{b.name}</p>
                    <p className="text-xs text-gray-500">{b.region}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-900">{b.vehicle_count}</p>
                    <p className="text-xs text-gray-500">vehicles</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold">Back</button>
            <button onClick={() => setStep(3)} disabled={selectedBranches.length === 0} className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
              Next: Select Vehicles
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Select Vehicles */}
      {step === 3 && (
        <div className="bg-white rounded-xl p-4 shadow space-y-4">
          <h2 className="text-lg font-bold">Select Vehicles</h2>
          <button onClick={() => { setSelectAllVehicles(true); setSelectedVehicles([]); }} className={`w-full text-left p-3 rounded-xl border-2 transition mb-2 ${selectAllVehicles ? 'border-blue-900 bg-blue-50' : 'border-gray-200'}`}>
            <p className="font-semibold text-sm">All vehicles at selected branches ({vehicles.length} vehicles)</p>
          </button>
          
          <div className="border-t pt-3">
            <p className="text-sm text-gray-500 mb-2">Or select specific vehicles:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {vehicles.map(v => (
                <button key={v.id} onClick={() => toggleVehicle(v.id)} className={`w-full text-left p-3 rounded-xl border-2 transition ${!selectAllVehicles && selectedVehicles.includes(v.id) ? 'border-blue-900 bg-blue-50' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm">{v.registration_number}</p>
                      <p className="text-xs text-gray-500">{v.make} {v.model} • {v.chassis_number}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.ownership_type === 'bvc' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                      {v.ownership_type === 'bvc' ? 'BVC' : v.partner_name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold">Back</button>
            <button onClick={() => setStep(4)} className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-semibold">
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Create */}
      {step === 4 && (
        <div className="bg-white rounded-xl p-4 shadow space-y-4">
          <h2 className="text-lg font-bold">Review Audit Schedule</h2>
          
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Title</span>
              <span className="text-sm font-semibold">{title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Type</span>
              <span className="text-sm font-semibold">{auditTypes.find(t => t.value === auditType)?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Period</span>
              <span className="text-sm font-semibold">{startDate} to {endDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Branches</span>
              <span className="text-sm font-semibold">{selectedBranches.length} selected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Vehicles</span>
              <span className="text-sm font-semibold">{selectAllVehicles ? `All (${vehicles.length})` : `${selectedVehicles.length} selected`}</span>
            </div>
            {vehicles.length > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">BVC / Partner split</span>
                <span className="text-sm font-semibold">
                  {vehicles.filter(v => v.ownership_type === 'bvc').length} BVC, {vehicles.filter(v => v.ownership_type === 'partner').length} Partner
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions (optional)</label>
            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base" placeholder="Any special focus areas or notes for inspectors..." />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This will create a draft. You can review and approve it from the audit detail page, which will assign tasks to inspectors.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold">Back</button>
            <button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create Draft'}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
