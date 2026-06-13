import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking | success | failed
  const [newBalance, setNewBalance] = useState(null);
  const [message, setMessage] = useState('Đang xác nhận giao dịch...');
  const pollCount = useRef(0);

  const orderCode = searchParams.get('orderCode');

  useEffect(() => {
    if (!orderCode) {
      setStatus('failed');
      setMessage('Không tìm thấy mã giao dịch.');
      return;
    }
    pollPaymentStatus();
  }, []);

  const pollPaymentStatus = async () => {
    const storedToken = localStorage.getItem('bw_token') || localStorage.getItem('token');
    if (!storedToken) {
      navigate('/login');
      return;
    }
    const token = storedToken.startsWith('Bearer ') ? storedToken : `Bearer ${storedToken}`;

    try {
      const res = await axios.get(`${API_BASE}/api/payos/check/${orderCode}`, {
        headers: { Authorization: token },
      });

      if (res.data.status === 'PAID') {
        setStatus('success');
        setNewBalance(res.data.newBalance);
        setMessage('Nạp tiền thành công!');
      } else if (res.data.status === 'CANCELLED') {
        setStatus('failed');
        setMessage('Giao dịch đã bị huỷ.');
      } else {
        // Chưa xử lý xong, thử lại
        pollCount.current += 1;
        if (pollCount.current < 10) {
          setTimeout(pollPaymentStatus, 2000);
        } else {
          setStatus('success');
          setMessage('Giao dịch đang được xử lý. Số dư sẽ cập nhật sau vài phút.');
        }
      }
    } catch (err) {
      console.error(err);
      setStatus('success');
      setMessage('Giao dịch đang được xử lý. Vui lòng kiểm tra lịch sử giao dịch.');
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {status === 'checking' && (
          <>
            <div style={styles.spinner}></div>
            <h2 style={styles.title}>Đang xác nhận...</h2>
            <p style={styles.subtitle}>{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={styles.iconCircle('#22c55e')}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2 style={{ ...styles.title, color: '#22c55e' }}>Nạp tiền thành công! 🎉</h2>
            <p style={styles.subtitle}>{message}</p>
            {newBalance != null && (
              <div style={styles.balanceBox}>
                <span style={styles.balanceLabel}>Số dư mới</span>
                <span style={styles.balanceValue}>
                  {newBalance.toLocaleString('vi-VN')}₫
                </span>
              </div>
            )}
            <p style={styles.orderInfo}>Mã giao dịch: <strong>#{orderCode}</strong></p>
            <button style={styles.btn('#6366f1')} onClick={() => navigate('/dashboard/wallets')}>
              Về trang Ví
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div style={styles.iconCircle('#ef4444')}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <h2 style={{ ...styles.title, color: '#ef4444' }}>Giao dịch thất bại</h2>
            <p style={styles.subtitle}>{message}</p>
            <button style={styles.btn('#6366f1')} onClick={() => navigate('/dashboard/wallets')}>
              Thử lại
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
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
  spinner: {
    width: '60px',
    height: '60px',
    border: '4px solid rgba(255,255,255,0.2)',
    borderTop: '4px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 24px',
  },
  iconCircle: (color) => ({
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    boxShadow: `0 8px 24px ${color}55`,
  }),
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '8px',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '15px',
    marginBottom: '20px',
  },
  balanceBox: {
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.3)',
    borderRadius: '12px',
    padding: '16px 24px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  balanceValue: {
    color: '#22c55e',
    fontSize: '28px',
    fontWeight: '800',
  },
  orderInfo: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '13px',
    marginBottom: '24px',
  },
  btn: (bg) => ({
    background: `linear-gradient(135deg, ${bg}, ${bg}dd)`,
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 32px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.2s ease',
  }),
};
