# Giao Diện Giám Sát Sinh Hiệu & Cảnh Báo Nguy Cơ Đột Quỵ (React + Vite)

Dashboard thời gian thực chuẩn thiết bị theo dõi y tế (Bedside Patient Telemetry Monitor), kết nối trực tiếp với **Processing Backend FastAPI** thông qua WebSocket (`ws://localhost:8000/ws/realtime/{device_id}`).

---

## 1. Tính năng nổi bật
* **Đồ thị sóng điện tim ECG Realtime (Oscilloscope Sweep):** Sử dụng HTML5 Canvas vẽ dạng sóng quét mượt mà với lưới tọa độ y khoa chuẩn 25 mm/s.
* **4 Thẻ Sinh hiệu chính (Vitals Grid):** Nhịp tim (BPM) nhấp nháy theo nhịp tim thật, Nồng độ oxy trong máu ($\text{SpO}_2$), Thân nhiệt ($^\circ\text{C}$), và Gia tốc rung lắc ($SVM$, $a_x, a_y, a_z$).
* **Bảng chẩn đoán Trí tuệ Nhân tạo (AI Diagnostics):**
  * Module 1: Trạng thái lọc nhiễu ngữ cảnh SpO2 & cử động (`SENSOR_LOOSE`, `RESPIRATORY_RISK`).
  * Module 2: Trạng thái xác minh té ngã 3 pha (`FALL_CONFIRMED`, `FALSE_IMPACT`).
  * Module 3 & 4: Đo lường 5 chỉ số biến thiên nhịp tim ($HR_{mean}$, $RMSSD$, $pNN50$, $CV_{RR}$, $Shannon\_H$) và xác suất rung nhĩ $P(\text{AFib})\%$.
* **Cảnh báo khẩn cấp (Emergency Alert Banner):** Tự động phát âm thanh còi hú (Web Audio API) và nhấp nháy đỏ rực rỡ khi có biến cố ngã hoặc rung nhĩ, có nút xác nhận tiếp nhận cấp cứu.
* **Cụm phím thử nghiệm Demo (Demo Triggers):** Cho phép gọi nạp mẫu sóng Rung nhĩ (`/api/demo/inject-afib`) để kiểm tra toàn trình ngay trên giao diện.
* **Nhật ký & Lịch sử (History Modal):** Tra cứu dữ liệu quá khứ từ MongoDB Time-Series.

---

## 2. Cách khởi chạy

### Cách 1: Chạy bằng file `start.bat`
Click đúp chuột vào file `start.bat`.

### Cách 2: Chạy qua Terminal
Mở terminal tại thư mục này và gõ:
```bash
npm run dev
```

Mở trình duyệt truy cập: **`http://localhost:3000`**
