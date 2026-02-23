/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/app-shell';
import { useAuth } from '@/lib/auth-context';

export default function VehiclesPage() {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchBranches = useCallback(async () => {
    const res = await fetch('/api/branches', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setBranches(data.branches || []);
  }, [token]);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    const url = selectedBranch ? `/api/vehicles?branch_id=${selectedBranch}` : '/api/vehicles';
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setVehicles(data.vehicles || []);
    setLoading(false);
  }, [token, selectedBranch]);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);
  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  return (
    <AppShell title="Vehicle Master" allowedRoles={['admin']}>
      {/* Branch Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setSelectedBranch('')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${!selectedBranch ? 'bg-blue-900 text-white' : 'bg-white text-gray-600 shadow'}`}>
          All Branches
        </button>
        {branches.map((b: any) => (
          <button key={b.id} onClick={() => setSelectedBranch(b.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${selectedBranch === b.id ? 'bg-blue-900 text-white' : 'bg-white text-gray-600 shadow'}`}>
            {b.name}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-sm text-gray-500 mb-3">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-gray-500">No vehicles found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v: any) => (
            <div key={v.id} className="bg-white rounded-xl p-4 shadow">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-lg">{v.registration_number}</p>
                  <p className="text-sm text-gray-600">{v.make} {v.model} {v.year ? `(${v.year})` : ''}</p>
                  <p className="text-xs text-gray-400">{v.chassis_number}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${v.ownership_type === 'bvc' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                  {v.ownership_type === 'bvc' ? 'BVC' : v.partner_name || 'Partner'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="bg-gray-100 px-2 py-0.5 rounded-full">{v.vehicle_type || 'Vehicle'}</span>
                <span>{v.branch_name}</span>
                {v.qr_code && <span className="text-blue-600">QR: {v.qr_code}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
