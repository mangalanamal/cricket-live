'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser, getUserProfile } from '@/lib/auth';

export default function ScorerLoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await loginUser(email, password);
      const profile = await getUserProfile(cred.user.uid);
      if (!profile || (profile.role !== 'scorer' && profile.role !== 'admin')) {
        setError('Access denied. Scorer accounts only.');
        setLoading(false);
        return;
      }
      router.push('/scorer');
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.message || 'Invalid email or password.');
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <div className="login-logo">
          <div className="login-logo-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>📝</div>
          <div className="login-title">Scorer Login</div>
          <div className="login-sub">Update live matches ball-by-ball</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email" className="form-input"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="scorer@example.com" required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password" className="form-input"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
            />
          </div>
          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading} style={{ background: '#0284c7' }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          <a href="/">← Back to Public Site</a>
        </div>
      </div>
    </div>
  );
}
