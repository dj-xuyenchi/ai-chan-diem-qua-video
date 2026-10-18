import pandas as pd
import matplotlib.pyplot as plt

# 1. Đọc dữ liệu từ file CSV vừa tạo
df = pd.read_csv('exercise_analysis_data.csv')

# 2. Khởi tạo khung vẽ biểu đồ
plt.figure(figsize=(10, 5))

# 3. Vẽ đường biến thiên góc đầu gối theo thời gian (Timestamp)
plt.plot(df['Timestamp (s)'], df['Knee_Angle'], color='blue', linewidth=2, label='Góc đầu gối thực tế')

# Vẽ một đường thẳng nằm ngang đại diện cho đích đến (Ví dụ Squat chuẩn = 90 độ)
plt.axhline(y=90, color='red', linestyle='--', label='Ngưỡng Squat chuẩn (90°)')

# 4. Trang trí biểu đồ
plt.title('BIỂU ĐỒ PHÂN TÍCH ĐỘNG TÁC THEO THỜI GIAN', fontsize=14, fontweight='bold')
plt.xlabel('Thời gian (Giây)', fontsize=12)
plt.ylabel('Góc gập đầu gối (Độ)', fontsize=12)
plt.grid(True, linestyle=':', alpha=0.6)
plt.legend()

# Giới hạn trục Y từ 0 đến 180 độ để dễ quan sát
plt.ylim(0, 190)

# 5. Lưu biểu đồ thành file ảnh và hiển thị lên màn hình
plt.savefig('exercise_chart.png')
print("🎉 Đã lưu biểu đồ phân tích thành file ảnh: exercise_chart.png")
plt.show()
