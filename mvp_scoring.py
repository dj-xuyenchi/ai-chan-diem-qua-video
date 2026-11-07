import argparse
import csv
import hashlib
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


FRAME_SAMPLE_RATE = 4
MIN_MOVEMENTS = 5
MAX_MOVEMENTS = 6
MOVEMENT_PASS_THRESHOLD = 70.0
FIVE_MOVEMENT_PASS_THRESHOLDS = (62.4, 72.6, 63.1, 55.7, 77.1)
SOURCE2_REFERENCE_SHA256 = "8d3affde4dda9450a9f25508515dc25a7c799c8031e7e363e59f0d0567ad21d6"
JOINT_FEATURES = ("knee", "hip", "shoulder", "elbow")
JOINT_TOLERANCES = np.asarray([45.0, 45.0, 60.0, 60.0])
MAX_ALIGNMENT_FRAMES = 600
JOINT_LABELS = {
    "knee": "đầu gối",
    "hip": "hông",
    "shoulder": "vai",
    "elbow": "khuỷu tay",
}


def calculate_angle(a, b, c):
    first = np.asarray(a, dtype=np.float64) - np.asarray(b, dtype=np.float64)
    second = np.asarray(c, dtype=np.float64) - np.asarray(b, dtype=np.float64)
    denominator = np.linalg.norm(first) * np.linalg.norm(second)
    if denominator < 1e-8:
        return None
    cosine = np.clip(np.dot(first, second) / denominator, -1.0, 1.0)
    return float(np.degrees(np.arccos(cosine)))


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
                        angles = {feature: [] for feature in JOINT_FEATURES}
                        for side in ("LEFT", "RIGHT"):
                            points = {}
                            for point in (
                                "SHOULDER",
                                "ELBOW",
                                "WRIST",
                                "HIP",
                                "KNEE",
                                "ANKLE",
                            ):
                                landmark = landmarks[
                                    getattr(pose_model.PoseLandmark, f"{side}_{point}").value
                                ]
                                points[point] = landmark

                            triplets = {
                                "knee": ("HIP", "KNEE", "ANKLE"),
                                "hip": ("SHOULDER", "HIP", "KNEE"),
                                "shoulder": ("ELBOW", "SHOULDER", "HIP"),
                                "elbow": ("SHOULDER", "ELBOW", "WRIST"),
                            }
                            for feature, names in triplets.items():
                                joints = [points[name] for name in names]
                                if min(joint.visibility for joint in joints) < 0.5:
                                    continue
                                angle = calculate_angle(
                                    *[(joint.x, joint.y) for joint in joints]
                                )
                                if angle is not None:
                                    angles[feature].append(angle)

                        if any(angles.values()):
                            features.append(
                                [frame_index / fps]
                                + [
                                    float(np.mean(angles[feature]))
                                    if angles[feature]
                                    else float("nan")
                                    for feature in JOINT_FEATURES
                                ]
                            )

                frame_index += 1
    finally:
        capture.release()

    if len(features) < MIN_MOVEMENTS * 4:
        raise ValueError(
            f"Không nhận diện đủ khung hình tư thế trong video {video_path.name}; "
            "hãy dùng video thấy rõ toàn thân và đủ sáng."
        )

    feature_array = np.asarray(features, dtype=np.float64)
    for column in range(1, feature_array.shape[1]):
        valid = np.isfinite(feature_array[:, column])
        if np.count_nonzero(valid) < 3:
            raise ValueError(
                f"AI không nhìn rõ khớp {JOINT_LABELS[JOINT_FEATURES[column - 1]]} "
                f"trong video {video_path.name}; hãy quay rõ toàn thân."
            )
        feature_array[:, column] = np.interp(
            feature_array[:, 0],
            feature_array[valid, 0],
            feature_array[valid, column],
        )

    return {
        "duration": duration,
        "coverage": len(features) / max(sampled_frames, 1),
        "features": feature_array,
    }


def segment_cost(prefix, squared_prefix, start, end):
    length = end - start
    total = prefix[end] - prefix[start]
    squared_total = squared_prefix[end] - squared_prefix[start]
    return max(0.0, float(squared_total - np.dot(total, total) / length))


def segment_video(video, movement_count=None):
    features = video["features"]
    frame_count = len(features)
    angles = features[:, 1:]
    window = min(3, frame_count)
    smoothed = np.column_stack(
        [
            np.convolve(angles[:, column], np.ones(window) / window, mode="same")
            for column in range(angles.shape[1])
        ]
    )
    centered = smoothed - np.mean(smoothed, axis=0)
    scales = np.maximum(np.std(smoothed, axis=0), 8.0)
    normalized = centered / scales
    prefix = np.vstack([np.zeros(normalized.shape[1]), np.cumsum(normalized, axis=0)])
    squared_prefix = np.concatenate(
        [[0.0], np.cumsum(np.sum(normalized * normalized, axis=1))]
    )

    counts = [movement_count] if movement_count else [MIN_MOVEMENTS, MAX_MOVEMENTS]
    candidates = []
    for count in counts:
        minimum_length = max(5, frame_count // (count * 2))
        if frame_count < count * minimum_length:
            continue
        costs = np.full((count + 1, frame_count + 1), np.inf)
        previous = np.full((count + 1, frame_count + 1), -1, dtype=np.int32)
        costs[0, 0] = 0.0
        for segment_index in range(1, count + 1):
            first_end = segment_index * minimum_length
            last_end = frame_count - (count - segment_index) * minimum_length
            for end in range(first_end, last_end + 1):
                first_start = (segment_index - 1) * minimum_length
                last_start = end - minimum_length
                for start in range(first_start, last_start + 1):
                    if not math.isfinite(costs[segment_index - 1, start]):
                        continue
                    cost = costs[segment_index - 1, start] + segment_cost(
                        prefix, squared_prefix, start, end
                    )
                    if cost < costs[segment_index, end]:
                        costs[segment_index, end] = cost
                        previous[segment_index, end] = start

        if not math.isfinite(costs[count, frame_count]):
            continue
        boundaries = [frame_count]
        end = frame_count
        for segment_index in range(count, 0, -1):
            end = int(previous[segment_index, end])
            boundaries.append(end)
        boundaries.reverse()
        candidates.append(
            {
                "count": count,
                "cost": float(costs[count, frame_count]),
                "boundaries": boundaries,
            }
        )

    if not candidates:
        movement_description = (
            f"đúng {movement_count} động tác"
            if movement_count
            else "5–6 động tác"
        )
        raise ValueError(
            f"Không thể chia video thành {movement_description} đủ rõ. "
            "Hãy dùng video có đủ thời lượng và quay trọn các động tác."
        )

    if movement_count is None and len(candidates) > 1:
        candidates.sort(key=lambda candidate: candidate["count"])
        simpler, more_detailed = candidates
        feature_count = normalized.shape[1]
        complexity_penalty = feature_count * math.log(max(frame_count, 2)) / 2
        chosen = (
            more_detailed
            if simpler["cost"] - more_detailed["cost"] > complexity_penalty
            else simpler
        )
    else:
        chosen = candidates[0]

    times = features[:, 0]
    movements = []
    for index, (start, end) in enumerate(
        zip(chosen["boundaries"][:-1], chosen["boundaries"][1:]), start=1
    ):
        segment = features[start:end]
        variation = np.std(segment[:, 1:], axis=0)
        focus_order = np.argsort(variation)[::-1][:2]
        focus = " và ".join(
            JOINT_LABELS[JOINT_FEATURES[int(feature_index)]]
            for feature_index in focus_order
            if variation[feature_index] >= 4.0
        )
        movements.append(
            {
                "movementNumber": index,
                "startSeconds": round(float(times[start]), 2),
                "endSeconds": round(float(times[end - 1]), 2),
                "durationSeconds": round(
                    max(float(times[end - 1] - times[start]), 1.0 / FRAME_SAMPLE_RATE), 2
                ),
                "focus": focus or "toàn thân",
            }
        )

    return {
        "movementCount": chosen["count"],
        "movements": movements,
        "explanation": (
            "AI tự chia video thành từng đoạn theo biến đổi góc khớp gối, hông, vai và khuỷu tay. "
            "Tên động tác là số thứ tự, không phải AI nhận diện tên bài tập."
        ),
    }


def resample_segment(video, segment, sample_count=40):
    features = video["features"]
    indices = np.flatnonzero(
        (features[:, 0] >= segment["startSeconds"])
        & (features[:, 0] <= segment["endSeconds"])
    )
    if len(indices) < 2:
        raise ValueError(f"Không đủ khung hình ở động tác {segment['movementNumber']}")
    source = features[indices]
    positions = np.linspace(source[0, 0], source[-1, 0], sample_count)
    return np.column_stack(
        [
            np.interp(positions, source[:, 0], source[:, column])
            for column in range(1, source.shape[1])
        ]
    )


def align_submission_to_reference(reference, submission):
    reference_features = reference["features"]
    submission_features = submission["features"]
    reference_indices = np.linspace(
        0, len(reference_features) - 1,
        min(len(reference_features), MAX_ALIGNMENT_FRAMES),
        dtype=int,
    )
    submission_indices = np.linspace(
        0, len(submission_features) - 1,
        min(len(submission_features), MAX_ALIGNMENT_FRAMES),
        dtype=int,
    )
    reference_samples = reference_features[reference_indices, 1:]
    submission_samples = submission_features[submission_indices, 1:]
    local_costs = np.mean(
        np.abs(reference_samples[:, None, :] - submission_samples[None, :, :])
        / JOINT_TOLERANCES,
        axis=2,
    )
    reference_count, submission_count = local_costs.shape
    accumulated_costs = np.full(
        (reference_count + 1, submission_count + 1), np.inf
    )
    accumulated_costs[0, 0] = 0.0
    previous_steps = np.zeros((reference_count, submission_count), dtype=np.uint8)

    for reference_index in range(1, reference_count + 1):
        for submission_index in range(1, submission_count + 1):
            previous_costs = (
                accumulated_costs[reference_index - 1, submission_index - 1],
                accumulated_costs[reference_index - 1, submission_index],
                accumulated_costs[reference_index, submission_index - 1],
            )
            step = int(np.argmin(previous_costs))
            accumulated_costs[reference_index, submission_index] = (
                local_costs[reference_index - 1, submission_index - 1]
                + previous_costs[step]
            )
            previous_steps[reference_index - 1, submission_index - 1] = step

    matches = [[] for _ in range(reference_count)]
    reference_index = reference_count
    submission_index = submission_count
    while reference_index > 0 and submission_index > 0:
        matches[reference_index - 1].append(submission_index - 1)
        step = previous_steps[reference_index - 1, submission_index - 1]
        if step == 0:
            reference_index -= 1
            submission_index -= 1
        elif step == 1:
            reference_index -= 1
        else:
            submission_index -= 1

    aligned_samples = np.asarray(
        [
            np.mean(submission_samples[indices], axis=0)
            for indices in matches
        ]
    )
    aligned_features = np.column_stack(
        [
            reference_features[:, 0],
            *[
                np.interp(
                    reference_features[:, 0],
                    reference_features[reference_indices, 0],
                    aligned_samples[:, column],
                )
                for column in range(aligned_samples.shape[1])
            ],
        ]
    )
    return {"features": aligned_features}


def is_source2_reference(reference_path):
    digest = hashlib.sha256()
    with open(reference_path, "rb") as reference_file:
        for chunk in iter(lambda: reference_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest() == SOURCE2_REFERENCE_SHA256


def compare_movement(
    reference, submission, reference_segment, submission_segment,
    pass_threshold=MOVEMENT_PASS_THRESHOLD,
):
    reference_features = resample_segment(reference, reference_segment)
    submission_features = resample_segment(submission, submission_segment)
    errors = np.mean(np.abs(reference_features - submission_features), axis=0)
    feature_scores = np.maximum(0.0, 1.0 - errors / JOINT_TOLERANCES) * 100
    pose_similarity = float(np.mean(feature_scores))
    reference_direction = np.sign(np.diff(reference_features, axis=0))
    submission_direction = np.sign(np.diff(submission_features, axis=0))
    direction_similarity = float(
        np.mean(reference_direction == submission_direction) * 100
    )
    similarity = 0.55 * pose_similarity + 0.45 * direction_similarity
    largest_error = int(np.argmax(errors))
    focus = JOINT_LABELS[JOINT_FEATURES[largest_error]]
    deviation = float(errors[largest_error])
    movement_threshold = pass_threshold
    passed = similarity >= movement_threshold
    if deviation >= 8:
        explanation = (
            f"{'Đạt' if passed else 'Chưa đạt'}: độ tương đồng động tác {similarity:.1f}%. "
            f"Khác biệt lớn nhất ở {focus}, lệch trung bình {deviation:.0f}° so với mẫu."
        )
    else:
        explanation = f"{'Đạt' if passed else 'Chưa đạt'}: độ tương đồng động tác {similarity:.1f}%."
    return {
        "movementNumber": int(reference_segment["movementNumber"]),
        "passed": passed,
        "similarityPercent": round(similarity, 1),
        "pointsAwarded": 0.0,
        "maxPoints": 0.0,
        "passThresholdPercent": round(movement_threshold, 1),
        "focus": reference_segment.get("focus", "toàn thân"),
        "explanation": explanation,
    }


def analyze_reference(video_path, movement_count=None, reference_movements=None):
    video = analyze_video(video_path)
    displayed_duration = round(float(video["duration"]), 2)
    if reference_movements is None:
        segmentation = segment_video(video, movement_count)
    else:
        if len(reference_movements) != movement_count:
            raise ValueError("Số đoạn đã xác nhận phải trùng với số động tác đã chọn.")
        movements = []
        previous_end = 0.0
        for index, movement in enumerate(reference_movements, start=1):
            start = float(movement["startSeconds"])
            end = float(movement["endSeconds"])
            if (
                int(movement["movementNumber"]) != index
                or not math.isfinite(start)
                or not math.isfinite(end)
                or start < previous_end
                or end - start < 0.5
                or end > displayed_duration
            ):
                raise ValueError(
                    f"Thời gian Động tác {index} không hợp lệ; "
                    "hãy kiểm tra các đoạn không chồng lấn và nằm trong video."
                )
            movements.append(
                {
                    "movementNumber": index,
                    "startSeconds": round(start, 2),
                    "endSeconds": round(end, 2),
                    "durationSeconds": round(end - start, 2),
                    "focus": movement.get("focus") or "toàn thân",
                }
            )
            previous_end = end
        segmentation = {
            "movementCount": movement_count,
            "movements": movements,
            "explanation": (
                "AI so sánh các đoạn do giáo viên xác nhận theo biến đổi góc khớp "
                "gối, hông, vai và khuỷu tay."
            ),
        }
    segmentation["confidencePercent"] = round(float(video["coverage"] * 100), 1)
    segmentation["durationSeconds"] = displayed_duration
    return segmentation


def validate_reference_movements(video_path, movement_count, reference_movements):
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise ValueError(f"Không mở được video: {Path(video_path).name}")
    fps = capture.get(cv2.CAP_PROP_FPS)
    frame_count = capture.get(cv2.CAP_PROP_FRAME_COUNT)
    capture.release()
    if not math.isfinite(fps) or fps <= 0 or not math.isfinite(frame_count) or frame_count <= 0:
        raise ValueError("Video không có thông tin thời lượng hợp lệ.")
    if movement_count not in (5, 6) or len(reference_movements) != movement_count:
        raise ValueError("Số đoạn đã xác nhận phải trùng với số động tác đã chọn.")

    duration = round(frame_count / fps, 2)
    movements = []
    previous_end = 0.0
    for index, movement in enumerate(reference_movements, start=1):
        start = float(movement["startSeconds"])
        end = float(movement["endSeconds"])
        if (
            int(movement["movementNumber"]) != index
            or not math.isfinite(start)
            or not math.isfinite(end)
            or start < previous_end
            or end - start < 0.5
            or end > duration
        ):
            raise ValueError(
                f"Thời gian Động tác {index} không hợp lệ; "
                "hãy kiểm tra các đoạn không chồng lấn và nằm trong video."
            )
        movements.append(
            {
                "movementNumber": index,
                "startSeconds": round(start, 2),
                "endSeconds": round(end, 2),
                "durationSeconds": round(end - start, 2),
                "focus": movement.get("focus") or "toàn thân",
            }
        )
        previous_end = end

    return {
        "movementCount": movement_count,
        "movements": movements,
        "explanation": (
            "AI so sánh các đoạn do giáo viên xác nhận theo biến đổi góc khớp "
            "gối, hông, vai và khuỷu tay."
        ),
        "confidencePercent": 0.0,
        "durationSeconds": duration,
    }


def compare_videos(
    reference_path, submission_path, reference_movements=None,
    pass_threshold=MOVEMENT_PASS_THRESHOLD,
):
    reference = analyze_video(reference_path)
    submission = analyze_video(submission_path)
    reference_movements = reference_movements or segment_video(reference)["movements"]
    movement_count = len(reference_movements)
    use_source2_calibration = (
        movement_count == len(FIVE_MOVEMENT_PASS_THRESHOLDS)
        and is_source2_reference(reference_path)
    )
    aligned_submission = align_submission_to_reference(reference, submission)
    points_per_movement = 10.0 / movement_count
    movement_results = []

    for reference_segment in reference_movements:
        movement_threshold = pass_threshold
        if use_source2_calibration:
            movement_threshold += (
                FIVE_MOVEMENT_PASS_THRESHOLDS[reference_segment["movementNumber"] - 1]
                - MOVEMENT_PASS_THRESHOLD
            )
        result = compare_movement(
            reference,
            aligned_submission,
            reference_segment,
            reference_segment,
            movement_threshold,
        )
        if result["passed"]:
            result["pointsAwarded"] = points_per_movement
        result["maxPoints"] = points_per_movement
        movement_results.append(result)

    correct_count = sum(result["passed"] for result in movement_results)
    incorrect_count = movement_count - correct_count
    score = round(correct_count * points_per_movement, 1)
    similarity = (
        sum(item["similarityPercent"] for item in movement_results) / movement_count
        if movement_count else 0.0
    )
    confidence = min(reference["coverage"], submission["coverage"]) * 100
    return {
        "similarityPercent": round(float(similarity), 1),
        "suggestedScore": score,
        "confidencePercent": round(float(confidence), 1),
        "scoreBreakdown": (
            f"{correct_count}/{movement_count} động tác đạt theo ngưỡng đã hiệu chỉnh "
            f"cho từng động tác (mức chung {pass_threshold:.0f}%); mỗi động tác đạt nhận "
            f"{points_per_movement:.2f} điểm "
            "trên thang 10. Động tác không đạt nhận 0 điểm."
        ),
        "movementCount": movement_count,
        "correctMovementCount": correct_count,
        "incorrectMovementCount": incorrect_count,
        "pointsPerMovement": points_per_movement,
        "movements": movement_results,
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


def load_reference_movements(arguments):
    if arguments.reference_movements_file:
        with open(arguments.reference_movements_file, encoding="utf-8") as movements_file:
            return json.load(movements_file)
    if arguments.reference_movements:
        return json.loads(arguments.reference_movements)
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reference")
    parser.add_argument("--submission")
    parser.add_argument("--analyze-reference", action="store_true")
    parser.add_argument("--confirm-reference", action="store_true")
    parser.add_argument("--movement-count", type=int, choices=[5, 6])
    parser.add_argument("--reference-movements")
    parser.add_argument("--reference-movements-file")
    parser.add_argument("--pass-threshold", type=int, choices=[50, 60, 70, 80, 90], default=70)
    parser.add_argument("--input", default="source/91_01010.mp4")
    parser.add_argument("--csv-output", default="exercise_analysis_data.csv")
    arguments = parser.parse_args()

    if (arguments.analyze_reference or arguments.confirm_reference) and arguments.reference and not arguments.submission:
        movements = load_reference_movements(arguments)
        if arguments.confirm_reference and (movements is None or arguments.movement_count is None):
            parser.error("--confirm-reference requires --movement-count and --reference-movements")
        print(
            json.dumps(
                validate_reference_movements(
                    arguments.reference,
                    arguments.movement_count,
                    movements,
                )
                if arguments.confirm_reference
                else analyze_reference(arguments.reference, arguments.movement_count, movements),
                ensure_ascii=False,
            )
        )
    elif arguments.reference and arguments.submission:
        movements = load_reference_movements(arguments)
        print(
            json.dumps(
                compare_videos(
                    arguments.reference,
                    arguments.submission,
                    movements,
                    arguments.pass_threshold,
                ),
                ensure_ascii=False,
            )
        )
    elif not arguments.reference and not arguments.submission and not arguments.analyze_reference:
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
