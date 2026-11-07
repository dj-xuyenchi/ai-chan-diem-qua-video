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
  suggestedScore: number;
  confidencePercent: number;
  scoreBreakdown: string;
  movementCount: number;
  correctMovementCount: number;
  incorrectMovementCount: number;
  pointsPerMovement: number;
  movements: MovementScore[];
};

export type ReferenceMovement = {
  movementNumber: number;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  focus: string;
};

export type ReferenceAnalysis = {
  movementCount: number;
  movements: ReferenceMovement[];
  explanation: string;
  confidencePercent: number;
  durationSeconds: number;
};

export type MovementScore = {
  movementNumber: number;
  passed: boolean;
  similarityPercent: number;
  pointsAwarded: number;
  maxPoints: number;
  passThresholdPercent: number | null;
  focus: string;
  explanation: string;
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
  aiDongTacMau: ReferenceMovement[] | null;
  aiMoTaDongTacMau: string | null;
  aiNguongDatPercent: number;
  baiNop: VideoSubmission[];
};
