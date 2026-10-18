import cv2
import mediapipe as mp
import numpy as np
import csv  # Thư viện ghi file dữ liệu cấu trúc

# 1. KHỞI TẠO MEDIAPIPE POSE (Phiên bản tương thích 0.10.14)
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)

def calculate_angle(a, b, c):
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180.0: angle = 360 - angle
    return angle

video_path = 'source/91_01010.mp4'
cap = cv2.VideoCapture(video_path)
fps = int(cap.get(cv2.CAP_PROP_FPS))

# 2. KHỞI TẠO FILE CSV DATA INTERFACE
csv_filename = 'exercise_analysis_data.csv'
csv_file = open(csv_filename, mode='w', newline='', encoding='utf-8')
csv_writer = csv.writer(csv_file)

# Tạo tiêu đề cột cho file dữ liệu (Data Schema)
csv_writer.writerow([
    'Frame',          # Khung hình thứ mấy
    'Timestamp (s)',  # Giây thứ mấy trong video
    'Knee_Angle',     # Góc đầu gối (Tính năng chính cho Squat)
    'Hip_X', 'Hip_Y', # Tọa độ Hông (Để phân tích độ lệch trọng tâm)
    'Knee_X', 'Knee_Y',# Tọa độ Gối
    'Ankle_X', 'Ankle_Y'# Tọa độ Cổ chân
])

frame_count = 0
print("👉 AI đang trích xuất dữ liệu ra file CSV...")

while cap.isOpened():
    ret, frame = cap.read()
    if not ret: break
    
    frame_count += 1
    timestamp = round(frame_count / fps, 2)
    
    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(image)
    
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark
        
        # Lấy tọa độ các khớp
        hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
        knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
        ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
        
        # Tính góc gối
        knee_angle = round(calculate_angle(hip, knee, ankle), 2)
        
        # BƯỚC QUAN TRỌNG: Ghi toàn bộ dữ liệu của khung hình này vào dòng CSV
        csv_writer.writerow([
            frame_count, timestamp, knee_angle,
            round(hip[0], 4), round(hip[1], 4),
            round(knee[0], 4), round(knee[1], 4),
            round(ankle[0], 4), round(ankle[1], 4)
        ])

cap.release()
csv_file.close()
print(f"🎉 Đã xuất dữ liệu Interface thành công ra file: {csv_filename}")
