import React from 'react';
import { Heart, Activity, Compass } from 'lucide-react';

export default function VitalsGrid({ vitals }) {
  const rawBpm = vitals?.bpm;
  const rawSpo2 = vitals?.spo2;
  const hasBpm = typeof rawBpm === 'number' && rawBpm > 0;
  const hasSpo2 = typeof rawSpo2 === 'number' && rawSpo2 > 0;

  const bpm = hasBpm ? Math.round(rawBpm) : "--";
  const spo2 = hasSpo2 ? Math.round(rawSpo2) : "--";
  const ax = vitals?.ax !== undefined ? vitals.ax.toFixed(2) : "0.00";
  const ay = vitals?.ay !== undefined ? vitals.ay.toFixed(2) : "0.00";
  const az = vitals?.az !== undefined ? vitals.az.toFixed(2) : "1.00";

  // Calculate SVM magnitude
  const svmVal = (vitals?.ax !== undefined && vitals?.ay !== undefined && vitals?.az !== undefined)
    ? Math.sqrt(vitals.ax**2 + vitals.ay**2 + vitals.az**2).toFixed(2)
    : "1.00";

  // BPM Status
  let bpmStatus = "CHƯA ĐẶT TAY";
  let bpmBadge = "badge-info";
  if (hasBpm) {
    if (bpm > 100) { bpmStatus = "NHỊP NHANH"; bpmBadge = "badge-warning"; }
    else if (bpm < 60) { bpmStatus = "NHỊP CHẬM"; bpmBadge = "badge-info"; }
    else { bpmStatus = "BÌNH THƯỜNG"; bpmBadge = "badge-success"; }
  }

  // SpO2 Status
  let spo2Status = "CHƯA ĐẶT TAY";
  let spo2Badge = "badge-info";
  let spo2Color = "#06b6d4";
  if (hasSpo2) {
    if (spo2 < 92) { spo2Status = "NGUY CƠ HẠ OXY"; spo2Badge = "badge-danger"; spo2Color = "#ef4444"; }
    else if (spo2 >= 92 && spo2 < 95) { spo2Status = "HẠ NHẸ"; spo2Badge = "badge-warning"; spo2Color = "#f59e0b"; }
    else { spo2Status = "BÌNH THƯỜNG"; spo2Badge = "badge-success"; spo2Color = "#10b981"; }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '16px',
      marginBottom: '16px'
    }}>
      
      {/* 1. Nhịp tim (BPM) */}
      <div className="card-base" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            NHỊP TIM (HR)
          </span>
          <Heart size={20} color="#ef4444" className={hasBpm ? "animate-heartbeat" : ""} />
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
          <span className="font-telemetry" style={{ fontSize: '3rem', fontWeight: 700, color: hasBpm ? '#f8fafc' : '#64748b', lineHeight: 1 }}>
            {bpm}
          </span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>BPM</span>
        </div>

        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className={`badge ${bpmBadge}`}>{bpmStatus}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mục tiêu: 60-100</span>
        </div>
      </div>

      {/* 2. Nồng độ Oxy máu (SpO2) */}
      <div className="card-base">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            NỒNG ĐỘ OXY (SpO2)
          </span>
          <Activity size={20} color="#06b6d4" />
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
          <span className="font-telemetry" style={{ fontSize: '3rem', fontWeight: 700, color: hasSpo2 ? spo2Color : '#64748b', lineHeight: 1 }}>
            {hasSpo2 ? `${spo2}` : "--"}
          </span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>%</span>
        </div>

        <div style={{ marginTop: '12px' }}>
          {/* Progress bar */}
          <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{
              width: hasSpo2 ? `${Math.min(spo2, 100)}%` : '0%',
              height: '100%',
              background: spo2Color,
              transition: 'width 0.4s ease'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={`badge ${spo2Badge}`}>{spo2Status}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>An toàn: &ge; 95%</span>
          </div>
        </div>
      </div>

      {/* 3. Gia tốc MPU6050 & SVM */}
      <div className="card-base">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            VẬN ĐỘNG (MPU6050)
          </span>
          <Compass size={20} color="#a855f7" />
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
          <span className="font-telemetry" style={{ fontSize: '3rem', fontWeight: 700, color: Number(svmVal) > 2.0 ? '#ef4444' : '#c084fc', lineHeight: 1 }}>
            {svmVal}
          </span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>g (SVM)</span>
        </div>

        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          <span>X: {ax}g</span>
          <span>Y: {ay}g</span>
          <span>Z: {az}g</span>
        </div>
      </div>

    </div>
  );
}
