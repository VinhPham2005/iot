#include <Wire.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ==========================================
// 1. CẤU HÌNH WIFI & MQTT BROKER
// ==========================================
const char* WIFI_SSID   = "Quang1973";   // Điền tên Hotspot iPhone
const char* WIFI_PASS   = "04111973";     // Điền mật khẩu Hotspot
const char* MQTT_SERVER = "192.168.1.8";          // IP máy tính qua mạng Hotspot
const int   MQTT_PORT   = 1883;
const char* DEVICE_ID   = "esp32_01";

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ==========================================
// 2. CẤU HÌNH CẢM BIẾN
// ==========================================
#define SDA_PIN 21
#define SCL_PIN 22

// --- OLED ---
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// --- AD8232 (ECG) ---
#define ECG_PIN 34
#define LO_PLUS 15
#define LO_MINUS 14
const int ECG_FS = 125;           // 125 Hz
const int ECG_PACKET_SIZE = 25;   // Gửi 25 mẫu/lần (~200ms)
int ecgBuffer[ECG_PACKET_SIZE];
int ecgSampleIndex = 0;

// --- MPU6050 (Té ngã) ---
const int MPU_ADDR = 0x68;
float accX = 0, accY = 0, accZ = 1.0;

// --- MAX30102 (Nhịp tim & SpO2) ---
#define BUFFER_SIZE 100
#define FINGER_THRESHOLD 10000    // Ngưỡng phát hiện có ngón tay
MAX30105 particleSensor;
uint32_t irBuffer[BUFFER_SIZE];
uint32_t redBuffer[BUFFER_SIZE];
int32_t spo2 = 0;
int8_t validSpO2 = 0;
int32_t heartRate = 0;
int8_t validHeartRate = 0;
int maxBufferCount = 0;
bool isFingerOn = false;

// Biến thời gian
unsigned long lastEcgTime = 0;
unsigned long lastMpuTime = 0;
unsigned long lastVitalsMqttTime = 0;

// ==========================================
// BỘ LỌC NHỊP TIM NÂNG CAO (PHẢN HỒI NHANH & CHỐNG NHẢY VỌT)
// ==========================================
#define FILTER_SIZE 4
int bpmBuffer[FILTER_SIZE];
int bpmBufIndex = 0;
int bpmBufCount = 0;
float smoothBPM = 0.0;

int filterHeartRate(int rawBpm) {
  // 1. Loại bỏ giá trị ngoài ngưỡng sinh lý
  if (rawBpm < 45 || rawBpm > 175) return (smoothBPM > 40) ? (int)round(smoothBPM) : rawBpm;

  // 2. Đưa vào mảng để lấy Trung vị (Median Filter)
  bpmBuffer[bpmBufIndex] = rawBpm;
  bpmBufIndex = (bpmBufIndex + 1) % FILTER_SIZE;
  if (bpmBufCount < FILTER_SIZE) bpmBufCount++;

  int tempArr[FILTER_SIZE];
  for (int i = 0; i < bpmBufCount; i++) tempArr[i] = bpmBuffer[i];
  
  for (int i = 0; i < bpmBufCount - 1; i++) {
    for (int j = i + 1; j < bpmBufCount; j++) {
      if (tempArr[i] > tempArr[j]) {
        int t = tempArr[i]; tempArr[i] = tempArr[j]; tempArr[j] = t;
      }
    }
  }
  int medianBpm = tempArr[bpmBufCount / 2];

  // 3. Phản hồi tức thì khi mới đặt tay hoặc cập nhật nhanh
  if (smoothBPM < 30 || bpmBufCount <= 2) {
    smoothBPM = medianBpm; // Hiện ngay lập tức, không làm trễ
  } else {
    // Chống hiện tượng đếm đúp (Double-Peak vọt lên 150 BPM)
    if (abs(medianBpm - smoothBPM) > 22) {
      medianBpm = (medianBpm > smoothBPM) ? (smoothBPM + 8) : (smoothBPM - 8);
    }
    // Cập nhật nhạy hơn: 50% nhịp mới + 50% nhịp cũ (phản xạ nhanh gấp đôi)
    smoothBPM = 0.5 * smoothBPM + 0.5 * medianBpm;
  }

  return (int)round(smoothBPM);
}

// ==========================================
// HÀM HIỂN THỊ OLED (KHÔNG CÒN NHIỆT ĐỘ)
// ==========================================
void updateOLED() {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Tiêu đề
  display.setTextSize(1);
  display.setCursor(0, 0); 
  display.println("HEALTH MONITOR IOT");
  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  // Hiển thị BPM (Đo 100% từ MAX30102)
  display.setCursor(0, 16); 
  display.print("BPM:");
  display.setTextSize(2);
  display.setCursor(0, 28);
  if (isFingerOn && validHeartRate && heartRate >= 40 && heartRate <= 180) {
    display.print(heartRate);
  } else {
    display.print("--"); // Không có giá trị mặc định
  }

  // Hiển thị SpO2 (Đo 100% từ MAX30102)
  display.setTextSize(1);
  display.setCursor(70, 16); 
  display.print("SpO2:");
  display.setTextSize(2);
  display.setCursor(70, 28);
  if (isFingerOn && validSpO2 && spo2 >= 70 && spo2 <= 100) {
    display.print(spo2);
    display.print("%");
  } else {
    display.print("--"); // Không có giá trị mặc định
  }

  // Trạng thái cảm biến
  display.setTextSize(1);
  display.setCursor(0, 52);
  if (!isFingerOn) {
    display.print("Dat tay vao cam bien");
  } else {
    display.print("Dang do sinh hieu...");
  }

  display.display();
}

// ==========================================
// KẾT NỐI WIFI & MQTT
// ==========================================
void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT...");
    if (mqttClient.connect(DEVICE_ID)) {
      Serial.println(" connected!");
    } else {
      Serial.print(" failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retry in 2s");
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000); // Tăng tốc độ I2C 400kHz chống trễ

  // Khởi tạo OLED
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 20); display.println("Ket noi WiFi...");
  display.display();

  // Khởi tạo WiFi (xóa sạch cache NVS cũ)
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println("\nWiFi da ket noi!");
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);

  // Khởi tạo chân AD8232
  pinMode(LO_PLUS, INPUT);
  pinMode(LO_MINUS, INPUT);

  // Khởi tạo MPU6050
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0);
  Wire.endTransmission(true);

  // Khởi tạo MAX30102 (Tối ưu tốc độ lấy mẫu: sampleAverage = 2, sampleRate = 200Hz để phản hồi nhanh)
  particleSensor.begin(Wire, I2C_SPEED_FAST);
  particleSensor.setup(0x3F, 2, 2, 200, 411, 4096);
  particleSensor.setPulseAmplitudeRed(0x3F);
  particleSensor.setPulseAmplitudeIR(0x3F);

  updateOLED();
}

void loop() {
  if (!mqttClient.connected()) reconnectMQTT();
  mqttClient.loop();

  unsigned long currentMillis = millis();

  // ----------------------------------------------------
  // TÁC VỤ 1: ĐỌC SÓNG ECG (125 Hz - mỗi 8ms)
  // ----------------------------------------------------
  if (currentMillis - lastEcgTime >= 8) {
    lastEcgTime = currentMillis;

    int val = 0;
    if (digitalRead(LO_PLUS) == 1 || digitalRead(LO_MINUS) == 1) {
      val = 0; // Tuột điện cực
    } else {
      val = analogRead(ECG_PIN); // Đọc giá trị raw chân 34
    }

    ecgBuffer[ecgSampleIndex++] = val;

    if (ecgSampleIndex >= ECG_PACKET_SIZE) {
      ecgSampleIndex = 0;

      StaticJsonDocument<512> doc;
      doc["device_id"] = DEVICE_ID;
      doc["ts"] = (long)(currentMillis / 1000);
      doc["fs"] = ECG_FS;
      JsonArray samples = doc.createNestedArray("samples");
      for (int i = 0; i < ECG_PACKET_SIZE; i++) {
        samples.add(ecgBuffer[i]);
      }

      char buffer[512];
      serializeJson(doc, buffer);
      mqttClient.publish("device/esp32_01/ecg", buffer, false);
    }
  }

  // ----------------------------------------------------
  // TÁC VỤ 2: ĐỌC GIA TỐC MPU6050 (Chuẩn đơn vị g)
  // ----------------------------------------------------
  if (currentMillis - lastMpuTime >= 50) {
    lastMpuTime = currentMillis;

    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x3B);
    Wire.endTransmission(false);
    Wire.requestFrom(MPU_ADDR, 6, true);

    if (Wire.available() >= 6) {
      int16_t rawX = Wire.read() << 8 | Wire.read();
      int16_t rawY = Wire.read() << 8 | Wire.read();
      int16_t rawZ = Wire.read() << 8 | Wire.read();

      // Đơn vị g chuẩn (không nhân 9.81)
      accX = rawX / 16384.0;
      accY = rawY / 16384.0;
      accZ = rawZ / 16384.0;
    }
  }

  // ----------------------------------------------------
  // TÁC VỤ 3: ĐỌC MAX30102 (Nhịp tim & SpO2 - CẬP NHẬT TỨC THÌ)
  // ----------------------------------------------------
  particleSensor.check();
  while (particleSensor.available()) {
    memmove(&redBuffer[0], &redBuffer[1], (BUFFER_SIZE - 1) * sizeof(uint32_t));
    memmove(&irBuffer[0], &irBuffer[1], (BUFFER_SIZE - 1) * sizeof(uint32_t));
    redBuffer[BUFFER_SIZE - 1] = particleSensor.getRed();
    irBuffer[BUFFER_SIZE - 1] = particleSensor.getIR();
    particleSensor.nextSample();
    maxBufferCount++;
  }

  // Cứ sau 15 mẫu mới thu thập (~150ms), tính toán và cập nhật màn hình ngay lập tức!
  if (maxBufferCount >= 15) {
    if (irBuffer[BUFFER_SIZE - 1] < FINGER_THRESHOLD) {
      // KHÔNG CÓ NGÓN TAY: Reset toàn bộ bộ lọc để không nhớ số cũ
      isFingerOn = false;
      validSpO2 = 0;
      validHeartRate = 0;
      heartRate = 0;
      spo2 = 0;
      smoothBPM = 0.0;
      bpmBufCount = 0;
      bpmBufIndex = 0;
    } else {
      // CÓ NGÓN TAY: Chạy thuật toán tính toán thật
      isFingerOn = true;
      maxim_heart_rate_and_oxygen_saturation(
        irBuffer, BUFFER_SIZE, redBuffer,
        &spo2, &validSpO2, &heartRate, &validHeartRate
      );

      // --- ÁP DỤNG BỘ LỌC PHẢN HỒI NHANH & CHỐNG NHẢY VỌT 150 BPM ---
      if (validHeartRate == 1 && heartRate >= 45 && heartRate <= 180) {
        heartRate = filterHeartRate(heartRate);
      } else if (smoothBPM > 40) {
        // Nếu nhịp tức thời bị nhiễu chập chờn, giữ lại giá trị mượt gần nhất
        heartRate = (int)round(smoothBPM);
        validHeartRate = 1;
      }
    }
    updateOLED(); // Cập nhật kết quả lên màn hình OLED liên tục không có độ trễ
    maxBufferCount = 0;
  }

  // ----------------------------------------------------
  // TÁC VỤ 4: GỬI SINH HIỆU LÊN MQTT (Mỗi 1 giây - KHÔNG GỬI SỐ ẢO)
  // ----------------------------------------------------
  if (currentMillis - lastVitalsMqttTime >= 1000) {
    lastVitalsMqttTime = currentMillis;

    StaticJsonDocument<256> doc;
    doc["device_id"] = DEVICE_ID;
    doc["ts"] = (long)(currentMillis / 1000);

    // 1. Nhịp tim BPM: Chỉ gửi nếu có ngón tay & đo được hợp lệ
    if (isFingerOn && validHeartRate && heartRate >= 40 && heartRate <= 180) {
      doc["bpm"] = heartRate;
    } else {
      doc["bpm"] = nullptr; // Gửi null nếu không đo được (Không dùng 75.0 nữa!)
    }

    // 2. Nồng độ oxy SpO2: Chỉ gửi nếu có ngón tay & đo được hợp lệ
    if (isFingerOn && validSpO2 && spo2 >= 70 && spo2 <= 100) {
      doc["spo2"] = spo2;
    } else {
      doc["spo2"] = nullptr; // Gửi null nếu không đo được (Không dùng 98.0 nữa!)
    }

    // 3. Gia tốc MPU6050
    doc["ax"] = round(accX * 1000) / 1000.0;
    doc["ay"] = round(accY * 1000) / 1000.0;
    doc["az"] = round(accZ * 1000) / 1000.0;

    // ĐÃ LOẠI BỎ TRƯỜNG "temp" HOÀN TOÀN KHỎI GÓI TIN

    char buffer[256];
    serializeJson(doc, buffer);
    mqttClient.publish("device/esp32_01/vitals", buffer, false);
  }
}