import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function PaymentCancel() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderCode = searchParams.get('orderCode');

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.iconCircle}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h2 style={styles.title}>Giao dịch đã bị huỷ</h2>
        <p style={styles.subtitle}>Bạn đã huỷ giao dịch nạp tiền.</p>
        {orderCode && (
          <p style={styles.orderInfo}>Mã giao dịch: <strong>#{orderCode}</strong></p>
        )}
        <button style={styles.btnPrimary} onClick={() => navigate('/dashboard/wallets')}>
          Quay về trang Ví
        </button>
        <button style={styles.btnSecondary} onClick={() => navigate('/dashboard/wallets')}>
          Thử nạp tiền lại
        </button>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

const styles = {
  overlay: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "'Inter', sans-serif",
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    padding: '48px 40px',
    textAlign: 'center',
    maxWidth: '420px',
    width: '100%',
    animation: 'fadeIn 0.5s ease',
    boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
  },
  iconCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: '#f59e0b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    boxShadow: '0 8px 24px rgba(245,158,11,0.4)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '8px',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '15px',
    marginBottom: '16px',
  },
  orderInfo: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '13px',
    marginBottom: '24px',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 32px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    marginBottom: '12px',
  },
  btnSecondary: {
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '14px 32px',
    fontSize: '15px',
    cursor: 'pointer',
    width: '100%',
  },
};
