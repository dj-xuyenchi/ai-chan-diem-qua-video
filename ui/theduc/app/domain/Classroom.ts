export type ClassroomMember = {
  id: number;
  hoTen: string;
  maSinhVien: string;
  email: string;
  ngayThamGia: string;
};

export type Classroom = {
  id: number;
  maLop: string;
  tenLop: string;
  giaoVienId: number;
  tenGiaoVien: string;
  ngayTao: string;
  soHocSinh: number;
  hocSinh: ClassroomMember[];
};

export type VideoSubmission = {
  id: number;
  hocSinhId: number;
  tenHocSinh: string;
  maSinhVien: string;
  tenVideo: string;
  videoUrl: string;
  ngayNop: string;
  diem: number | null;
  nhanXet: string | null;
  baiCuaToi: boolean;
  aiDanhGia: AiVideoEvaluation | null;
  trangThaiAi: "DANG_DANH_GIA" | "DA_DANH_GIA" | "LOI" | null;
  loiDanhGiaAi: string | null;
};

export type AiVideoEvaluation = {
  similarityPercent: number;
  speedDifferencePercent: number;
  speedAssessment: "SLOWER" | "FASTER" | "SIMILAR";
  suggestedScore: number;
  confidencePercent: number;
  referenceMovementSeconds: number;
  submissionMovementSeconds: number;
  scoreBreakdown: string;
};

export type VideoAssignment = {
  id: number;
  lopHocId: number;
  tieuDe: string;
  huongDan: string;
  hanNop: string | null;
  tenVideo: string;
  videoUrl: string;
  ngayTao: string;
  giaoVienId: number;
  tenGiaoVien: string;
  baiNop: VideoSubmission[];
};
