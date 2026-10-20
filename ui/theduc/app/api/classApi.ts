import { API_BASE_URL } from "../config/api";
import type { AiVideoEvaluation, Classroom, VideoAssignment } from "../domain/Classroom";
import { apiRequest } from "./apiRequest";

const endpoint = `${API_BASE_URL}/lop-hoc`;

export function getClassrooms() {
  return apiRequest<Classroom[]>(endpoint);
}

export function createClassroom(payload: { maLop: string; tenLop: string }) {
  return apiRequest<Classroom>(endpoint, { method: "POST", body: JSON.stringify(payload) });
}

export function getClassroom(id: number) {
  return apiRequest<Classroom>(`${endpoint}/${id}`);
}

export function addClassroomStudents(id: number, hocSinhIds: number[]) {
  return apiRequest<Classroom>(`${endpoint}/${id}/hoc-sinh`, {
    method: "POST",
    body: JSON.stringify({ hocSinhIds }),
  });
}

export function removeClassroomStudent(classId: number, studentId: number) {
  return apiRequest<Classroom>(`${endpoint}/${classId}/hoc-sinh/${studentId}/xoa`, { method: "POST" });
}

export function getAssignments(classId: number) {
  return apiRequest<VideoAssignment[]>(`${endpoint}/${classId}/bai-tap`);
}

export function createAssignment(
  classId: number,
  data: { tieuDe: string; huongDan: string; hanNop: string; video: File },
) {
  const formData = new FormData();
  formData.set("tieuDe", data.tieuDe);
  formData.set("huongDan", data.huongDan);
  if (data.hanNop) formData.set("hanNop", data.hanNop);
  formData.set("video", data.video);
  return apiRequest<VideoAssignment>(`${endpoint}/${classId}/bai-tap`, {
    method: "POST",
    body: formData,
  });
}

export function submitAssignment(classId: number, assignmentId: number, video: File) {
  const formData = new FormData();
  formData.set("video", video);
  return apiRequest<VideoAssignment>(
    `${endpoint}/${classId}/bai-tap/${assignmentId}/bai-nop`,
    { method: "POST", body: formData },
  );
}

export function gradeSubmission(
  classId: number,
  assignmentId: number,
  submissionId: number,
  diem: number,
  nhanXet: string,
) {
  return apiRequest<VideoAssignment>(
    `${endpoint}/${classId}/bai-tap/${assignmentId}/bai-nop/${submissionId}/cham-diem`,
    { method: "POST", body: JSON.stringify({ diem, nhanXet }) },
  );
}

export function evaluateSubmission(classId: number, assignmentId: number, submissionId: number) {
  return apiRequest<AiVideoEvaluation>(
    `${endpoint}/${classId}/bai-tap/${assignmentId}/bai-nop/${submissionId}/ai-danh-gia`,
    { method: "POST" },
  );
}
