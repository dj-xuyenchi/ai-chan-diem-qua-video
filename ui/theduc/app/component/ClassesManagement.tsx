"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  addClassroomStudents,
  analyzeAssignmentVideo,
  createAssignment,
  createClassroom,
  evaluateSubmission,
  getAssignments,
  getClassroom,
  getClassrooms,
  gradeSubmission,
  removeClassroomStudent,
  submitAssignment,
} from "../api/classApi";
import { getUsers } from "../api/userApi";
import { API_BASE_URL } from "../config/api";
import type { AiVideoEvaluation, Classroom, ClassroomMember, ReferenceAnalysis, ReferenceMovement, VideoAssignment, VideoSubmission } from "../domain/Classroom";
import type { UserKind, UserRecord } from "../domain/User";
import { formatDate } from "../utils/date";
import { Icon } from "./Icon";
import { createXlsxWorkbook } from "../utils/xlsxWorkbook";

type ClassesManagementProps = {
  role: UserKind;
  notify: (message: string) => void;
  target?: { classId: number; studentId?: number; assignmentId?: number } | null;
  onTargetHandled?: () => void;
};

const PAGE_SIZE = 20;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

function formatDateTime(value: string | null) {
  if (!value) return "Không giới hạn";
  return new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return minutes ? `${minutes} phút ${remainder} giây` : `${remainder} giây`;
}

function formatVideoTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function ButtonSpinner() {
  return <span className="button-spinner" aria-hidden="true" />;
}

function MovementEvaluationDetails({ evaluation }: { evaluation: AiVideoEvaluation }) {
  return (
    <section className="movement-evaluation-details" aria-label="Kết quả chấm theo từng động tác">
      <div className="movement-evaluation-summary">
        <strong>{evaluation.correctMovementCount}/{evaluation.movementCount} động tác đạt</strong>
        <span>{evaluation.incorrectMovementCount} chưa đạt · {evaluation.pointsPerMovement.toFixed(2)} điểm mỗi động tác</span>
      </div>
      <ol className="movement-evaluation-list">
        {evaluation.movements.map((movement) => (
          <li className={movement.passed ? "movement-evaluation-passed" : "movement-evaluation-failed"} key={movement.movementNumber}>
            <div className="movement-evaluation-heading">
              <strong>Động tác {movement.movementNumber} · {movement.focus}</strong>
              <span>{movement.pointsAwarded.toFixed(2)}/{movement.maxPoints.toFixed(2)} điểm</span>
            </div>
            <p>{movement.explanation}</p>
            <small>Độ tương đồng {movement.similarityPercent}% · ngưỡng đạt {movement.passThresholdPercent ?? 70}%</small>
          </li>
        ))}
      </ol>
      <p className="movement-scoring-rule">{evaluation.scoreBreakdown}</p>
    </section>
  );
}

function videoSource(path: string) {
  return new URL(path, API_BASE_URL).toString();
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Đã xảy ra lỗi. Vui lòng thử lại.";
}

function loadClassData(classId: number) {
  return Promise.all([getClassroom(classId), getAssignments(classId)]);
}

export function ClassesManagement({ role, notify, target, onTargetHandled }: ClassesManagementProps) {
  const isTeacher = role === "GIAO_VIEN";
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClass, setSelectedClass] = useState<Classroom | null>(null);
  const [focusedStudentId, setFocusedStudentId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<VideoAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<number | null>(null);
  const [submissionQuery, setSubmissionQuery] = useState("");
  const [aiEvaluations, setAiEvaluations] = useState<Record<number, AiVideoEvaluation>>({});
  const [evaluatingSubmissionId, setEvaluatingSubmissionId] = useState<number | null>(null);
  const [gradeDrafts, setGradeDrafts] = useState<Record<number, string>>({});
  const [students, setStudents] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [openingClassId, setOpeningClassId] = useState<number | null>(null);
  const [exportingResults, setExportingResults] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [memberPage, setMemberPage] = useState(1);
  const [submissionPages, setSubmissionPages] = useState<Record<number, number>>({});
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [referenceAnalysis, setReferenceAnalysis] = useState<ReferenceAnalysis | null>(null);
  const [referenceBoundaryDrafts, setReferenceBoundaryDrafts] = useState<Record<string, string>>({});
  const [referenceVideo, setReferenceVideo] = useState<File | null>(null);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState("");
  const referenceVideoElement = useRef<HTMLVideoElement>(null);
  const referenceVideoUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void getClassrooms()
      .then((loadedClassrooms) => {
        if (active) setClassrooms(loadedClassrooms);
      })
      .catch((cause: unknown) => {
        if (active) setError(errorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isTeacher) return;
    let active = true;
    void getUsers("HOC_SINH")
      .then((loadedStudents) => {
        if (active) setStudents(loadedStudents);
      })
      .catch((cause: unknown) => {
        if (active) setError(`Không tải được danh sách học sinh: ${errorMessage(cause)}`);
      });
    return () => {
      active = false;
    };
  }, [isTeacher]);

  useEffect(() => () => {
    if (referenceVideoUrlRef.current) URL.revokeObjectURL(referenceVideoUrlRef.current);
  }, []);

  const visibleClassrooms = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return classrooms.filter((classroom) =>
      `${classroom.maLop} ${classroom.tenLop} ${classroom.tenGiaoVien}`
        .toLocaleLowerCase("vi")
        .includes(normalized),
    );
  }, [classrooms, query]);
  const pageCount = Math.max(1, Math.ceil(visibleClassrooms.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageClassrooms = visibleClassrooms.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const eligibleStudents = students.filter(
    (student) => !selectedClass?.hocSinh.some((member) => member.id === student.id),
  );

  const openClass = useCallback(async (
    classroom: Classroom,
    focusStudentId?: number,
    assignmentId?: number,
  ) => {
    if (openingClassId !== null) return;
    setOpeningClassId(classroom.id);
    try {
      const [details, loadedAssignments] = await loadClassData(classroom.id);
      setError("");
      setSelectedClass(details);
      setFocusedStudentId(focusStudentId ?? null);
      const focusIndex = focusStudentId
        ? details.hocSinh.findIndex((student) => student.id === focusStudentId)
        : -1;
      setMemberPage(focusIndex >= 0 ? Math.floor(focusIndex / PAGE_SIZE) + 1 : 1);
      setSelectedAssignmentId(assignmentId ?? null);
      setAssignments(loadedAssignments);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setOpeningClassId(null);
    }
  }, [openingClassId]);

  useEffect(() => {
    if (!target || !classrooms.length) return;
    const classroom = classrooms.find((item) => item.id === target.classId);
    if (!classroom) return;
    let active = true;
    const loadTargetClass = async () => {
      try {
        const [details, loadedAssignments] = await loadClassData(classroom.id);
        if (!active) return;
        setError("");
        setSelectedClass(details);
        setFocusedStudentId(target.studentId ?? null);
        const focusIndex = target.studentId
          ? details.hocSinh.findIndex((student) => student.id === target.studentId)
          : -1;
        setMemberPage(focusIndex >= 0 ? Math.floor(focusIndex / PAGE_SIZE) + 1 : 1);
        setSelectedAssignmentId(target.assignmentId ?? null);
        setAssignments(loadedAssignments);
      } catch (cause) {
        if (active) setError(errorMessage(cause));
      } finally {
        if (active) onTargetHandled?.();
      }
    };
    void loadTargetClass();
    return () => {
      active = false;
    };
  }, [classrooms, onTargetHandled, target]);

  async function refreshSelectedClass() {
    if (!selectedClass) return;
    const [details, loadedAssignments] = await Promise.all([
      getClassroom(selectedClass.id),
      getAssignments(selectedClass.id),
    ]);
    setSelectedClass(details);
    setClassrooms((current) => current.map((classroom) => classroom.id === details.id ? details : classroom));
    setAssignments(loadedAssignments);
  }

  async function saveClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setBusyAction("create-class");
    try {
      const classroom = await createClassroom({
        maLop: String(form.get("maLop") ?? "").trim(),
        tenLop: String(form.get("tenLop") ?? "").trim(),
      });
      setClassrooms((current) => [classroom, ...current]);
      setClassModalOpen(false);
      notify(`Đã tạo lớp ${classroom.tenLop}.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
      setBusyAction(null);
    }
  }

  async function addStudents(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass || saving) return;
    const form = new FormData(event.currentTarget);
    const hocSinhIds = form.getAll("hocSinhIds").map(Number);
    if (hocSinhIds.length === 0) {
      setError("Chọn ít nhất một học sinh.");
      return;
    }
    setSaving(true);
    setBusyAction("add-students");
    setError("");
    try {
      const classroom = await addClassroomStudents(selectedClass.id, hocSinhIds);
      setSelectedClass(classroom);
      setClassrooms((current) => current.map((item) => item.id === classroom.id ? classroom : item));
      setStudentModalOpen(false);
      notify(`Đã thêm ${hocSinhIds.length} học sinh vào lớp.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
      setBusyAction(null);
    }
  }

  async function removeStudent(student: ClassroomMember) {
    if (!selectedClass || saving) return;
    setSaving(true);
    setBusyAction(`remove-student-${student.id}`);
    try {
      const classroom = await removeClassroomStudent(selectedClass.id, student.id);
      setSelectedClass(classroom);
      setClassrooms((current) => current.map((item) => item.id === classroom.id ? classroom : item));
      notify(`Đã xóa ${student.hoTen} khỏi lớp.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
      setBusyAction(null);
    }
  }

  function getConfirmedReferenceMovements(analysis: ReferenceAnalysis): ReferenceMovement[] {
    return analysis.movements.map((movement, index) => {
      const startDraft = referenceBoundaryDrafts[`${index}.startSeconds`];
      const endDraft = referenceBoundaryDrafts[`${index}.endSeconds`];
      const startSeconds = startDraft === undefined
        ? movement.startSeconds
        : startDraft.trim() ? Number(startDraft) : Number.NaN;
      const endSeconds = endDraft === undefined
        ? movement.endSeconds
        : endDraft.trim() ? Number(endDraft) : Number.NaN;
      return {
        ...movement,
        startSeconds,
        endSeconds,
        durationSeconds: endSeconds - startSeconds,
      };
    });
  }

  function referenceSegmentsValidationMessage(analysis: ReferenceAnalysis): string | null {
    if (analysis.movements.length !== analysis.movementCount) {
      return "Số đoạn AI đề xuất không khớp số động tác đã chọn.";
    }
    let previousEnd = 0;
    const movements = getConfirmedReferenceMovements(analysis);
    for (let index = 0; index < movements.length; index += 1) {
      const movement = movements[index];
      if (!Number.isFinite(movement.startSeconds) || !Number.isFinite(movement.endSeconds)) {
        return `Động tác ${index + 1}: nhập thời gian bắt đầu và kết thúc hợp lệ.`;
      }
      if (movement.startSeconds < 0 || movement.endSeconds > analysis.durationSeconds) {
        return `Động tác ${index + 1}: thời gian phải nằm trong video (0–${analysis.durationSeconds} giây).`;
      }
      if (movement.startSeconds < previousEnd) {
        return `Động tác ${index + 1}: thời gian bắt đầu không được trước khi động tác ${index} kết thúc.`;
      }
      if (movement.endSeconds - movement.startSeconds < 0.5) {
        return `Động tác ${index + 1}: đoạn phải dài ít nhất 0,5 giây.`;
      }
      previousEnd = movement.endSeconds;
    }
    return null;
  }

  function updateReferenceMovement(
    index: number,
    field: "startSeconds" | "endSeconds",
    value: string,
  ) {
    setReferenceBoundaryDrafts((current) => ({
      ...current,
      [`${index}.${field}`]: value,
    }));
    setError("");
  }

  function setMovementBoundaryToPlaybackTime(index: number, field: "startSeconds" | "endSeconds") {
    const currentTime = referenceVideoElement.current?.currentTime;
    if (currentTime !== undefined && Number.isFinite(currentTime)) {
      updateReferenceMovement(index, field, currentTime.toFixed(1));
    }
  }

  function selectReferenceVideo(video: File | null) {
    if (referenceVideoUrlRef.current) URL.revokeObjectURL(referenceVideoUrlRef.current);
    const url = video ? URL.createObjectURL(video) : "";
    referenceVideoUrlRef.current = url || null;
    setReferenceVideoUrl(url);
    setReferenceVideo(video);
  }

  async function saveAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass || saving) return;
    const form = new FormData(event.currentTarget);
    const video = form.get("video");
    if (!(video instanceof File) || video.size === 0 || !video.type.startsWith("video/")) {
      setError("Vui lòng chọn tệp video hợp lệ.");
      return;
    }
    if (video.size > MAX_VIDEO_SIZE) {
      setError("Video không được vượt quá 100 MB.");
      return;
    }
    const movementCount = Number(form.get("soDongTac"));
    if (movementCount !== 5 && movementCount !== 6) {
      setError("Vui lòng chọn 5 hoặc 6 động tác.");
      return;
    }
    if (referenceVideo !== video) selectReferenceVideo(video);
    setSaving(true);
    setBusyAction(referenceAnalysis?.movementCount === movementCount ? "create-assignment" : "analyze-reference");
    setError("");
    try {
      if (!referenceAnalysis || referenceAnalysis.movementCount !== movementCount) {
        setReferenceAnalysis(null);
        setReferenceBoundaryDrafts({});
        const analysis = await analyzeAssignmentVideo(selectedClass.id, movementCount, video);
        setReferenceAnalysis(analysis);
        setReferenceBoundaryDrafts({});
        notify(`AI đã chia video mẫu thành ${analysis.movementCount} đoạn. Hãy xem lại và chỉnh mốc thời gian.`);
        return;
      }
      const validationMessage = referenceSegmentsValidationMessage(referenceAnalysis);
      if (validationMessage) {
        setError(validationMessage);
        return;
      }
      const assignment = await createAssignment(selectedClass.id, {
        tieuDe: String(form.get("tieuDe") ?? "").trim(),
        huongDan: String(form.get("huongDan") ?? "").trim(),
        hanNop: String(form.get("hanNop") ?? ""),
        soDongTac: movementCount,
        dongTacMau: getConfirmedReferenceMovements(referenceAnalysis),
        video,
      });
      setAssignments((current) => [assignment, ...current]);
      setAssignmentModalOpen(false);
      setReferenceAnalysis(null);
      setReferenceBoundaryDrafts({});
      selectReferenceVideo(null);
      notify(`Đã tạo bài tập với ${assignment.aiDongTacMau?.length ?? 0} đoạn động tác đã xác nhận.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
      setBusyAction(null);
    }
  }

  async function submitVideo(event: FormEvent<HTMLFormElement>, assignment: VideoAssignment) {
    event.preventDefault();
    if (!selectedClass || saving) return;
    const video = new FormData(event.currentTarget).get("video");
    if (!(video instanceof File) || video.size === 0 || !video.type.startsWith("video/")) {
      setError("Vui lòng chọn tệp video hợp lệ để nộp.");
      return;
    }
    if (video.size > MAX_VIDEO_SIZE) {
      setError("Video không được vượt quá 100 MB.");
      return;
    }
    setSaving(true);
    setBusyAction("submit-video");
    setError("");
    try {
      const submittedAssignment = await submitAssignment(selectedClass.id, assignment.id, video);
      const submittedVideo = submittedAssignment.baiNop.find((submission) => submission.baiCuaToi);
      setAiEvaluations((current) => {
        const next = { ...current };
        const submission = assignment.baiNop.find((item) => item.baiCuaToi);
        if (submission) delete next[submission.id];
        if (submittedVideo?.aiDanhGia) {
          next[submittedVideo.id] = submittedVideo.aiDanhGia;
        }
        return next;
      });
      await refreshSelectedClass();
      if (submittedVideo?.trangThaiAi === "LOI") {
        notify("Đã lưu bài nộp; hệ thống AI chưa đánh giá được, giáo viên có thể thử phân tích lại.");
      } else {
        notify(`Đã nộp video và AI đã đánh giá cho bài "${assignment.tieuDe}".`);
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
      setBusyAction(null);
    }
  }

  async function saveGrade(
    event: FormEvent<HTMLFormElement>,
    assignment: VideoAssignment,
    submission: VideoSubmission,
  ) {
    event.preventDefault();
    if (!selectedClass || saving) return;
    const form = new FormData(event.currentTarget);
    const score = Number(form.get("diem"));
    setSaving(true);
    setBusyAction(`save-grade-${submission.id}`);
    setError("");
    try {
      await gradeSubmission(
        selectedClass.id,
        assignment.id,
        submission.id,
        score,
        String(form.get("nhanXet") ?? "").trim(),
      );
      setGradeDrafts((current) => ({ ...current, [submission.id]: String(score) }));
      await refreshSelectedClass();
      notify(`Đã lưu điểm cho ${submission.tenHocSinh}.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
      setBusyAction(null);
    }
  }

  async function evaluateVideo(assignment: VideoAssignment, submission: VideoSubmission) {
    if (!selectedClass || evaluatingSubmissionId !== null) return;
    setEvaluatingSubmissionId(submission.id);
    setError("");
    try {
      const result = await evaluateSubmission(selectedClass.id, assignment.id, submission.id);
      setAiEvaluations((current) => ({ ...current, [submission.id]: result }));
    } catch (cause) {
      setError(`Không thể đánh giá video: ${errorMessage(cause)}`);
    } finally {
      setEvaluatingSubmissionId(null);
    }
  }

  async function exportClassResults() {
    if (!selectedClass || !isTeacher || exportingResults) return;
    setExportingResults(true);
    setBusyAction("export-results");
    try {
      const rows = assignments.flatMap((assignment) =>
        selectedClass.hocSinh.map((student) => {
          const submission = assignment.baiNop.find((item) => item.hocSinhId === student.id);
          const evaluation = submission
            ? aiEvaluations[submission.id] ?? submission.aiDanhGia
            : null;
          const aiStatus = !submission
            ? "Chưa nộp"
            : evaluation
              ? "Đã phân tích"
              : submission.trangThaiAi === "DANG_DANH_GIA"
                ? "Đang đánh giá"
                : submission.trangThaiAi === "LOI"
                  ? "Lỗi đánh giá"
                  : "Chưa đánh giá";
          return [
            selectedClass.maLop,
            selectedClass.tenLop,
            student.maSinhVien,
            student.hoTen,
            student.email,
            assignment.tieuDe,
            assignment.hanNop ?? "",
            submission ? "Đã nộp" : "Chưa nộp",
            submission?.ngayNop ?? "",
            submission?.tenVideo ?? "",
            submission?.diem ?? "",
            submission?.nhanXet ?? "",
            aiStatus,
            evaluation?.similarityPercent ?? "",
            evaluation?.suggestedScore ?? "",
            evaluation?.confidencePercent ?? "",
            evaluation?.scoreBreakdown ?? submission?.loiDanhGiaAi ?? "",
            evaluation?.correctMovementCount ?? "",
            evaluation?.incorrectMovementCount ?? "",
            evaluation?.movements.map((movement) =>
              `Động tác ${movement.movementNumber}: ${movement.pointsAwarded}/${movement.maxPoints}; ${movement.explanation}`,
            ).join("\n") ?? "",
          ];
        }),
      );
      const headers = [
        "Mã lớp",
        "Tên lớp",
        "Mã học sinh",
        "Họ tên học sinh",
        "Email",
        "Bài tập",
        "Hạn nộp",
        "Trạng thái nộp",
        "Ngày nộp",
        "Tên video",
        "Điểm giáo viên (/10)",
        "Nhận xét giáo viên",
        "Trạng thái AI",
        "Độ tương đồng (%)",
        "Điểm AI đề xuất (/10)",
        "Độ tin cậy AI (%)",
        "Chi tiết AI / Lỗi đánh giá",
        "Số động tác đạt",
        "Số động tác chưa đạt",
        "Chi tiết từng động tác",
      ];
      const columnWidths = [
        14, 24, 16, 24, 30, 30, 20, 15, 20, 30, 18, 36, 16, 17, 19, 18, 60, 16, 18, 70,
      ];
      const blob = await createXlsxWorkbook(headers, rows, columnWidths, "Kết quả bài tập");
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `ket-qua-${selectedClass.maLop.replace(/[<>:"/\\|?*]/g, "_")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
      notify(`Đã xuất ${rows.length} dòng kết quả của lớp ${selectedClass.maLop}.`);
    } catch (cause) {
      setError(`Không thể xuất Excel: ${errorMessage(cause)}`);
    } finally {
      setExportingResults(false);
      setBusyAction(null);
    }
  }

  if (selectedClass) {
    const activeAssignment = assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null;
    return (
      <section className="class-detail-page">
        <button className="class-back-button" onClick={() => { setSelectedClass(null); setSelectedAssignmentId(null); setAssignments([]); setError(""); }}>
          <Icon name="back" size={17} /> Danh sách lớp
        </button>
        <div className="class-detail-heading">
          <div className="class-detail-title">
            <span className="class-detail-icon"><Icon name="calendar" size={21} /></span>
            <div>
              <span className="class-detail-kicker">{selectedClass.maLop} · LỚP HỌC</span>
              <h2>{selectedClass.tenLop}</h2>
              <p>Giáo viên: <strong>{selectedClass.tenGiaoVien}</strong><span className="detail-dot">·</span>{selectedClass.soHocSinh} học sinh</p>
            </div>
          </div>
          {isTeacher && <div className="class-detail-actions">
            <button className="button button-secondary" onClick={() => void exportClassResults()} disabled={assignments.length === 0 || exportingResults || saving}><Icon name="download" size={15} /> {exportingResults && <ButtonSpinner />} {exportingResults ? "Đang xuất..." : "Xuất Excel"}</button>
            <button className="button button-secondary" onClick={() => setStudentModalOpen(true)}><Icon name="users" size={15} /> Thêm học sinh</button>
          </div>}
        </div>

        {error && <div className="class-error" role="alert">{error}</div>}

        {selectedAssignmentId === null ? (
          <>
        <section className="panel classroom-members-panel">
          <div className="students-heading">
            <div><div className="members-title"><h2>Học sinh trong lớp</h2><span className="member-count">{selectedClass.soHocSinh}</span></div><p>Thành viên lớp có thể xem bài tập và video bài nộp của nhau.</p></div>
          </div>
          {selectedClass.hocSinh.length ? (
            <div className="table-scroll student-table-scroll">
              <table className="student-table classroom-members-table">
                <thead><tr><th>STT</th><th>MÃ SINH VIÊN</th><th>HỌ TÊN</th><th>EMAIL</th>{isTeacher && <th>THAO TÁC</th>}</tr></thead>
                <tbody>{selectedClass.hocSinh.slice((memberPage - 1) * PAGE_SIZE, memberPage * PAGE_SIZE).map((student, index) => (
                  <tr className={focusedStudentId === student.id ? "classroom-member-highlight" : undefined} key={student.id}>
                    <td>{(memberPage - 1) * PAGE_SIZE + index + 1}</td><td>{student.maSinhVien}</td><td><strong className="student-name">{student.hoTen}</strong></td><td>{student.email}</td>
                    {isTeacher && <td><button className="student-action-button student-delete-button" aria-label={`Xóa ${student.hoTen} khỏi lớp`} disabled={saving} onClick={() => void removeStudent(student)}>{busyAction === `remove-student-${student.id}` ? <ButtonSpinner /> : <Icon name="trash" size={15} />}</button></td>}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <div className="class-empty-state">Lớp chưa có học sinh.{isTeacher ? " Hãy thêm học sinh để các em truy cập lớp." : ""}</div>}
          {selectedClass.soHocSinh > PAGE_SIZE && (
            <div className="table-footer">
              <span>Hiển thị {(memberPage - 1) * PAGE_SIZE + 1}–{Math.min(memberPage * PAGE_SIZE, selectedClass.soHocSinh)} trong {selectedClass.soHocSinh} học sinh.</span>
              <div><button type="button" aria-label="Trang học sinh trước" disabled={memberPage === 1} onClick={() => setMemberPage(memberPage - 1)}><Icon name="chevron" size={13} className="previous-chevron" /></button><span className="page-number">{memberPage} / {Math.ceil(selectedClass.soHocSinh / PAGE_SIZE)}</span><button type="button" aria-label="Trang học sinh sau" disabled={memberPage === Math.ceil(selectedClass.soHocSinh / PAGE_SIZE)} onClick={() => setMemberPage(memberPage + 1)}><Icon name="chevron" size={13} /></button></div>
            </div>
          )}
        </section>

        <div className="class-assignment-heading">
          <div><h3>Bài tập video</h3><p>{isTeacher ? "Thêm video hướng dẫn, xem bài nộp và chấm điểm." : "Nộp video và xem bài làm của các bạn trong lớp."}</p></div>
          {isTeacher && <button className="button button-primary" onClick={() => { setReferenceAnalysis(null); setReferenceBoundaryDrafts({}); selectReferenceVideo(null); setError(""); setAssignmentModalOpen(true); }}><Icon name="plus" size={16} /> Thêm bài tập</button>}
        </div>
        {assignments.length ? (
          <div className="classroom-assignment-list">
            {assignments.map((assignment) => {
              const mySubmission = assignment.baiNop.find((submission) => submission.baiCuaToi);
              const ungradedCount = assignment.baiNop.filter((submission) => submission.diem === null).length;
              return (
                <article className="panel classroom-assignment-summary" key={assignment.id}>
                  <div className="classroom-assignment-heading">
                    <div><span className="class-detail-kicker">BÀI TẬP · {formatDate(assignment.ngayTao)}</span><h3>{assignment.tieuDe}</h3><p>{assignment.huongDan || "Không có hướng dẫn bổ sung."}</p></div>
                    <span className="assignment-deadline">Hạn nộp: {formatDateTime(assignment.hanNop)}</span>
                  </div>
                  <div className="assignment-summary-metrics">
                    <span><strong>{assignment.baiNop.length}</strong> bài đã nộp</span>
                    <span><strong>{ungradedCount}</strong> chưa chấm</span>
                    {!isTeacher && <span>{mySubmission ? `Bạn đã nộp · ${mySubmission.diem === null ? "Chờ chấm" : `${mySubmission.diem}/10`}` : "Bạn chưa nộp"}</span>}
                  </div>
                  <button className="button button-secondary assignment-open-button" type="button" onClick={() => {
                    setSelectedAssignmentId(assignment.id);
                    setExpandedSubmissionId(null);
                    setSubmissionQuery("");
                    setError("");
                  }}>
                    Xem bài tập và {isTeacher ? "duyệt bài nộp" : "bài nộp"} <Icon name="chevron" size={14} />
                  </button>
                </article>
              );
            })}
          </div>
        ) : <div className="class-empty-state">{isTeacher ? "Lớp chưa có bài tập video." : "Lớp chưa có bài tập được giao."}</div>}
          </>
        ) : activeAssignment ? (
          <section className="assignment-review-page">
            <button className="class-back-button" type="button" onClick={() => { setSelectedAssignmentId(null); setExpandedSubmissionId(null); setError(""); }}>
              <Icon name="back" size={17} /> Danh sách bài tập
            </button>
            <header className="assignment-review-header">
              <div><span className="class-detail-kicker">TỔNG QUAN BÀI TẬP · {formatDate(activeAssignment.ngayTao)}</span><h2>{activeAssignment.tieuDe}</h2><p>{activeAssignment.huongDan || "Không có hướng dẫn bổ sung."}</p></div>
              <span className="assignment-deadline">Hạn nộp: {formatDateTime(activeAssignment.hanNop)}</span>
            </header>
            <div className="assignment-review-stats">
              <article><strong>{activeAssignment.baiNop.length}</strong><span>Đã nộp</span></article>
              <article><strong>{Math.max(0, selectedClass.soHocSinh - activeAssignment.baiNop.length)}</strong><span>Chưa nộp</span></article>
              <article><strong>{activeAssignment.baiNop.filter((submission) => submission.diem === null).length}</strong><span>Chờ chấm</span></article>
            </div>
            <section className="panel assignment-reference-panel">
              <div><h3>Video bài mẫu</h3><p>{activeAssignment.tenVideo} · Giáo viên {activeAssignment.tenGiaoVien}</p></div>
              <video className="classroom-video" controls preload="metadata" crossOrigin="use-credentials" src={videoSource(activeAssignment.videoUrl)}>
                Trình duyệt không hỗ trợ phát video.
              </video>
              {activeAssignment.aiDongTacMau?.length ? (
                <div className="reference-movement-analysis">
                  <div className="reference-movement-heading">
                    <strong>AI nhận diện {activeAssignment.aiDongTacMau.length} động tác trong video mẫu</strong>
                    <p>{activeAssignment.aiMoTaDongTacMau} Mỗi động tác đạt từ {activeAssignment.aiNguongDatPercent ?? 70}% độ tương đồng chuyển động sẽ nhận điểm; các động tác chia đều 10 điểm.</p>
                  </div>
                  <ol>
                    {activeAssignment.aiDongTacMau.map((movement) => (
                      <li key={movement.movementNumber}>
                        <strong>Động tác {movement.movementNumber}</strong>
                        <span>{formatVideoTime(movement.startSeconds)}–{formatVideoTime(movement.endSeconds)}</span>
                        <small>Quan sát chính: {movement.focus}</small>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <p className="reference-movement-unavailable">Bài tập cũ chưa có phân tích động tác mẫu. Kết quả AI sẽ tự chia video trong lần phân tích bài nộp.</p>
              )}
            </section>
            {!isTeacher && (
              <div className="student-submit-panel">
                {activeAssignment.baiNop.find((submission) => submission.baiCuaToi) && (() => {
                  const mySubmission = activeAssignment.baiNop.find((submission) => submission.baiCuaToi)!;
                  return <p>Bạn đã nộp {mySubmission.tenVideo} · {formatDateTime(mySubmission.ngayNop)}{mySubmission.diem !== null ? ` · Điểm ${mySubmission.diem}/10` : " · Chưa chấm điểm"}{mySubmission.nhanXet ? ` · ${mySubmission.nhanXet}` : ""}</p>;
                })()}
                <form className="video-submit-form" onSubmit={(event) => void submitVideo(event, activeAssignment)}>
                  <label>Chọn video bài làm<input name="video" type="file" accept="video/*" required /></label>
                  <button className="button button-primary" type="submit" disabled={saving}>{saving && <ButtonSpinner />}<Icon name="upload" size={15} />{saving ? "Đang tải lên và AI đánh giá..." : activeAssignment.baiNop.some((submission) => submission.baiCuaToi) ? "Nộp lại video" : "Nộp video"}</button>
                </form>
              </div>
            )}
            <section className="panel assignment-submissions-panel">
              <div className="assignment-submissions-toolbar">
                <div><h3>{isTeacher ? "Danh sách bài nộp" : "Bài nộp trong lớp"}</h3><p>{activeAssignment.baiNop.length} bài nộp · {activeAssignment.baiNop.filter((submission) => submission.diem !== null).length} đã chấm</p></div>
                <input aria-label="Tìm học sinh" placeholder="Tìm theo tên hoặc mã sinh viên" value={submissionQuery} onChange={(event) => { setSubmissionQuery(event.target.value); setSubmissionPages((pages) => ({ ...pages, [activeAssignment.id]: 1 })); }} />
              </div>
              {(() => {
                const normalizedQuery = submissionQuery.trim().toLocaleLowerCase("vi");
                const filteredSubmissions = activeAssignment.baiNop.filter((submission) =>
                  `${submission.tenHocSinh} ${submission.maSinhVien}`.toLocaleLowerCase("vi").includes(normalizedQuery),
                );
                const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / PAGE_SIZE));
                const currentPage = Math.min(submissionPages[activeAssignment.id] ?? 1, totalPages);
                const visibleSubmissions = filteredSubmissions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
                if (filteredSubmissions.length === 0) {
                  return <div className="class-empty-state">{activeAssignment.baiNop.length ? "Không tìm thấy bài nộp phù hợp." : "Chưa có học sinh nộp bài tập này."}</div>;
                }
                return (
                  <>
                    <div className="review-submission-list">
                      {visibleSubmissions.map((submission, index) => {
                        const expanded = expandedSubmissionId === submission.id;
                        const evaluation = aiEvaluations[submission.id] ?? submission.aiDanhGia;
                        return (
                          <article className={`review-submission${expanded ? " review-submission-expanded" : ""}`} key={submission.id}>
                            <div className="review-submission-row">
                              <span className="review-submission-number">{(currentPage - 1) * PAGE_SIZE + index + 1}</span>
                              <div className="review-submission-student"><strong>{submission.baiCuaToi ? "Bài của bạn" : submission.tenHocSinh}</strong><span>{submission.maSinhVien} · {formatDateTime(submission.ngayNop)}</span></div>
                              <span className={submission.diem === null ? "submission-ungraded" : "submission-score"}>{submission.diem === null ? "Chưa chấm" : `${submission.diem}/10`}</span>
                              <button className="button button-secondary review-toggle-button" type="button" onClick={() => setExpandedSubmissionId(expanded ? null : submission.id)}>{expanded ? "Thu gọn" : "Xem bài"}</button>
                            </div>
                            {expanded && (
                              <div className="review-submission-detail">
                                <p className="classroom-video-caption">{submission.tenVideo}</p>
                                <video className="classroom-video classroom-submission-video" controls preload="metadata" crossOrigin="use-credentials" src={videoSource(submission.videoUrl)}>
                                  Trình duyệt không hỗ trợ phát video.
                                </video>
                                {submission.nhanXet && <p className="submission-feedback">Nhận xét hiện tại: {submission.nhanXet}</p>}
                                {isTeacher && (
                                  <>
                                    <section className="ai-evaluation-panel">
                                      <div><strong>Gợi ý phân tích AI</strong><p>So sánh video với bài mẫu; kết quả chỉ để tham khảo và không tự lưu điểm.</p></div>
                                      <button type="button" className="button button-secondary" disabled={evaluatingSubmissionId !== null || saving || exportingResults} onClick={() => void evaluateVideo(activeAssignment, submission)}>
                                        {evaluatingSubmissionId === submission.id && <ButtonSpinner />} {evaluatingSubmissionId === submission.id ? "Đang phân tích..." : evaluation ? "Phân tích lại" : "Phân tích video"}
                                      </button>
                                      {!evaluation && submission.trangThaiAi === "DANG_DANH_GIA" && <p className="ai-evaluation-error">AI đang phân tích bài nộp này.</p>}
                                      {!evaluation && submission.trangThaiAi === "LOI" && <p className="ai-evaluation-error">{submission.loiDanhGiaAi || "AI chưa phân tích được video."} Bạn có thể thử phân tích lại.</p>}
                                      {evaluation && (
                                        <div className="ai-evaluation-results">
                                          <div><strong>{evaluation.similarityPercent}%</strong><span>Động tác tương đồng</span></div>
                                          <div><strong>{evaluation.suggestedScore}/10</strong><span>Điểm AI gợi ý</span></div>
                                          <p>Đạt {evaluation.correctMovementCount}/{evaluation.movementCount} động tác · chưa đạt {evaluation.incorrectMovementCount}. Độ tin cậy nhận diện {evaluation.confidencePercent}%.</p>
                                          <small>AI so sánh góc khớp gối, hông, vai và khuỷu tay theo từng đoạn; tên động tác là số thứ tự, không phải nhận diện tên bài tập.</small>
                                          <MovementEvaluationDetails evaluation={evaluation} />
                                        </div>
                                      )}
                                    </section>
                                    <form className="grade-form" onSubmit={(event) => void saveGrade(event, activeAssignment, submission)}>
                                        <label>Điểm chính thức (0–10)<input name="diem" type="number" min="0" max="10" step="0.1" required value={gradeDrafts[submission.id] ?? submission.diem?.toString() ?? evaluation?.suggestedScore.toString() ?? ""} onChange={(event) => setGradeDrafts((current) => ({ ...current, [submission.id]: event.target.value }))} /></label>
                                      <label>Nhận xét<input name="nhanXet" maxLength={2000} defaultValue={submission.nhanXet ?? ""} placeholder="Nhận xét cho học sinh" /></label>
                                      <button type="submit" className="button button-primary" disabled={saving}>{busyAction === `save-grade-${submission.id}` && <ButtonSpinner />}{saving ? "Đang lưu..." : "Lưu điểm thủ công"}</button>
                                    </form>
                                  </>
                                )}
                                {!isTeacher && submission.baiCuaToi && (
                                  <section className="ai-evaluation-panel student-ai-evaluation">
                                    <div><strong>Gợi ý từ AI (tham khảo)</strong><p>Đánh giá sơ bộ; không phải điểm chính thức.</p></div>
                                    {evaluation ? (
                                      <div className="ai-evaluation-results">
                                        <div><strong>{evaluation.similarityPercent}%</strong><span>Động tác tương đồng</span></div>
                                        <div><strong>{evaluation.suggestedScore}/10</strong><span>Điểm AI gợi ý</span></div>
                                        <p>Bạn đạt {evaluation.correctMovementCount}/{evaluation.movementCount} động tác; {evaluation.incorrectMovementCount} động tác chưa đạt. Đây là điểm AI tham khảo, không phải điểm chính thức.</p>
                                        <small>AI so sánh góc khớp gối, hông, vai và khuỷu tay với từng đoạn của video mẫu.</small>
                                        <MovementEvaluationDetails evaluation={evaluation} />
                                      </div>
                                    ) : submission.trangThaiAi === "LOI" ? (
                                      <p className="ai-evaluation-error">{submission.loiDanhGiaAi || "AI chưa phân tích được video."}</p>
                                    ) : (
                                      <p className="ai-evaluation-error">Bài nộp đã được lưu; đang chờ kết quả phân tích AI.</p>
                                    )}
                                  </section>
                                )}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                    {filteredSubmissions.length > PAGE_SIZE && (
                      <div className="table-footer classroom-submission-pagination">
                        <span>Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredSubmissions.length)} trong {filteredSubmissions.length} bài nộp</span>
                        <div><button type="button" aria-label="Bài nộp trước" disabled={currentPage === 1} onClick={() => setSubmissionPages((pages) => ({ ...pages, [activeAssignment.id]: currentPage - 1 }))}><Icon name="chevron" size={13} className="previous-chevron" /></button><span className="page-number">{currentPage} / {totalPages}</span><button type="button" aria-label="Bài nộp tiếp theo" disabled={currentPage === totalPages} onClick={() => setSubmissionPages((pages) => ({ ...pages, [activeAssignment.id]: currentPage + 1 }))}><Icon name="chevron" size={13} /></button></div>
                      </div>
                    )}
                  </>
                );
              })()}
            </section>
          </section>
        ) : (
          <div className="class-empty-state">Đang tải thông tin bài tập...</div>
        )}

        {classModalOpen && renderClassModal()}
        {studentModalOpen && renderStudentModal()}
        {assignmentModalOpen && renderAssignmentModal()}
      </section>
    );
  }

  function renderClassModal() {
    return (
      <div className="modal-backdrop" onMouseDown={(event) => { if (!saving && event.target === event.currentTarget) setClassModalOpen(false); }}>
        <section className="member-modal student-modal" role="dialog" aria-modal="true" aria-labelledby="class-modal-title">
          <div className="modal-heading"><div><span className="modal-icon"><Icon name="calendar" size={20} /></span><div><h2 id="class-modal-title">Tạo lớp học</h2><p>Tạo lớp và thêm học sinh sau khi lưu.</p></div></div><button className="subtle-icon-button" aria-label="Đóng" onClick={() => setClassModalOpen(false)} disabled={saving}><Icon name="close" /></button></div>
          <form onSubmit={(event) => void saveClass(event)}>
            <label>Mã lớp<input name="maLop" required maxLength={50} placeholder="Ví dụ: CNTT-K22A" /></label>
            <label>Tên lớp<input name="tenLop" required maxLength={150} placeholder="Ví dụ: Tin học khóa 22A" /></label>
            <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setClassModalOpen(false)} disabled={saving}>Hủy</button><button type="submit" className="button button-primary" disabled={saving}>{saving && <ButtonSpinner />}{saving ? "Đang tạo..." : "Tạo lớp học"}</button></div>
          </form>
        </section>
      </div>
    );
  }

  function renderStudentModal() {
    return (
      <div className="modal-backdrop" onMouseDown={(event) => { if (!saving && event.target === event.currentTarget) setStudentModalOpen(false); }}>
        <section className="member-modal student-modal classroom-student-modal" role="dialog" aria-modal="true" aria-labelledby="student-modal-title">
          <div className="modal-heading"><div><span className="modal-icon"><Icon name="users" size={20} /></span><div><h2 id="student-modal-title">Thêm học sinh vào lớp</h2><p>Chọn một hoặc nhiều học sinh. Học sinh có thể tham gia nhiều lớp.</p></div></div><button className="subtle-icon-button" aria-label="Đóng" onClick={() => setStudentModalOpen(false)} disabled={saving}><Icon name="close" /></button></div>
          {eligibleStudents.length ? <form onSubmit={(event) => void addStudents(event)}>
            <div className="classroom-student-picker">{eligibleStudents.map((student) => (
              <label key={student.id}><input type="checkbox" name="hocSinhIds" value={student.id} /><span><strong>{student.hoTen}</strong><small>{student.maSinhVien} · {student.email}</small></span></label>
            ))}</div>
            <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setStudentModalOpen(false)} disabled={saving}>Hủy</button><button type="submit" className="button button-primary" disabled={saving}>{saving && <ButtonSpinner />}{saving ? "Đang thêm..." : "Thêm học sinh đã chọn"}</button></div>
          </form> : <div className="class-empty-state">Không còn học sinh nào để thêm.</div>}
        </section>
      </div>
    );
  }

  function renderAssignmentModal() {
    const validationMessage = referenceAnalysis
      ? referenceSegmentsValidationMessage(referenceAnalysis)
      : null;
    const segmentsValid = referenceAnalysis !== null && validationMessage === null;
    const confirmedMovements = referenceAnalysis
      ? getConfirmedReferenceMovements(referenceAnalysis)
      : [];
    const closeModal = () => {
      if (saving) return;
      setAssignmentModalOpen(false);
      setReferenceAnalysis(null);
      setReferenceBoundaryDrafts({});
      selectReferenceVideo(null);
    };
    return (
      <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
        <section className="member-modal student-modal assignment-modal" role="dialog" aria-modal="true" aria-labelledby="assignment-modal-title">
          <div className="modal-heading"><div><span className="modal-icon"><Icon name="video" size={20} /></span><div><h2 id="assignment-modal-title">Thêm bài tập video</h2><p>Chọn số động tác, để AI đề xuất đoạn rồi xem lại trước khi tạo bài.</p></div></div><button className="subtle-icon-button" aria-label="Đóng" onClick={closeModal} disabled={saving}><Icon name="close" /></button></div>
          <form onSubmit={(event) => void saveAssignment(event)}>
            <label>Tiêu đề<input name="tieuDe" required maxLength={150} placeholder="Ví dụ: Bài tập tuần 1" /></label>
            <label>Hướng dẫn<textarea name="huongDan" maxLength={4000} rows={3} placeholder="Mô tả yêu cầu bài tập" /></label>
            <label>Hạn nộp<input name="hanNop" type="datetime-local" /></label>
            <label>Số động tác<select name="soDongTac" defaultValue="5" onChange={() => { setReferenceAnalysis(null); setReferenceBoundaryDrafts({}); }}><option value="5">5 động tác</option><option value="6">6 động tác</option></select></label>
            <label className="video-file-label">Video hướng dẫn<input name="video" type="file" accept="video/*" required onChange={(event) => { selectReferenceVideo(event.target.files?.[0] ?? null); setReferenceAnalysis(null); setReferenceBoundaryDrafts({}); }} /></label>
            <p className="password-help">Quay rõ toàn thân và thực hiện động tác theo thứ tự. Mỗi động tác mặc định cần đạt 70% để được tính điểm. AI chia đoạn dựa trên thay đổi tư thế; hãy kiểm tra mốc thời gian do AI đề xuất. Video tối đa 100 MB.</p>
            {referenceAnalysis && referenceVideoUrl && (
              <section className="reference-segment-editor" aria-label="Xem và chỉnh các đoạn động tác">
                <div className="reference-segment-editor-heading">
                  <div><strong>AI đề xuất {referenceAnalysis.movementCount} đoạn</strong><small>Video dài {formatDuration(referenceAnalysis.durationSeconds)} · độ phủ nhận diện {referenceAnalysis.confidencePercent}%</small></div>
                  <span>{segmentsValid ? "Sẵn sàng xác nhận" : validationMessage}</span>
                </div>
                <video ref={referenceVideoElement} className="reference-segment-video" src={referenceVideoUrl} controls preload="metadata" />
                <p className="password-help">Các thời gian tính bằng giây. Chỉnh điểm đầu/cuối từng đoạn; đoạn không được chồng lấn và phải dài ít nhất 0,5 giây.</p>
                <ol className="reference-segment-edit-list">
                  {referenceAnalysis.movements.map((movement, index) => (
                    <li key={movement.movementNumber}>
                      <strong>Động tác {movement.movementNumber} · {movement.focus}</strong>
                      <label>Bắt đầu (giây)<input type="text" inputMode="decimal" value={referenceBoundaryDrafts[`${index}.startSeconds`] ?? String(movement.startSeconds)} onChange={(event) => updateReferenceMovement(index, "startSeconds", event.target.value)} /><button type="button" disabled={saving} onClick={() => setMovementBoundaryToPlaybackTime(index, "startSeconds")}>Lấy thời điểm đang phát</button></label>
                      <label>Kết thúc (giây)<input type="text" inputMode="decimal" value={referenceBoundaryDrafts[`${index}.endSeconds`] ?? String(movement.endSeconds)} onChange={(event) => updateReferenceMovement(index, "endSeconds", event.target.value)} /><button type="button" disabled={saving} onClick={() => setMovementBoundaryToPlaybackTime(index, "endSeconds")}>Lấy thời điểm đang phát</button></label>
                      <small>{formatVideoTime(confirmedMovements[index].startSeconds)} – {formatVideoTime(confirmedMovements[index].endSeconds)} · {Number.isFinite(confirmedMovements[index].durationSeconds) ? formatDuration(confirmedMovements[index].durationSeconds) : "Thời gian chưa hợp lệ"}</small>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <div className="modal-actions">
              <button type="button" className="button button-secondary" onClick={closeModal} disabled={saving}>Hủy</button>
              <button type="submit" className="button button-primary" disabled={saving || (!!referenceAnalysis && !segmentsValid)}>
                {saving && <ButtonSpinner />}
                {saving
                  ? referenceAnalysis ? "Đang tạo bài tập..." : "AI đang phân tích video mẫu..."
                  : referenceAnalysis ? "Xác nhận đoạn và tạo bài tập" : "Phân tích video mẫu"}
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <section className="panel students-panel">
      <div className="students-heading">
        <div><div className="members-title"><h2>{isTeacher ? "Lớp học của tôi" : "Lớp học của tôi"}</h2><span className="member-count">{classrooms.length}</span></div><p>{isTeacher ? "Tạo lớp, thêm học sinh và quản lý bài tập video." : "Xem bài tập video và bài nộp trong các lớp bạn tham gia."}</p></div>
        <div className="management-heading-actions">
          <label className="table-search student-search"><Icon name="search" size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm theo mã hoặc tên lớp..." aria-label="Tìm lớp học" /></label>
          {isTeacher && <button className="button button-primary" onClick={() => setClassModalOpen(true)}><Icon name="plus" size={16} /> Tạo lớp</button>}
        </div>
      </div>
      {error && <div className="class-error" role="alert">{error}</div>}
      {loading ? <div className="class-empty-state">Đang tải lớp học...</div> : visibleClassrooms.length ? (
        <>
          <div className="table-scroll student-table-scroll">
            <table className="student-table class-table">
              <thead><tr><th>STT</th><th>MÃ LỚP</th><th>TÊN LỚP</th><th>GIÁO VIÊN</th><th>SỐ HỌC SINH</th><th>NGÀY TẠO</th><th>THAO TÁC</th></tr></thead>
              <tbody>{pageClassrooms.map((classroom, index) => (
                <tr key={classroom.id}>
                  <td>{(currentPage - 1) * PAGE_SIZE + index + 1}</td><td><span className="student-class">{classroom.maLop}</span></td><td><strong className="student-name">{classroom.tenLop}</strong></td><td>{classroom.tenGiaoVien}</td><td>{classroom.soHocSinh}</td><td>{formatDate(classroom.ngayTao)}</td>
                  <td><button className="student-action-button class-open-button" aria-label={`Mở lớp ${classroom.tenLop}`} disabled={openingClassId !== null} onClick={() => void openClass(classroom)}>{openingClassId === classroom.id ? <ButtonSpinner /> : <Icon name="video" size={15} />}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>Hiển thị <strong>{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, visibleClassrooms.length)}</strong> trong <strong>{visibleClassrooms.length}</strong> lớp học</span>
            <div><button type="button" disabled={currentPage === 1} aria-label="Trang trước" onClick={() => setPage(currentPage - 1)}><Icon name="chevron" size={13} className="previous-chevron" /></button><span className="page-number">{currentPage} / {pageCount}</span><button type="button" disabled={currentPage === pageCount} aria-label="Trang sau" onClick={() => setPage(currentPage + 1)}><Icon name="chevron" size={13} /></button></div>
          </div>
        </>
      ) : <div className="class-empty-state">{query ? "Không tìm thấy lớp phù hợp." : isTeacher ? "Bạn chưa tạo lớp học nào." : "Bạn chưa được thêm vào lớp học nào."}</div>}
      {classModalOpen && renderClassModal()}
    </section>
  );
}
