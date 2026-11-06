import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle, Brain, Activity } from 'lucide-react';

export default function HistoryModal({ isOpen, onClose, serverHost, deviceId }) {
  const [activeTab, setActiveTab] = useState('alerts'); // 'alerts' | 'ai' | 'vitals'
  const [alertsList, setAlertsList] = useState([]);
  const [aiList, setAiList] = useState([]);
  const [vitalsList, setVitalsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Alerts & AI Results
      const alertsRes = await fetch(`http://${serverHost}/api/alerts?device_id=${deviceId}&type=all&limit=30`);
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlertsList(data.alerts || []);
        setAiList(data.ai_results || []);
      }

      // 2. Fetch Vitals History
      const vitalsRes = await fetch(`http://${serverHost}/api/history?device_id=${deviceId}&limit=30`);
      if (vitalsRes.ok) {
        const data = await vitalsRes.json();
        setVitalsList(data.vitals || []);
      }
    } catch (e) {
      console.error("Failed to fetch history:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, serverHost, deviceId]);

  const handleAck = async (alertId) => {
    try {
      const res = await fetch(`http://${serverHost}/api/alerts/${alertId}/ack`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_acknowledged: true })
      });
      if (res.ok) {
        setAlertsList(prev => prev.map(a => a._id === alertId ? { ...a, is_acknowledged: true } : a));
      }
    } catch (e) {
      console.error("Failed to acknowledge alert:", e);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '16px'
    }}>
      <div className="card-base" style={{
        width: '100%',
        maxWidth: '850px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        border: '1px solid var(--border-light)'
      }}>
        
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
              NHẬT KÝ & LỊCH SỬ DỮ LIỆU
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Thiết bị: {deviceId} &bull; Truy vấn MongoDB Time-Series & Standard Collections
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={fetchHistory}
              disabled={isLoading}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem'
              }}
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              Làm mới
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('alerts')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'alerts' ? '#ef4444' : 'rgba(255,255,255,0.05)',
              color: '#fff'
            }}
          >
            Lịch sử Cấp cứu ({alertsList.length})
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'ai' ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
              color: '#fff'
            }}
          >
            Chẩn đoán AI ({aiList.length})
          </button>

          <button
            onClick={() => setActiveTab('vitals')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'vitals' ? '#06b6d4' : 'rgba(255,255,255,0.05)',
              color: '#fff'
            }}
          >
            Chuỗi Sinh hiệu ({vitalsList.length})
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          
          {/* Tab 1: Alerts History */}
          {activeTab === 'alerts' && (
            alertsList.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>Chưa có sự cố cấp cứu nào.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {alertsList.map((item, idx) => (
                  <div key={item._id || idx} style={{
                    background: '#070c17',
                    border: '1px solid ' + (item.is_acknowledged ? 'var(--border-color)' : 'rgba(239, 68, 68, 0.4)'),
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={item.is_acknowledged ? "badge badge-success" : "badge badge-danger"} style={{ fontSize: '0.65rem' }}>
                          {item.alert_type}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', fontWeight: 500 }}>
                        {item.message}
                      </p>
                    </div>

                    {!item.is_acknowledged ? (
                      <button
                        onClick={() => handleAck(item._id)}
                        style={{
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Xác nhận
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#34d399' }}>Đã xác nhận &check;</span>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* Tab 2: AI Diagnosis Results */}
          {activeTab === 'ai' && (
            aiList.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>Chưa có bản ghi phân tích AI nào.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {aiList.map((item, idx) => (
                  <div key={item._id || idx} style={{
                    background: '#070c17',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '10px 14px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span className={item.afib_detected ? "badge badge-danger" : "badge badge-success"} style={{ fontSize: '0.65rem' }}>
                        {item.decision_class || (item.afib_detected ? "AFIB DETECTED" : "NORMAL")}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(item.timestamp).toLocaleString()} &bull; P(AFib): {Math.round((item.afib_probability || 0) * 100)}%
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>{item.recommendation}</p>
                    {item.hrv_metrics && (
                      <div style={{ marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        HR: {item.hrv_metrics.HR_mean || "--"} | RMSSD: {item.hrv_metrics.RMSSD || "--"}ms | pNN50: {item.hrv_metrics.pNN50 || "--"}% | CV_RR: {item.hrv_metrics.CV_RR || "--"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* Tab 3: Vitals Stream History */}
          {activeTab === 'vitals' && (
            vitalsList.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>Chưa có bản ghi sinh hiệu nào.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '6px' }}>Thời gian</th>
                    <th style={{ padding: '6px' }}>BPM</th>
                    <th style={{ padding: '6px' }}>SpO2</th>
                    <th style={{ padding: '6px' }}>Gia tốc SVM</th>
                  </tr>
                </thead>
                <tbody>
                  {vitalsList.map((v, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '6px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {new Date(v.timestamp).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '6px', fontWeight: 600, color: '#f8fafc' }}>{v.bpm || "--"}</td>
                      <td style={{ padding: '6px', fontWeight: 600, color: '#06b6d4' }}>{v.spo2 ? `${v.spo2}%` : "--"}</td>
                      <td style={{ padding: '6px', color: '#c084fc' }}>
                        {(v.ax !== undefined && v.ay !== undefined && v.az !== undefined)
                          ? `${Math.sqrt(v.ax**2 + v.ay**2 + v.az**2).toFixed(2)}g`
                          : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

        </div>

      </div>
    </div>
  );
}
