import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import EmergencyAlert from './components/EmergencyAlert';
import VitalsGrid from './components/VitalsGrid';
import ECGMonitor from './components/ECGMonitor';
import AIDiagnostics from './components/AIDiagnostics';
import DemoPanel from './components/DemoPanel';
import HistoryModal from './components/HistoryModal';

export default function App() {
  const [deviceId, setDeviceId] = useState("esp32_01");
  const [serverHost, setServerHost] = useState(window.location.hostname ? `${window.location.hostname}:8000` : "localhost:8000");
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Realtime Telemetry States
  const [vitals, setVitals] = useState({
    bpm: null,
    spo2: null,
    ax: 0.0,
    ay: 0.0,
    az: 1.0
  });
  const [currentEcgSamples, setCurrentEcgSamples] = useState([]);
  const [isLeadOff, setIsLeadOff] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [emergencyAlert, setEmergencyAlert] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // 1. Initial REST API load for recent vitals
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const res = await fetch(`http://${serverHost}/api/vitals?device_id=${deviceId}&limit=1`);
        if (res.ok) {
          const list = await res.json();
          if (list && list.length > 0) {
            setVitals(list[list.length - 1]);
          }
        }
      } catch (e) {
        console.warn("Could not fetch initial vitals:", e);
      }
    };
    fetchInitial();
  }, [deviceId, serverHost]);

  // 2. Realtime WebSocket Connection
  useEffect(() => {
    let active = true;

    const connectWS = () => {
      if (!serverHost || !deviceId) return;

      const wsUrl = `ws://${serverHost}/ws/realtime/${deviceId}`;
      console.log(`Connecting to WebSocket at ${wsUrl}...`);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!active) return;
        console.log("WebSocket connected successfully!");
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!active) return;
        try {
          const message = JSON.parse(event.data);
          const { event_type, data } = message;

          if (event_type === "VITALS") {
            setVitals({
              bpm: data.bpm,
              spo2: data.spo2,
              ax: data.ax !== undefined ? data.ax : 0.0,
              ay: data.ay !== undefined ? data.ay : 0.0,
              az: data.az !== undefined ? data.az : 1.0
            });
          } else if (event_type === "ECG") {
            if (data.samples && Array.isArray(data.samples)) {
              setCurrentEcgSamples(data.samples);
              // Check if all zeroes (Lead off)
              const allZero = data.samples.every(s => s === 0);
              setIsLeadOff(allZero);
            }
          } else if (event_type === "AI_RESULT") {
            setAiResult(data);
          } else if (event_type === "EMERGENCY_ALERT") {
            setEmergencyAlert(data);
          }
        } catch (err) {
          console.error("Error parsing WebSocket JSON payload:", err);
        }
      };

      ws.onclose = () => {
        if (!active) return;
        console.warn("WebSocket closed. Attempting reconnect in 3s...");
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(connectWS, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        ws.close();
      };
    };

    connectWS();

    return () => {
      active = false;
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [serverHost, deviceId]);

  const handleAcknowledgeAlert = async (alert) => {
    if (alert._id) {
      try {
        await fetch(`http://${serverHost}/api/alerts/${alert._id}/ack`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_acknowledged: true })
        });
      } catch (e) {
        console.error("Error acknowledging alert:", e);
      }
    }
    setEmergencyAlert(null);
  };

  const handleTriggerMockFall = () => {
    setEmergencyAlert({
      alert_type: "EDGE_FALL_DETECTED",
      message: "Cảnh báo ngã khẩn cấp từ thiết bị đeo (Phát hiện gia tốc va đập 3.2g)!",
      severity: "CRITICAL",
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
      
      {/* 1. Header & Controls */}
      <Header
        deviceId={deviceId}
        setDeviceId={setDeviceId}
        serverHost={serverHost}
        setServerHost={setServerHost}
        isConnected={isConnected}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* 2. Flashing Emergency Alert Banner (If Any) */}
      <EmergencyAlert
        alert={emergencyAlert}
        onDismiss={() => setEmergencyAlert(null)}
        onAcknowledge={handleAcknowledgeAlert}
        isMuted={isMuted}
      />

      {/* 3. Vitals 4-Card Grid */}
      <VitalsGrid vitals={vitals} />

      {/* 4. Real-time ECG Oscilloscope Monitor */}
      <ECGMonitor
        ecgData={currentEcgSamples}
        fs={125}
        isLeadOff={isLeadOff}
      />

      {/* 5. AI Diagnostics & Clinical HRV Analysis */}
      <AIDiagnostics aiResult={aiResult} />

      {/* 6. Demo & Test Triggers */}
      <DemoPanel
        serverHost={serverHost}
        deviceId={deviceId}
        onTriggerMockFall={handleTriggerMockFall}
      />

      {/* 7. Historical Data Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        serverHost={serverHost}
        deviceId={deviceId}
      />

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '24px 0 16px 0',
        color: 'var(--text-muted)',
        fontSize: '0.75rem',
        borderTop: '1px solid var(--border-color)',
        marginTop: '24px'
      }}>
        Dự án Hệ thống IoT Giám sát Sinh hiệu & Cảnh báo Nguy cơ Đột quỵ &bull; Kiến trúc FastAPI &bull; AI Random Forest &bull; WebSocket Realtime
      </footer>

    </div>
  );
}
