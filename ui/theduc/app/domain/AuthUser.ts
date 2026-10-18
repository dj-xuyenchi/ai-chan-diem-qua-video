import type { UserKind } from "./User";

export type AuthUser = {
  id: number;
  hoTen: string;
  email: string;
  loaiNguoiDung: UserKind;
  doiMatKhauLanDau: boolean;
  csrfToken: string;
};
