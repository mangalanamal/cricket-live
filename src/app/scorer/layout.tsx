'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { logoutUser } from '@/lib/auth';

export default function ScorerLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only allow scorer and admin to access scorer panel
    if (!loading && (!profile || (profile.role !== 'scorer' && profile.role !== 'admin'))) {
      router.replace('/scorer/login');
    }
  }, [profile, loading, router]);

  if (loading || !profile) return (
    <div className="spinner-overlay" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{ background: 'var(--green-dark)', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/scorer" style={{ fontWeight: 800, fontSize: 18 }}>
          🏏 Scorer Panel
        </Link>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>{profile.displayName || profile.email}</span>
          <button onClick={() => logoutUser().then(() => router.replace('/scorer/login'))} className="btn btn-ghost btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
            Logout
          </button>
        </div>
      </nav>
      <main className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
        {children}
      </main>
    </div>
  );
}
