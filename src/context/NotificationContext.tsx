'use client';
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationState {
  show: boolean;
  title: string;
  message: string;
  type: NotificationType;
  isConfirm: boolean;
  resolve?: (val: boolean) => void;
}

interface NotificationContextType {
  showAlert: (title: string, message: string, type?: NotificationType) => Promise<void>;
  showConfirm: (title: string, message: string) => Promise<boolean>;
  showToast: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<NotificationState>({
    show: false, title: '', message: '', type: 'info', isConfirm: false
  });

  const [toasts, setToasts] = useState<{ id: number; message: string; type: NotificationType }[]>([]);

  const showAlert = useCallback((title: string, message: string, type: NotificationType = 'info') => {
    return new Promise<void>((resolve) => {
      setModal({ show: true, title, message, type, isConfirm: false, resolve: () => resolve() });
    });
  }, []);

  const showConfirm = useCallback((title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      setModal({ show: true, title, message, type: 'warning', isConfirm: true, resolve });
    });
  }, []);

  const showToast = useCallback((message: string, type: NotificationType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const handleClose = (result: boolean) => {
    if (modal.resolve) modal.resolve(result);
    setModal(prev => ({ ...prev, show: false }));
  };

  return (
    <NotificationContext.Provider value={{ showAlert, showConfirm, showToast }}>
      {children}
      
      {/* Modal / Alert UI */}
      {modal.show && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            width: '90%', maxWidth: '400px', backgroundColor: '#fff',
            borderRadius: '20px', padding: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            textAlign: 'center', animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: '30px',
              backgroundColor: modal.type === 'success' ? '#e8f5ee' : modal.type === 'error' ? '#fde8e8' : '#fff3cd',
              color: modal.type === 'success' ? '#2d7a4f' : modal.type === 'error' ? '#d0362a' : '#856404'
            }}>
              {modal.type === 'success' ? '✅' : modal.type === 'error' ? '❌' : '⚠️'}
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '10px', color: '#1a2920' }}>{modal.title}</h3>
            <p style={{ fontSize: '15px', color: '#5a7a68', marginBottom: '28px', lineHeight: 1.5 }}>{modal.message}</p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {modal.isConfirm && (
                <button 
                  onClick={() => handleClose(false)}
                  style={{
                    padding: '12px 24px', borderRadius: '12px', border: '1.5px solid #d6e4db',
                    background: '#fff', color: '#5a7a68', fontWeight: 600, cursor: 'pointer', flex: 1
                  }}
                >
                  Cancel
                </button>
              )}
              <button 
                onClick={() => handleClose(true)}
                style={{
                  padding: '12px 24px', borderRadius: '12px', border: 'none',
                  background: modal.type === 'error' ? '#d0362a' : '#2d7a4f', 
                  color: '#fff', fontWeight: 600, cursor: 'pointer', flex: 1,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                {modal.isConfirm ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts UI */}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 10001,
        display: 'flex', flexDirection: 'column', gap: '10px'
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: '12px 20px', borderRadius: '12px', background: '#1a2920', color: '#fff',
            fontSize: '14px', fontWeight: 600, boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: '10px',
            animation: 'slideLeft 0.3s ease-out'
          }}>
            <span style={{ color: t.type === 'success' ? '#3da066' : '#f0a500' }}>
              {t.type === 'success' ? '●' : '●'}
            </span>
            {t.message}
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideLeft { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </NotificationContext.Provider>
  );
}

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};
