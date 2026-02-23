/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
'use client';
import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/app-shell';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function InspectorDashboard() {
  const { token } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/inspector/tasks', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setTasks(data.tasks || []);
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const startInspection = async (task: any) => {
    if (task.inspection_id) {
      router.push(`/inspector/inspect/${task.inspection_id}`);
      return;
    }
    const res = await fetch('/api/inspector/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ audit_task_id: task.id, vehicle_id: task.vehicle_id }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/inspector/inspect/${data.inspection_id}`);
    }
  };

  return (
    <AppShell title="My Tasks" allowedRoles={['inspector']}>
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div></div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 font-medium">No pending tasks</p>
          <p className="text-gray-400 text-sm mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{tasks.length} vehicle{tasks.length !== 1 ? 's' : ''} to inspect</p>
          {tasks.map(task => (
            <button key={task.id} onClick={() => startInspection(task)} className="w-full text-left bg-white rounded-xl p-4 shadow hover:shadow-md transition">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-lg">{task.registration_number}</p>
                  <p className="text-sm text-gray-600">{task.make} {task.model} • {task.vehicle_type}</p>
                  <p className="text-xs text-gray-400">{task.chassis_number}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${task.ownership_type === 'bvc' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                  {task.ownership_type === 'bvc' ? 'BVC' : task.partner_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{task.branch_name} • {task.audit_title}</p>
                  {task.deadline && <p className="text-xs text-red-500 mt-0.5">Due: {task.deadline}</p>}
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${task.inspection_id ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-900 text-white'}`}>
                  {task.inspection_id ? 'Continue' : 'Start'}
                </div>
              </div>
              {task.special_instructions && (
                <div className="mt-2 bg-yellow-50 rounded-lg p-2">
                  <p className="text-xs text-yellow-700"><strong>Note:</strong> {task.special_instructions}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
}
