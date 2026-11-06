import React, { useRef, useEffect } from 'react';
import { Activity, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ECGMonitor({ ecgData, fs = 125, isLeadOff = false }) {
  const canvasRef = useRef(null);
  const dataBufferRef = useRef([]);
  const sweepIndexRef = useRef(0);
  const [invertPolarity, setInvertPolarity] = React.useState(false);
  const invertPolarityRef = useRef(false);
  const [filter50Hz, setFilter50Hz] = React.useState(true);
  const filter50HzRef = useRef(true);

  useEffect(() => {
    invertPolarityRef.current = invertPolarity;
  }, [invertPolarity]);

  useEffect(() => {
    filter50HzRef.current = filter50Hz;
  }, [filter50Hz]);

  // Accumulate incoming samples into buffer
  useEffect(() => {
    if (ecgData && Array.isArray(ecgData)) {
      dataBufferRef.current.push(...ecgData);
      // Keep buffer bounded
      if (dataBufferRef.current.length > 2500) {
        dataBufferRef.current = dataBufferRef.current.slice(-1500);
      }
    }
  }, [ecgData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let baseline = null;
    let prevAcVal = 0;
    let smoothVal = 0;

    // Fixed points on display (e.g. 800 horizontal points across screen)
    const pointsCount = canvas.width;
    const displayWaveform = new Float32Array(pointsCount).fill(canvas.height / 2);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;

      // Pull new samples from buffer
      const samplesToProcess = Math.min(dataBufferRef.current.length, 6);
      for (let s = 0; s < samplesToProcess; s++) {
        const rawVal = dataBufferRef.current.shift();
        
        if (rawVal === 0) {
          // Tuột điện cực
          displayWaveform[sweepIndexRef.current] = midY;
        } else {
          // Tự động bám mức DC (Auto-Centering Baseline Tracker)
          if (baseline === null) {
            baseline = rawVal;
          } else {
            baseline = 0.985 * baseline + 0.015 * rawVal;
          }

          let acVal = rawVal - baseline;
          if (invertPolarityRef.current) {
            acVal = -acVal; // Đảo chiều nếu dán ngược cực RA / LL
          }

          let finalVal = acVal;
          // BỘ LỌC TRIỆT TIÊU NHIỄU ĐIỆN LƯỚI 50Hz & LỌC THÔNG THẤP (LOW-PASS 28Hz)
          if (filter50HzRef.current) {
            const notchVal = 0.5 * (acVal + prevAcVal);
            prevAcVal = acVal;
            smoothVal = 0.55 * notchVal + 0.45 * smoothVal;
            finalVal = smoothVal;
          }

          // Chuẩn hóa biên độ: đưa sóng nằm gọn gàng, rõ nét ở giữa màn hình
          const normalized = finalVal / 450.0;
          const canvasY = midY - (normalized * (height * 0.38));
          displayWaveform[sweepIndexRef.current] = Math.max(12, Math.min(height - 12, canvasY));
        }

        sweepIndexRef.current = (sweepIndexRef.current + 1) % width;
      }

      // 1. Clear Canvas with slight phosphor persistence
      ctx.fillStyle = '#020705';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Medical Grid (50px major, 10px minor)
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.04)';
      for (let x = 0; x < width; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 10) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
      for (let x = 0; x < width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 3. Draw ECG Line Trace
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(16, 185, 129, 0.7)';
      ctx.shadowBlur = 8;

      const sweep = sweepIndexRef.current;
      const eraseWidth = 24; // Width of scanning eraser bar

      // First segment: from (sweep + eraseWidth) to width
      ctx.beginPath();
      let started = false;
      for (let i = (sweep + eraseWidth) % width; i < width; i++) {
        const y = displayWaveform[i];
        if (!started) {
          ctx.moveTo(i, y);
          started = true;
        } else {
          ctx.lineTo(i, y);
        }
      }
      ctx.stroke();

      // Second segment: from 0 to (sweep - 2)
      if (sweep > 2) {
        ctx.beginPath();
        ctx.moveTo(0, displayWaveform[0]);
        for (let i = 1; i < sweep; i++) {
          ctx.lineTo(i, displayWaveform[i]);
        }
        ctx.stroke();
      }

      // 4. Draw Scanning Erase Bar (Sweep Head)
      const grad = ctx.createLinearGradient(sweep, 0, sweep + eraseWidth, 0);
      grad.addColorStop(0, 'rgba(2, 7, 5, 0.95)');
      grad.addColorStop(1, 'rgba(2, 7, 5, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(sweep, 0, eraseWidth, height);

      // Sweep indicator beam
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(sweep, 0);
      ctx.lineTo(sweep, height);
      ctx.stroke();

      ctx.shadowBlur = 0;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="card-base" style={{ marginBottom: '16px', padding: '16px 20px' }}>
      
      {/* Header bar of ECG Oscilloscope */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={20} color="#10b981" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
            SÓNG ĐIỆN TIM REALTIME (AD8232 — CHUYỂN ĐẠO II)
          </h2>
          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
            {fs} Hz
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setFilter50Hz(!filter50Hz)}
            style={{
              cursor: 'pointer',
              background: filter50Hz ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              color: filter50Hz ? '#34d399' : 'var(--text-muted)',
              border: filter50Hz ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.15)',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
            title="Bật/Tắt bộ lọc thông thấp triệt tiêu nhiễu điện lưới 50Hz"
          >
            {filter50Hz ? '⚡ Lọc 50Hz: BẬT' : '⚡ Lọc 50Hz: TẮT'}
          </button>

          <button
            onClick={() => setInvertPolarity(!invertPolarity)}
            style={{
              cursor: 'pointer',
              background: invertPolarity ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              color: invertPolarity ? '#facc15' : 'var(--text-muted)',
              border: invertPolarity ? '1px solid #facc15' : '1px solid rgba(255, 255, 255, 0.15)',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
            title="Đảo chiều đồ thị nếu bạn dán ngược điện cực RA và LL"
          >
            {invertPolarity ? 'Đã đảo cực' : 'Đảo cực'}
          </button>

          {isLeadOff ? (
            <span className="badge badge-danger">
              <AlertCircle size={14} /> TUỘT ĐIỆN CỰC (LEAD OFF)
            </span>
          ) : (
            <span className="badge badge-success">
              <ShieldCheck size={14} /> TÍN HIỆU TỐT
            </span>
          )}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            25 mm/s | 10 mm/mV
          </span>
        </div>
      </div>

      {/* Canvas Screen */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '240px',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid #134e4a',
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8)'
      }}>
        <canvas
          ref={canvasRef}
          width={900}
          height={240}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
        
        {/* Overlay Grid Scale Watermark */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '12px',
          fontSize: '0.7rem',
          color: 'rgba(16, 185, 129, 0.4)',
          fontFamily: 'monospace',
          pointerEvents: 'none'
        }}>
          HỆ THỐNG GIÁM SÁT SÓNG ĐIỆN TIM CHUẨN ĐỒ HỌA Y KHOA
        </div>
      </div>

    </div>
  );
}
