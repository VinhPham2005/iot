import React from 'react';
import { Brain, ShieldAlert, CheckCircle, AlertTriangle, Cpu, TrendingUp } from 'lucide-react';

export default function AIDiagnostics({ aiResult }) {
  if (!aiResult) {
    return (
      <div className="card-base" style={{ marginBottom: '16px', padding: '20px', textAlign: 'center' }}>
        <Brain size={32} color="#94a3b8" style={{ margin: '0 auto 8px auto', opacity: 0.6 }} />
        <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Đang đợi cửa sổ 10 giây dữ liệu phân tích từ AI Service...</h3>
      </div>
    );
  }

  const {
    context_status = "NORMAL",
    fall_status = "NO_FALL",
    afib_detected = false,
    afib_probability = 0.0,
    decision_class = "NORMAL_SINUS",
    hrv_metrics = {},
    recommendation = "Điện tim nhịp xoang đều bình thường."
  } = aiResult;

  // Context-aware badge
  let contextBadge = "badge-success";
  let contextLabel = "ỔN ĐỊNH";
  if (context_status === "MILD_HYPOXIA") { contextBadge = "badge-warning"; contextLabel = "HẠ OXY NHẸ"; }
  else if (context_status === "SENSOR_LOOSE") { contextBadge = "badge-info"; contextLabel = "LỎNG CẢM BIẾN / VẬN ĐỘNG"; }
  else if (context_status === "RESPIRATORY_RISK") { contextBadge = "badge-danger"; contextLabel = "NGUY CƠ SUY HÔ HẤP"; }

  // Fall Status Badge
  let fallBadge = "badge-success";
  let fallLabel = "AN TOÀN";
  if (fall_status === "FALL_CONFIRMED") { fallBadge = "badge-danger"; fallLabel = "XÁC NHẬN TÉ NGÃ"; }
  else if (fall_status === "FALSE_IMPACT") { fallBadge = "badge-info"; fallLabel = "VA CHẠM NHẸ"; }
  else if (fall_status === "POTENTIAL_IMPACT") { fallBadge = "badge-warning"; fallLabel = "NGHI NGỜ VA ĐẬP"; }

  // AFib Decision Class Badge
  let afibBadge = "badge-success";
  let afibTitle = "NHỊP XOANG BÌNH THƯỜNG";
  if (decision_class === "AFIB_HIGH_RISK" || afib_detected) {
    afibBadge = "badge-danger";
    afibTitle = "NGUY CƠ ĐỘT QUỴ (RUNG NHĨ)";
  } else if (decision_class === "ARRHYTHMIA_WARNING") {
    afibBadge = "badge-warning";
    afibTitle = "THEO DÕI LOẠN NHỊP NHẸ";
  }

  const probPercent = Math.round(afib_probability * 100);

  return (
    <div className="card-base" style={{ marginBottom: '16px', padding: '20px' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            borderRadius: '8px',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Brain size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              TRÍ TUỆ NHÂN TẠO CHẨN ĐOÁN LÂM SÀNG (AI SERVICE)
            </h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Mô hình Hybrid: Random Forest &bull; Lọc nhiễu ngữ cảnh &bull; Biến thiên nhịp tim (HRV)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`badge ${afibBadge}`} style={{ fontSize: '0.75rem', padding: '6px 14px' }}>
            {afibTitle}
          </span>
        </div>
      </div>

      {/* Grid: 3 Diagnosis Modules */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '16px'
      }}>
        
        {/* Card 1: Context-Aware SpO2 & Motion */}
        <div style={{ background: '#0b1120', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              MODULE 1: LỌC NHIỄU NGỮ CẢNH (SPO2)
            </span>
            <span className={`badge ${contextBadge}`}>{contextLabel}</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#e2e8f0', margin: '6px 0 0 0' }}>
            {context_status === "SENSOR_LOOSE" 
              ? "Phát hiện tay cử động mạnh làm lỏng kẹp SpO2 — Đã tự động chặn báo động giả!" 
              : context_status === "RESPIRATORY_RISK"
              ? "Bệnh nhân bất động nhưng SpO2 < 92% — Nguy cơ suy hô hấp thực sự!"
              : "Tín hiệu SpO2 và trạng thái chuyển động đồng bộ, tin cậy."}
          </p>
        </div>

        {/* Card 2: 3-Phase Fall Detection */}
        <div style={{ background: '#0b1120', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              MODULE 2: XÁC MINH TÉ NGÃ 3 PHA
            </span>
            <span className={`badge ${fallBadge}`}>{fallLabel}</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#e2e8f0', margin: '6px 0 0 0' }}>
            {fall_status === "FALL_CONFIRMED"
              ? "Cảnh báo đỏ: Đã xác nhận va đập mạnh, cơ thể đổi trục và nằm bất động!"
              : fall_status === "FALSE_IMPACT"
              ? "Chỉ là va quệt thông thường, bệnh nhân vẫn tiếp tục cử động."
              : "Tư thế bệnh nhân ổn định, không ghi nhận biến cố rơi/ngã."}
          </p>
        </div>

        {/* Card 3: AFib Probability Meter */}
        <div style={{ background: '#0b1120', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              MODULE 4: XÁC SUẤT RUNG NHĨ P(AFIB)
            </span>
            <span className="font-telemetry" style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: probPercent >= 70 ? '#ef4444' : probPercent >= 45 ? '#f59e0b' : '#10b981'
            }}>
              {probPercent}%
            </span>
          </div>

          <div style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden', margin: '8px 0' }}>
            <div style={{
              width: `${probPercent}%`,
              height: '100%',
              background: probPercent >= 70 ? '#ef4444' : probPercent >= 45 ? '#f59e0b' : '#10b981',
              transition: 'width 0.4s ease'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>Bình thường (&lt;45%)</span>
            <span>Nghi ngờ (45-70%)</span>
            <span>Nguy cơ cao (&ge;70%)</span>
          </div>
        </div>

      </div>

      {/* 5 HRV Features Table */}
      {hrv_metrics && Object.keys(hrv_metrics).length > 0 && (
        <div style={{
          background: '#070c17',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Cpu size={16} color="#38bdf8" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>
              5 CHỈ SỐ BIẾN THIÊN NHỊP TIM (HRV CLINICAL METRICS TRÍCH XUẤT TỪ SÓNG ECG)
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px'
          }}>
            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>HR_mean</div>
              <div className="font-telemetry" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                {hrv_metrics.HR_mean || "--"} <span style={{ fontSize: '0.7rem' }}>BPM</span>
              </div>
            </div>

            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RMSSD (Độ giật nhịp)</div>
              <div className="font-telemetry" style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: (hrv_metrics.RMSSD >= 100) ? '#ef4444' : '#f8fafc'
              }}>
                {hrv_metrics.RMSSD || "--"} <span style={{ fontSize: '0.7rem' }}>ms</span>
              </div>
            </div>

            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>pNN50 (Lệch &gt;50ms)</div>
              <div className="font-telemetry" style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: (hrv_metrics.pNN50 >= 50) ? '#ef4444' : '#f8fafc'
              }}>
                {hrv_metrics.pNN50 || "--"} <span style={{ fontSize: '0.7rem' }}>%</span>
              </div>
            </div>

            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CV_RR (Hệ số biến thiên)</div>
              <div className="font-telemetry" style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: (hrv_metrics.CV_RR >= 0.12) ? '#ef4444' : '#f8fafc'
              }}>
                {hrv_metrics.CV_RR || "--"}
              </div>
            </div>

            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Shannon Entropy (H)</div>
              <div className="font-telemetry" style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: (hrv_metrics.Shannon_H >= 1.80) ? '#ef4444' : '#f8fafc'
              }}>
                {hrv_metrics.Shannon_H || "--"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Medical AI Recommendation */}
      <div style={{
        background: afib_detected ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.08)',
        border: '1px solid ' + (afib_detected ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.2)'),
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        {afib_detected ? <AlertTriangle size={20} color="#ef4444" /> : <CheckCircle size={20} color="#10b981" />}
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: afib_detected ? '#f87171' : '#34d399', textTransform: 'uppercase' }}>
            Khuyến nghị y khoa:
          </span>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#f1f5f9' }}>
            {recommendation}
          </p>
        </div>
      </div>

    </div>
  );
}
