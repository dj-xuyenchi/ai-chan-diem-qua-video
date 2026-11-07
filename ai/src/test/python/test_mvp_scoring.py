import importlib.util
import hashlib
import json
import tempfile
import unittest
from argparse import Namespace
from pathlib import Path
from unittest.mock import Mock, patch

import numpy as np


SCRIPT_PATH = Path(__file__).resolve().parents[4] / "mvp_scoring.py"
SPEC = importlib.util.spec_from_file_location("mvp_scoring", SCRIPT_PATH)
mvp_scoring = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mvp_scoring)


class MovementScoringTests(unittest.TestCase):
    def test_calculate_angle_uses_all_three_points(self):
        angle = mvp_scoring.calculate_angle((1, 0), (0, 0), (0, 1))

        self.assertAlmostEqual(angle, 90.0)

    def test_segment_video_detects_five_or_six_ordered_actions(self):
        times = np.arange(120, dtype=np.float64) / 4
        phase = np.repeat(np.arange(6), 20)
        features = np.column_stack(
            [
                times,
                100 + 25 * np.sin(phase + times),
                105 + 20 * np.cos(phase * 0.8 + times * 0.7),
                90 + 35 * np.sin(phase * 0.6 + times * 0.5),
                95 + 30 * np.cos(phase + times * 0.4),
            ]
        )

        result = mvp_scoring.segment_video(
            {"features": features, "duration": 30, "coverage": 1.0}
        )

        self.assertIn(result["movementCount"], (5, 6))
        self.assertEqual(len(result["movements"]), result["movementCount"])
        self.assertTrue(
            all(
                movement["startSeconds"] < movement["endSeconds"]
                for movement in result["movements"]
            )
        )

    def test_reference_segmentation_uses_teacher_selected_movement_count(self):
        times = np.arange(120, dtype=np.float64) / 4
        features = np.column_stack([times, np.tile([90.0, 100.0, 110.0, 120.0], (120, 1))])

        result = mvp_scoring.segment_video(
            {"features": features, "duration": 30, "coverage": 1.0},
            movement_count=5,
        )

        self.assertEqual(result["movementCount"], 5)
        self.assertEqual(len(result["movements"]), 5)

    def test_reference_analysis_preserves_teacher_confirmed_boundaries(self):
        movements = [
            {
                "movementNumber": index,
                "startSeconds": (index - 1) * 2.0,
                "endSeconds": index * 2.0,
                "durationSeconds": 2.0,
                "focus": "toàn thân",
            }
            for index in range(1, 6)
        ]
        video = {
            "features": np.zeros((20, 5)),
            "duration": 10.0,
            "coverage": 0.9,
        }
        with patch.object(mvp_scoring, "analyze_video", return_value=video):
            result = mvp_scoring.analyze_reference("sample.mp4", 5, movements)

        self.assertEqual(result["movementCount"], 5)
        self.assertEqual(result["movements"], movements)
        self.assertEqual(result["durationSeconds"], 10.0)

    def test_reference_analysis_rejects_overlapping_teacher_boundaries(self):
        movements = [
            {
                "movementNumber": index,
                "startSeconds": (index - 1) * 1.5,
                "endSeconds": index * 1.5 + 0.5,
                "durationSeconds": 2.0,
                "focus": "toàn thân",
            }
            for index in range(1, 6)
        ]
        video = {
            "features": np.zeros((20, 5)),
            "duration": 10.0,
            "coverage": 1.0,
        }
        with patch.object(mvp_scoring, "analyze_video", return_value=video):
            with self.assertRaisesRegex(ValueError, "không hợp lệ"):
                mvp_scoring.analyze_reference("sample.mp4", 5, movements)

    def test_reference_analysis_accepts_displayed_rounded_video_end(self):
        movements = [
            {
                "movementNumber": index,
                "startSeconds": (index - 1) * 2.0,
                "endSeconds": index * 2.0,
                "durationSeconds": 2.0,
                "focus": "toàn thân",
            }
            for index in range(1, 6)
        ]
        video = {
            "features": np.zeros((20, 5)),
            "duration": 9.996,
            "coverage": 1.0,
        }
        with patch.object(mvp_scoring, "analyze_video", return_value=video):
            result = mvp_scoring.analyze_reference("sample.mp4", 5, movements)

        self.assertEqual(result["durationSeconds"], 10.0)
        self.assertEqual(result["movements"][-1]["endSeconds"], 10.0)

    def test_confirmation_validates_timestamps_without_running_pose_analysis(self):
        movements = [
            {
                "movementNumber": index,
                "startSeconds": (index - 1) * 2.0,
                "endSeconds": index * 2.0,
                "durationSeconds": 2.0,
                "focus": "toàn thân",
            }
            for index in range(1, 6)
        ]
        capture = Mock()
        capture.isOpened.return_value = True
        capture.get.side_effect = [25.0, 250.0]
        with patch.object(mvp_scoring.cv2, "VideoCapture", return_value=capture):
            result = mvp_scoring.validate_reference_movements(
                "sample.mp4", 5, movements
            )

        self.assertEqual(result["movementCount"], 5)
        self.assertEqual(result["durationSeconds"], 10.0)
        capture.release.assert_called_once()

    def test_reference_movements_load_from_utf8_file(self):
        movements = [{"movementNumber": 1, "focus": "khuỷu tay và vai"}]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "reference-movements.json"
            path.write_text(json.dumps(movements, ensure_ascii=False), encoding="utf-8")

            result = mvp_scoring.load_reference_movements(
                Namespace(reference_movements_file=str(path), reference_movements=None)
            )

        self.assertEqual(result, movements)

    def test_submission_uses_the_reference_movements_without_resplitting(self):
        movements = [
            {
                "movementNumber": index,
                "startSeconds": (index - 1) * 2.0,
                "endSeconds": index * 2.0,
                "durationSeconds": 2.0,
                "focus": "toàn thân",
            }
            for index in range(1, 6)
        ]
        video = {"features": np.zeros((20, 5)), "duration": 10.0, "coverage": 1.0}
        result_movement = {
            "movementNumber": 1,
            "passed": False,
            "similarityPercent": 40.0,
            "pointsAwarded": 0.0,
            "maxPoints": 2.0,
            "focus": "toàn thân",
            "explanation": "Chưa đạt",
        }
        with (
            patch.object(mvp_scoring, "analyze_video", return_value=video),
            patch.object(mvp_scoring, "segment_video") as segment_video,
            patch.object(
                mvp_scoring,
                "align_submission_to_reference",
                return_value=video,
            ),
            patch.object(mvp_scoring, "is_source2_reference", return_value=False),
            patch.object(mvp_scoring, "compare_movement", return_value=result_movement),
        ):
            result = mvp_scoring.compare_videos("reference.mp4", "submission.mp4", movements)

        segment_video.assert_not_called()
        self.assertNotIn("submissionMovementCount", result)
        self.assertNotIn("speedAssessment", result)

    def test_labeled_reference_uses_per_movement_calibrated_thresholds(self):
        movements = [
            {
                "movementNumber": index,
                "startSeconds": (index - 1) * 2.0,
                "endSeconds": index * 2.0,
                "durationSeconds": 2.0,
                "focus": "toàn thân",
            }
            for index in range(1, 6)
        ]
        video = {"features": np.zeros((20, 5)), "duration": 10.0, "coverage": 1.0}

        def movement_result(*arguments):
            threshold = arguments[4]
            return {
                "movementNumber": arguments[2]["movementNumber"],
                "passed": True,
                "similarityPercent": 100.0,
                "pointsAwarded": 0.0,
                "maxPoints": 0.0,
                "passThresholdPercent": threshold,
                "focus": "toàn thân",
                "explanation": "Đạt",
            }

        with (
            patch.object(mvp_scoring, "analyze_video", return_value=video),
            patch.object(
                mvp_scoring, "is_source2_reference", return_value=True
            ),
            patch.object(
                mvp_scoring, "align_submission_to_reference", return_value=video
            ),
            patch.object(
                mvp_scoring, "compare_movement", side_effect=movement_result
            ),
        ):
            result = mvp_scoring.compare_videos(
                "source2-reference.mp4", "submission.mp4", movements
            )

        self.assertEqual(
            [movement["passThresholdPercent"] for movement in result["movements"]],
            [62.4, 72.6, 63.1, 55.7, 77.1],
        )

    def test_alignment_preserves_identical_pose_sequence(self):
        times = np.arange(20, dtype=np.float64) / 4
        angles = np.column_stack(
            [
                90 + 20 * np.sin(times),
                100 + 15 * np.cos(times),
                80 + 10 * np.sin(times * 0.5),
                110 + 25 * np.cos(times * 0.7),
            ]
        )
        video = {"features": np.column_stack([times, angles])}

        aligned = mvp_scoring.align_submission_to_reference(video, video)

        np.testing.assert_allclose(aligned["features"], video["features"])

    def test_five_movement_thresholds_match_labeled_source2_calibration(self):
        self.assertEqual(
            mvp_scoring.FIVE_MOVEMENT_PASS_THRESHOLDS,
            (62.4, 72.6, 63.1, 55.7, 77.1),
        )

    def test_source2_reference_calibration_uses_reference_video_fingerprint(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "reference.mp4"
            path.write_bytes(b"source2 labeled reference")
            expected_hash = mvp_scoring.SOURCE2_REFERENCE_SHA256
            with patch.object(
                mvp_scoring,
                "SOURCE2_REFERENCE_SHA256",
                hashlib.sha256(path.read_bytes()).hexdigest(),
            ):
                self.assertTrue(mvp_scoring.is_source2_reference(path))
            self.assertEqual(
                mvp_scoring.SOURCE2_REFERENCE_SHA256,
                expected_hash,
            )

    def test_movement_explanation_identifies_pose_deviation_and_failed_threshold(self):
        times = np.arange(20, dtype=np.float64) / 4
        reference_features = np.column_stack(
            [times, np.full((20, 4), 90.0)]
        )
        submission_features = np.column_stack(
            [times, np.full((20, 4), 130.0)]
        )
        segment = {
            "movementNumber": 1,
            "startSeconds": 0.0,
            "endSeconds": 4.75,
            "durationSeconds": 4.75,
            "focus": "đầu gối",
        }

        result = mvp_scoring.compare_movement(
            {"features": reference_features},
            {"features": submission_features},
            segment,
            segment,
        )

        self.assertFalse(result["passed"])
        self.assertLess(result["similarityPercent"], 70)
        self.assertIn("đầu gối", result["explanation"])
        self.assertIn("lệch trung bình", result["explanation"])

    def test_movement_passes_at_configured_lower_threshold(self):
        times = np.arange(20, dtype=np.float64) / 4
        reference_features = np.column_stack([times, np.full((20, 4), 100.0)])
        submission_features = np.column_stack([times, np.full((20, 4), 118.0)])
        segment = {
            "movementNumber": 1,
            "startSeconds": 0.0,
            "endSeconds": 4.75,
            "durationSeconds": 4.75,
            "focus": "toàn thân",
        }

        flexible_result = mvp_scoring.compare_movement(
            {"features": reference_features},
            {"features": submission_features},
            segment,
            segment,
            pass_threshold=60,
        )
        strict_result = mvp_scoring.compare_movement(
            {"features": reference_features},
            {"features": submission_features},
            segment,
            segment,
            pass_threshold=90,
        )

        self.assertGreaterEqual(flexible_result["similarityPercent"], 60)
        self.assertLess(flexible_result["similarityPercent"], 90)
        self.assertTrue(flexible_result["passed"])
        self.assertFalse(strict_result["passed"])
        self.assertNotIn("speedAssessment", flexible_result)
        self.assertNotIn("speedDifferencePercent", flexible_result)


if __name__ == "__main__":
    unittest.main()
