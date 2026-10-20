import argparse
import csv
import json
import math
import sys
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


SAMPLE_POINTS = 60
FRAME_SAMPLE_RATE = 4


def calculate_angle(a, b, c):
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(
        c[1] - b[1], c[0] - b[0]
    )
    angle = abs(radians * 180.0 / np.pi)
    return 360.0 - angle if angle > 180.0 else angle


def analyze_video(video_path):
    video_path = Path(video_path)
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise ValueError(f"Không mở được video: {video_path.name}")

    fps = capture.get(cv2.CAP_PROP_FPS)
    frame_count = capture.get(cv2.CAP_PROP_FRAME_COUNT)
    if not math.isfinite(fps) or fps <= 0 or frame_count <= 0:
        capture.release()
        raise ValueError(f"Video không có thông tin thời lượng hợp lệ: {video_path.name}")

    duration = frame_count / fps
    frame_interval = max(1, round(fps / FRAME_SAMPLE_RATE))
    pose_model = mp.solutions.pose
    features = []
    sampled_frames = 0

    try:
        with pose_model.Pose(
            static_image_mode=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        ) as pose:
            frame_index = 0
            while True:
                success, frame = capture.read()
                if not success:
                    break

                if frame_index % frame_interval == 0:
                    sampled_frames += 1
                    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    result = pose.process(image)
                    if result.pose_landmarks:
                        landmarks = result.pose_landmarks.landmark
                        angles = []
                        hip_positions = []
                        for side in ("LEFT", "RIGHT"):
                            hip = landmarks[getattr(pose_model.PoseLandmark, f"{side}_HIP").value]
                            knee = landmarks[getattr(pose_model.PoseLandmark, f"{side}_KNEE").value]
                            ankle = landmarks[getattr(pose_model.PoseLandmark, f"{side}_ANKLE").value]
                            if min(hip.visibility, knee.visibility, ankle.visibility) >= 0.5:
                                angles.append(
                                    calculate_angle(
                                        (hip.x, hip.y), (knee.x, knee.y), (ankle.x, ankle.y)
                                    )
                                )
                                hip_positions.append(hip.y)
                        if angles:
                            features.append(
                                (
                                    frame_index / fps,
                                    float(np.mean(angles)),
                                    float(np.mean(hip_positions)),
                                )
                            )

                frame_index += 1
    finally:
        capture.release()

    if len(features) < 5:
        raise ValueError(
            f"Không nhận diện đủ tư thế trong video {video_path.name}; "
            "hãy dùng video thấy rõ toàn thân."
        )

    return {
        "duration": duration,
        "coverage": len(features) / max(sampled_frames, 1),
        "features": np.asarray(features, dtype=np.float64),
    }


def movement_duration(video):
    features = video["features"]
    knee_angles = features[:, 1]
    variation = float(np.max(knee_angles) - np.min(knee_angles))
    if variation < 8:
        return video["duration"]

    threshold = max(5, variation * 0.15)
    active_indices = np.flatnonzero(np.abs(knee_angles - np.median(knee_angles)) >= threshold)
    if len(active_indices) < 3:
        return video["duration"]

    cadence = video["duration"] / max(len(features), 1)
    active_duration = features[active_indices[-1], 0] - features[active_indices[0], 0] + cadence
    return max(cadence, float(active_duration))


def compare_videos(reference_path, submission_path):
    reference = analyze_video(reference_path)
    submission = analyze_video(submission_path)

    reference_positions = np.linspace(0, reference["duration"], SAMPLE_POINTS)
    submission_positions = np.linspace(0, submission["duration"], SAMPLE_POINTS)
    reference_features = np.column_stack(
        [
            np.interp(
                reference_positions,
                reference["features"][:, 0],
                reference["features"][:, column],
            )
            for column in range(1, 3)
        ]
    )
    submission_features = np.column_stack(
        [
            np.interp(
                submission_positions,
                submission["features"][:, 0],
                submission["features"][:, column],
            )
            for column in range(1, 3)
        ]
    )

    knee_error = np.abs(reference_features[:, 0] - submission_features[:, 0])
    hip_error = np.abs(reference_features[:, 1] - submission_features[:, 1]) * 100
    similarity = np.mean(
        0.8 * np.maximum(0, 1 - knee_error / 90)
        + 0.2 * np.maximum(0, 1 - hip_error / 30)
    ) * 100

    reference_movement = movement_duration(reference)
    submission_movement = movement_duration(submission)
    duration_ratio = submission_movement / reference_movement
    speed_difference = (duration_ratio - 1) * 100
    speed_match = max(0, 100 - min(abs(speed_difference), 100))
    suggested_score = (similarity * 0.8 + speed_match * 0.2) / 10
    if speed_difference > 5:
        speed_assessment = "SLOWER"
    elif speed_difference < -5:
        speed_assessment = "FASTER"
    else:
        speed_assessment = "SIMILAR"

    confidence = min(reference["coverage"], submission["coverage"]) * 100
    return {
        "similarityPercent": round(float(similarity), 1),
        "speedDifferencePercent": round(float(speed_difference), 1),
        "speedAssessment": speed_assessment,
        "suggestedScore": round(float(suggested_score), 1),
        "confidencePercent": round(float(confidence), 1),
        "referenceMovementSeconds": round(reference_movement, 1),
        "submissionMovementSeconds": round(submission_movement, 1),
        "scoreBreakdown": "80% độ tương đồng góc gối/tọa độ hông, 20% thời lượng động tác ước tính",
    }


def export_csv(video_path, csv_filename):
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise ValueError(f"Không mở được video: {video_path}")
    fps = capture.get(cv2.CAP_PROP_FPS)
    if not math.isfinite(fps) or fps <= 0:
        capture.release()
        raise ValueError("Video không có thông tin tốc độ khung hình hợp lệ")

    pose_model = mp.solutions.pose
    frame_count = 0
    try:
        with open(csv_filename, mode="w", newline="", encoding="utf-8") as csv_file:
            writer = csv.writer(csv_file)
            writer.writerow(
                [
                    "Frame",
                    "Timestamp (s)",
                    "Knee_Angle",
                    "Hip_X",
                    "Hip_Y",
                    "Knee_X",
                    "Knee_Y",
                    "Ankle_X",
                    "Ankle_Y",
                ]
            )
            with pose_model.Pose(
                min_detection_confidence=0.5, min_tracking_confidence=0.5
            ) as pose:
                while True:
                    success, frame = capture.read()
                    if not success:
                        break
                    frame_count += 1
                    result = pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                    if not result.pose_landmarks:
                        continue

                    landmarks = result.pose_landmarks.landmark
                    hip = landmarks[pose_model.PoseLandmark.LEFT_HIP.value]
                    knee = landmarks[pose_model.PoseLandmark.LEFT_KNEE.value]
                    ankle = landmarks[pose_model.PoseLandmark.LEFT_ANKLE.value]
                    angle = calculate_angle(
                        (hip.x, hip.y), (knee.x, knee.y), (ankle.x, ankle.y)
                    )
                    writer.writerow(
                        [
                            frame_count,
                            round(frame_count / fps, 2),
                            round(angle, 2),
                            round(hip.x, 4),
                            round(hip.y, 4),
                            round(knee.x, 4),
                            round(knee.y, 4),
                            round(ankle.x, 4),
                            round(ankle.y, 4),
                        ]
                    )
    finally:
        capture.release()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reference")
    parser.add_argument("--submission")
    parser.add_argument("--input", default="source/91_01010.mp4")
    parser.add_argument("--csv-output", default="exercise_analysis_data.csv")
    arguments = parser.parse_args()

    if arguments.reference and arguments.submission:
        print(
            json.dumps(
                compare_videos(arguments.reference, arguments.submission),
                ensure_ascii=False,
            )
        )
    elif not arguments.reference and not arguments.submission:
        export_csv(arguments.input, arguments.csv_output)
        print(f"Đã xuất dữ liệu thành công ra file: {arguments.csv_output}")
    else:
        parser.error("Cần truyền cả --reference và --submission")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, cv2.error) as error:
        print(str(error), file=sys.stderr)
        sys.exit(2)
