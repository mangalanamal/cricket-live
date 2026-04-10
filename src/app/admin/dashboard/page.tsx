'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllMatches, getTeams, getTournaments } from '@/lib/firestore';
import { Match, Team, Tournament } from '@/lib/types';

export default function AdminDashboard() {
  const [matches, setMatches]         = useState<Match[]>([]);
  const [teams, setTeams]             = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([getAllMatches(), getTeams(), getTournaments()]).then(([m, t, to]) => {
      setMatches(m); setTeams(t); setTournaments(to);
      setLoading(false);
    });
  }, []);

  const live      = matches.filter(m => m.status === 'live').length;
  const scheduled = matches.filter(m => m.status === 'scheduled').length;
  const completed = matches.filter(m => m.status === 'completed').length;

  const statCards = [
    { label: 'Total Matches',    value: matches.length,     icon: '🏏', href: '/admin/matches',     color: 'var(--green-main)' },
    { label: 'Live Now',         value: live,               icon: '🔴', href: '/admin/matches',     color: '#e53e3e' },
    { label: 'Upcoming',         value: scheduled,          icon: '🗓️', href: '/admin/matches',     color: '#f0a500' },
    { label: 'Teams',            value: teams.length,       icon: '👥', href: '/admin/teams',       color: 'var(--green-dark)' },
    { label: 'Tournaments',      value: tournaments.length, icon: '🏆', href: '/admin/tournaments', color: '#6c5ce7' },
    { label: 'Completed',        value: completed,          icon: '✅', href: '/admin/matches',     color: '#2d7a4f' },
  ];

  return (
    <div>
      <div className="admin-topbar">
        <h1>📊 Dashboard</h1>
        <Link href="/admin/matches" className="btn btn-primary btn-sm">+ Schedule Match</Link>
      </div>

      {loading ? (
        <div className="spinner-overlay"><div className="spinner" /></div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 28 }}>
            {statCards.map(s => (
              <Link key={s.label} href={s.href} style={{ display: 'block' }}>
                <div className="card card-padded" style={{ textAlign: 'center', transition: 'box-shadow .2s' }}
                  onMouseOver={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
                  onMouseOut={e => (e.currentTarget.style.boxShadow = '')}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Live matches */}
          {live > 0 && (
            <>
              <h2 className="section-heading">🔴 Live Matches</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {matches.filter(m => m.status === 'live').map(m => (
                  <div key={m.id} className="card card-padded" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{m.team1Name} vs {m.team2Name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.tournamentName} · {m.venue}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link href={`/match/${m.id}`} className="btn btn-ghost btn-sm">View →</Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Quick links */}
          <h2 className="section-heading">Quick Actions</h2>
          <div className="grid-2">
            {[
              { href: '/admin/matches',     label: '+ Schedule New Match',     icon: '🏏' },
              { href: '/admin/teams',       label: '+ Add New Team',           icon: '👥' },
              { href: '/admin/tournaments', label: '+ Create Tournament',      icon: '🏆' },
              { href: '/admin/users',       label: '👤 Manage Users & Roles',  icon: '' },
            ].map(a => (
              <Link key={a.href} href={a.href} className="btn btn-ghost w-full" style={{ justifyContent: 'flex-start', gap: 10 }}>
                {a.icon} {a.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
