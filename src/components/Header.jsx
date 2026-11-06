import React, { useState } from 'react';
import { Activity, Wifi, WifiOff, Settings, History, Volume2, VolumeX, ShieldAlert } from 'lucide-react';

export default function Header({
  deviceId,
  setDeviceId,
  serverHost,
  setServerHost,
  isConnected,
  isMuted,
  setIsMuted,
  onOpenHistory,
  onOpenDemo
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [tempHost, setTempHost] = useState(serverHost);
  const [tempDevice, setTempDevice] = useState(deviceId);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setServerHost(tempHost.trim());
    setDeviceId(tempDevice.trim());
    setShowSettings(false);
  };

  return (
    <header className="card-base" style={{ marginBottom: '16px', padding: '12px 20px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Brand & Project Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(14, 165, 233, 0.4)'
          }}>
            <Activity size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
                HỆ THỐNG IOT GIÁM SÁT SINH HIỆU
              </h1>
              <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>AI STROKE GUARD</span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Cảnh báo sớm Rung nhĩ (AFib) & Cấp cứu Té ngã đa biến
            </p>
          </div>
        </div>

        {/* Controls & Status Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Connection Status Badge */}
          <div className={isConnected ? "badge badge-success" : "badge badge-danger"} style={{ padding: '6px 12px' }}>
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isConnected ? "WEBSOCKET ONLINE" : "MẤT KẾT NỐI"}</span>
          </div>

          {/* Current Device Pill */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-color)',
            borderRadius: '9999px',
            padding: '4px 12px',
            fontSize: '0.8rem',
            color: '#38bdf8',
            fontWeight: 600
          }}>
            Thiết bị: <span style={{ color: '#fff' }}>{deviceId}</span>
          </div>

          {/* Mute/Sound Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? "Bật chuông cảnh báo" : "Tắt chuông cảnh báo"}
            style={{
              background: isMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
              border: '1px solid ' + (isMuted ? '#ef4444' : 'var(--border-color)'),
              color: isMuted ? '#ef4444' : '#94a3b8',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              color: '#f8fafc',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 500
            }}
          >
            <History size={16} />
            <span>Lịch sử</span>
          </button>

          {/* Settings Trigger */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: showSettings ? '#0284c7' : 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              color: '#f8fafc',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Cài đặt kết nối"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Settings Dropdown Drawer */}
      {showSettings && (
        <form onSubmit={handleSaveSettings} style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'flex-end'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Host Backend Server (IP:Port)
            </label>
            <input
              type="text"
              value={tempHost}
              onChange={(e) => setTempHost(e.target.value)}
              placeholder="localhost:8000"
              style={{
                background: '#0b1120',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                padding: '6px 12px',
                color: '#fff',
                fontSize: '0.85rem',
                minWidth: '220px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Device ID (Mã thiết bị đeo)
            </label>
            <input
              type="text"
              value={tempDevice}
              onChange={(e) => setTempDevice(e.target.value)}
              placeholder="esp32_01"
              style={{
                background: '#0b1120',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                padding: '6px 12px',
                color: '#fff',
                fontSize: '0.85rem',
                minWidth: '150px'
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              background: '#0284c7',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 16px',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Áp dụng
          </button>
        </form>
      )}
    </header>
  );
}
