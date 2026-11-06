import React, { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, BellRing, X } from 'lucide-react';

export default function EmergencyAlert({ alert, onDismiss, onAcknowledge, isMuted }) {
  const audioCtxRef = useRef(null);

  // Play synthesized Web Audio buzzer beep
  useEffect(() => {
    if (!alert || isMuted) return;

    let intervalId;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;

      const playBeep = () => {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // 880 Hz high warning pitch
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15); // alternate to 440 Hz

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      };

      playBeep();
      intervalId = setInterval(playBeep, 1200);
    } catch (e) {
      console.warn("Audio Context error:", e);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [alert, isMuted]);

  if (!alert) return null;

  return (
    <div
      className="animate-flash-danger"
      style={{
        border: '2px solid #ef4444',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          background: '#ef4444',
          borderRadius: '50%',
          width: '42px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(239, 68, 68, 0.8)'
        }}>
          <BellRing size={22} color="#ffffff" className="animate-heartbeat" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase'
            }}>
              {alert.alert_type || "CẢNH BÁO KHẨN CẤP"}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#fca5a5' }}>
              {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
            </span>
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: '4px 0 0 0' }}>
            {alert.message || "Phát hiện sự cố khẩn cấp trên bệnh nhân!"}
          </h2>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => onAcknowledge(alert)}
          style={{
            background: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
          }}
        >
          <CheckCircle size={16} />
          Xác nhận tiếp nhận
        </button>

        <button
          onClick={onDismiss}
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: '#f8fafc',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Tạm ẩn"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
