'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser, registerAdmin, getUserProfile } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await registerAdmin(email, password);
        router.push('/admin/dashboard');
      } else {
        const cred = await loginUser(email, password);
        const profile = await getUserProfile(cred.user.uid);
        if (!profile || profile.role !== 'admin') {
          setError('Access denied. Admin accounts only.');
          setLoading(false);
          return;
        }
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <div className="login-logo">
          <div className="login-logo-icon">🏏</div>
          <div className="login-title">Admin {isRegister ? 'Setup' : 'Login'}</div>
          <div className="login-sub">CricketLive Administration</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleAuth}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email" className="form-input"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com" required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password" className="form-input"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            {loading ? 'Processing…' : (isRegister ? 'Create Admin Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button 
            type="button" 
            onClick={() => setIsRegister(!isRegister)} 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isRegister ? 'Already have an account? Sign In' : 'First time setup? Create Admin Account'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          <a href="/scorer/login">Scorer login →</a>
        </div>
      </div>
    </div>
  );
}
