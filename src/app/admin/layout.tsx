'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (loading) return; // Wait for the observer to finish
    
    if (!isLoginPage) {
      if (!profile) {
        // Only redirect if we definitely are not getting a profile
        router.replace('/admin/login');
      } else if (profile.role !== 'admin') {
        router.replace('/admin/login');
      }
    }
  }, [profile, loading, router, isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading || !profile) return (
    <div className="spinner-overlay" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content">{children}</div>
    </div>
  );
}
