'use client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  title: string;
  allowedRoles?: string[];
}

export default function AppShell({ children, title, allowedRoles }: AppShellProps) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
    if (!isLoading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      router.push('/');
    }
  }, [user, isLoading, router, allowedRoles]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    inspector: 'Inspector',
    supervisor: 'Supervisor',
    fleet_manager: 'Fleet Manager',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow">
        <div>
          <h1 className="text-lg font-bold leading-tight">{title}</h1>
          <p className="text-blue-200 text-xs">{user.name} • {roleLabels[user.role]}</p>
        </div>
        <button
          onClick={() => { logout(); router.push('/'); }}
          className="text-blue-200 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-800 transition"
        >
          Logout
        </button>
      </header>

      {/* Content */}
      <main className="p-4 max-w-4xl mx-auto pb-20">
        {children}
      </main>
    </div>
  );
}
