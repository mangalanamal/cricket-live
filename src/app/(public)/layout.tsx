import Navbar from '@/components/Navbar';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 60px)' }}>
        {children}
      </main>
      <footer className="footer">
        <p>🏏 CricketLive &mdash; Real-time scores &amp; stats &nbsp;|&nbsp;
          <a href="/admin/login">Admin</a> &nbsp;|&nbsp;
          <a href="/scorer/login">Scorer Login</a>
        </p>
      </footer>
    </>
  );
}
