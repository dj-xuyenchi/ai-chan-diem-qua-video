export type UserKind = "GIAO_VIEN" | "HOC_SINH";

export type UserRecord = {
  id: number;
  hoTen: string;
  maSinhVien?: string | null;
  ngaySinh: string;
  email: string;
  soDienThoai: string | null;
  gioiTinh: "NAM" | "NU" | "KHAC";
  daCoMatKhau: boolean;
  matKhauTamThoi?: string;
  ngayTao: string;
  nguoiTaoId: number;
  ngayCapNhat: string;
  nguoiCapNhatId: number | null;
  loaiNguoiDung: UserKind;
};

export type UserMutation = {
  hoTen: string;
  maSinhVien?: string;
  ngaySinh: string;
  email: string;
  soDienThoai: string;
  matKhau?: string;
  gioiTinh: UserRecord["gioiTinh"];
  nguoiTaoId?: number;
  nguoiCapNhatId?: number;
};
