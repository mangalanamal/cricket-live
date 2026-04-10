'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const links = [
  { href: '/',             label: 'Live' },
  { href: '/schedule',     label: 'Schedule' },
  { href: '/tournaments',  label: 'Tournaments' },
  { href: '/stats',        label: 'Stats' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand">
          🏏 Cricket<span>Live</span>
        </Link>

        <ul className={`navbar-links${open ? ' open' : ''}`}>
          {links.map(l => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={pathname === l.href ? 'active' : ''}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/admin/login" onClick={() => setOpen(false)}
              style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>
              Admin
            </Link>
          </li>
          <li>
            <Link href="/scorer/login" onClick={() => setOpen(false)}
              style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>
              Scorer
            </Link>
          </li>
        </ul>

        <button
          className="navbar-mobile-toggle"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>
    </nav>
  );
}
