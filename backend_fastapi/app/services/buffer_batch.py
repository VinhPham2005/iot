import asyncio
import logging
import math
from collections import deque
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.database import db

logger = logging.getLogger("backend.buffer_batch")

class BufferBatchManager:
    def __init__(self):
        self.vitals_queue = asyncio.Queue()
        self.ecg_queue = asyncio.Queue()
        self.accel_queue = asyncio.Queue()

        # In-memory sliding ring buffer for last 10-30 seconds of data per device
        # Key: device_id -> { "vitals": deque(maxlen=30), "ecg": deque(maxlen=1500), "accel": deque(maxlen=100) }
        self.ring_buffers: Dict[str, Dict[str, deque]] = {}
        self.is_running = False

    def _get_device_ring(self, device_id: str) -> Dict[str, deque]:
        if device_id not in self.ring_buffers:
            self.ring_buffers[device_id] = {
                "vitals": deque(maxlen=30),       # ~30s of vitals @ 1Hz
                "ecg": deque(maxlen=1500),        # ~12s of ECG samples @ 125Hz
                "accel": deque(maxlen=100)        # ~30-50s of accel readings
            }
        return self.ring_buffers[device_id]

    async def push_vitals(self, payload: dict):
        device_id = payload.get("device_id")
        ts = payload.get("ts", datetime.now(timezone.utc).timestamp())
        dt = datetime.fromtimestamp(ts, tz=timezone.utc) if isinstance(ts, (int, float)) else datetime.now(timezone.utc)
        
        # 1. Update in-memory RingBuffer
        ring = self._get_device_ring(device_id)
        ring["vitals"].append({
            "timestamp": ts,
            "bpm": payload.get("bpm"),
            "spo2": payload.get("spo2"),
            "temp": payload.get("temp")
        })

        ax = payload.get("ax", 0.0)
        ay = payload.get("ay", 0.0)
        az = payload.get("az", 1.0)
        svm = math.sqrt(ax**2 + ay**2 + az**2)
        
        ring["accel"].append({
            "timestamp": ts,
            "ax": ax,
            "ay": ay,
            "az": az,
            "svm": svm
        })

        # 2. Push to Queues for Batch Writing into MongoDB Time-Series Collections
        vitals_doc = {
            "device_id": device_id,
            "timestamp": dt,
            "bpm": payload.get("bpm"),
            "spo2": payload.get("spo2"),
            "temp": payload.get("temp")
        }
        await self.vitals_queue.put(vitals_doc)

        accel_doc = {
            "device_id": device_id,
            "timestamp": dt,
            "ax": ax,
            "ay": ay,
            "az": az,
            "svm": svm
        }
        await self.accel_queue.put(accel_doc)

    async def push_ecg(self, payload: dict):
        device_id = payload.get("device_id")
        ts = payload.get("ts", datetime.now(timezone.utc).timestamp())
        dt = datetime.fromtimestamp(ts, tz=timezone.utc) if isinstance(ts, (int, float)) else datetime.now(timezone.utc)
        fs = payload.get("fs", 125)
        samples = payload.get("samples", [])

        ring = self._get_device_ring(device_id)
        ring["ecg"].extend(samples)

        ecg_doc = {
            "device_id": device_id,
            "timestamp": dt,
            "fs": fs,
            "samples": samples
        }
        await self.ecg_queue.put(ecg_doc)

    def get_sliding_window(self, device_id: str) -> Optional[Dict[str, Any]]:
        """Fetches up to last 10 seconds of data for AI v1 analysis"""
        if device_id not in self.ring_buffers:
            return None
        ring = self.ring_buffers[device_id]
        
        vitals_list = list(ring["vitals"])[-10:]
        accel_list = list(ring["accel"])[-10:]
        ecg_samples = list(ring["ecg"])[-1250:]  # 10s @ 125Hz = 1250 samples

        return {
            "device_id": device_id,
            "timestamp": datetime.now(timezone.utc).timestamp(),
            "vitals": {
                "bpm": [v["bpm"] for v in vitals_list if v.get("bpm") is not None],
                "spo2": [v["spo2"] for v in vitals_list if v.get("spo2") is not None],
                "temp": [v["temp"] for v in vitals_list if v.get("temp") is not None]
            },
            "accel": {
                "ax": [a["ax"] for a in accel_list],
                "ay": [a["ay"] for a in accel_list],
                "az": [a["az"] for a in accel_list],
                "svm": [a["svm"] for a in accel_list]
            },
            "ecg": {
                "samples": ecg_samples,
                "fs": 125
            }
        }

    def get_sliding_window_v2(self, device_id: str) -> Optional[Dict[str, Any]]:
        """Fetches and packages data strictly adhering to AI v2 AnalyzeRequestV2 contract"""
        if device_id not in self.ring_buffers:
            return None
        ring = self.ring_buffers[device_id]

        vitals_list = list(ring["vitals"])[-10:]
        accel_list = list(ring["accel"])[-10:]
        ecg_samples = list(ring["ecg"])[-1250:]  # 1250 samples @ 125 Hz = 10.0s

        if not vitals_list and not ecg_samples and not accel_list:
            return None

        fs_ecg = 125
        duration = len(ecg_samples) / fs_ecg if ecg_samples else 10.0
        now_dt = datetime.now(timezone.utc)
        end_time = now_dt
        start_time = datetime.fromtimestamp(now_dt.timestamp() - duration, tz=timezone.utc)

        # Build Vitals Window conforming to v2 Contract
        spo2_samples = []
        bpm_samples = []
        for idx, item in enumerate(vitals_list):
            item_ts = item.get("timestamp")
            if item_ts:
                t_dt = datetime.fromtimestamp(item_ts, tz=timezone.utc)
            else:
                t_dt = datetime.fromtimestamp(start_time.timestamp() + idx, tz=timezone.utc)
            
            # Clamp strictly within [start_time, end_time)
            if t_dt < start_time:
                t_dt = start_time
            if t_dt >= end_time:
                t_dt = datetime.fromtimestamp(end_time.timestamp() - 0.05, tz=timezone.utc)

            spo2_val = item.get("spo2")
            if spo2_val is not None and 0 <= spo2_val <= 100:
                spo2_samples.append({"timestamp": t_dt.isoformat(), "value": float(spo2_val)})

            bpm_val = item.get("bpm")
            if bpm_val is not None and 0 <= bpm_val <= 300:
                bpm_samples.append({"timestamp": t_dt.isoformat(), "value": float(bpm_val)})

        # Deduplicate timestamps to satisfy strictly increasing validator
        def make_strictly_increasing(samples):
            sorted_samples = sorted(samples, key=lambda x: x["timestamp"])
            result = []
            last_ts = None
            for s in sorted_samples:
                if last_ts is None or s["timestamp"] > last_ts:
                    result.append(s)
                    last_ts = s["timestamp"]
            return result

        spo2_clean = make_strictly_increasing(spo2_samples)
        bpm_clean = make_strictly_increasing(bpm_samples)

        v2_payload = {
            "schema_version": "2.0",
            "device_id": str(device_id),
            "session_id": f"sess_{device_id}",
            "window_id": f"win_{int(now_dt.timestamp() * 1000)}",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat()
        }

        if ecg_samples and len(ecg_samples) >= 125 * 3:
            v2_payload["ecg"] = {
                "fs": fs_ecg,
                "unit": "adc",
                "samples": [float(x) for x in ecg_samples],
                "lead_off": False
            }

        if spo2_clean or bpm_clean:
            v2_payload["vitals"] = {
                "spo2": spo2_clean,
                "bpm": bpm_clean
            }

        return v2_payload

    async def start_batch_worker(self):
        """Worker flushes queues every 3 seconds or when queue contains >= 50 items"""
        self.is_running = True
        logger.info("Batch DB Worker started.")
        while self.is_running:
            try:
                await asyncio.sleep(3.0)
                await self._flush_queue(self.vitals_queue, "vitals")
                await self._flush_queue(self.accel_queue, "accel")
                await self._flush_queue(self.ecg_queue, "ecg")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in batch worker: {e}", exc_info=True)

    async def _flush_queue(self, q: asyncio.Queue, collection_name: str):
        if q.empty():
            return
        items = []
        while not q.empty() and len(items) < 100:
            items.append(q.get_nowait())
            q.task_done()
        
        if items and db.db is not None:
            try:
                col = db.db[collection_name]
                await col.insert_many(items)
            except Exception as e:
                logger.error(f"Failed to batch insert {len(items)} into {collection_name}: {e}")

buffer_manager = BufferBatchManager()
