'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { logoutUser } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';

const adminLinks = [
  { href: '/admin/dashboard',    label: '📊 Dashboard' },
  { href: '/admin/matches',      label: '🏏 Matches' },
  { href: '/admin/teams',        label: '👥 Teams' },
  { href: '/admin/tournaments',  label: '🏆 Tournaments' },
  { href: '/admin/reports',      label: '🗒️ Reports' },
  { href: '/admin/users',        label: '👤 Users' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
    router.push('/admin/login');
  };

  return (
    <>
      {/* Mobile top bar */}
      <div style={{
        display: 'none', position: 'sticky', top: 0, zIndex: 99,
        background: 'var(--green-dark)', color: '#fff',
        padding: '12px 16px', alignItems: 'center', justifyContent: 'space-between',
      }} className="admin-mobile-bar">
        <span style={{ fontWeight: 800, fontSize: 16 }}>🏏 Admin</span>
        <button onClick={() => setOpen(o => !o)}
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20 }}>
          ☰
        </button>
      </div>

      <aside className={`admin-sidebar${open ? ' open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-brand">🏏 Cricket<span>Live</span></div>
          <div style={{ fontSize: 12, opacity: .6, marginTop: 4 }}>Admin Panel</div>
          {profile && (
            <div style={{ fontSize: 12, marginTop: 8, opacity: .8 }}>
              {profile.displayName || profile.email}
            </div>
          )}
        </div>

        <nav className="admin-sidebar-nav">
          {adminLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname.startsWith(l.href) ? 'active' : ''}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
          <Link href="/" style={{ display: 'block', color: 'rgba(255,255,255,.6)', fontSize: 13, marginBottom: 10 }}>
            ← Public Site
          </Link>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm w-full"
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
