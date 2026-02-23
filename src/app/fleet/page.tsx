'use client';
import AppShell from '@/components/app-shell';

export default function FleetDashboard() {
  return (
    <AppShell title="Fleet Dashboard" allowedRoles={['fleet_manager', 'admin']}>
      <div className="bg-white rounded-xl p-8 text-center shadow">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-gray-500 font-medium">Fleet Dashboard</p>
        <p className="text-gray-400 text-sm mt-1">Coming in Phase 3</p>
      </div>
    </AppShell>
  );
}
