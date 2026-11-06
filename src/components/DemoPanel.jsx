import React, { useState } from 'react';
import { PlayCircle, ShieldAlert, Zap, CheckCircle2 } from 'lucide-react';

export default function DemoPanel({ serverHost, deviceId, onTriggerMockFall }) {
  const [isInjecting, setIsInjecting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleInjectAFib = async () => {
    setIsInjecting(true);
    setFeedback(null);
    try {
      const res = await fetch(`http://${serverHost}/api/demo/inject-afib`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId })
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'success',
          msg: 'Đã nạp 10s sóng ECG Rung nhĩ mẫu vào hệ thống & AI Service đang phân tích!'
        });
      } else {
        setFeedback({
          type: 'error',
          msg: `Lỗi: ${data.message || 'Không thể gọi demo API'}`
        });
      }
    } catch (e) {
      setFeedback({
        type: 'error',
        msg: `Lỗi kết nối tới Backend: ${e.message}`
      });
    } finally {
      setIsInjecting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  return (
    <div className="card-base" style={{ marginBottom: '16px', padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#f59e0b" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
              CỤM PHÍM BẢO VỆ & THỬ NGHIỆM KỊCH BẢN (DEMO SCENARIOS)
            </h3>
          </div>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Dành cho giảng viên và hội đồng kiểm thử 3 kịch bản vận hành mà không cần đợi bệnh nhân thực tế
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Button 1: Inject AFib */}
          <button
            onClick={handleInjectAFib}
            disabled={isInjecting}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: isInjecting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)'
            }}
          >
            <PlayCircle size={16} />
            {isInjecting ? "Đang nạp sóng..." : "Kịch bản 3: Nạp ECG Rung nhĩ (AFib)"}
          </button>

          {/* Button 2: Simulate Fall */}
          <button
            onClick={onTriggerMockFall}
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)'
            }}
          >
            <ShieldAlert size={16} />
            Kịch bản 2: Test Cảnh báo Ngã / SOS
          </button>

        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '0.8rem',
          background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: feedback.type === 'success' ? '#34d399' : '#f87171',
          border: '1px solid ' + (feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
        }}>
          {feedback.msg}
        </div>
      )}
    </div>
  );
}
