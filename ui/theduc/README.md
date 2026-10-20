This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Backend API

Start the Spring Boot API on `http://localhost:8080`. The dashboard first requires a backend login with an existing teacher or student account.

The UI uses `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8080/api`). The backend uses an HttpOnly session cookie and CSRF tokens for user-management requests; audit fields use the authenticated user's ID.

New users receive a random 12–18 character temporary password, shown once after creation. Existing passwordless accounts must be initialized with the backend's `app.auth.legacy-password-export-path` option; see [the backend API guide](../../ai/HELP.md). Users are required to change temporary passwords at first sign-in. Passwords are stored as PBKDF2-HMAC-SHA256 hashes.

Tables show at most 20 rows per page and use row order (STT) instead of exposing database IDs.

The **Lớp học** section uses backend-managed classes and video assignments. Teachers can enroll any number of students, upload assignment videos, review submissions, and grade them from 0 to 10. Students can submit/resubmit videos and view submissions from classmates in the same class. Assignment and submission uploads are limited to 100 MB each and stored by the backend in `VIDEO_STORAGE_DIR` (default `ai/data/videos`); configure persistent storage before deployment.

Teachers can open each assignment's review screen to see submission totals, search students, and page through submissions. When a student submits or resubmits a video, the backend automatically evaluates it against the assignment video and stores the AI suggestion with the submission. Teachers can also request a new analysis via `POST /api/lop-hoc/{lopHocId}/bai-tap/{baiTapId}/bai-nop/{baiNopId}/ai-danh-gia` (teacher session and CSRF token required). AI suggests movement similarity, relative movement duration, and a score from 0 to 10; it never replaces the teacher's manual grade. An AI analysis failure does not discard the submission and is shown so the teacher can retry. Install Python 3.9–3.12 and the packages in `requirements-ai.txt`, then configure `AI_PYTHON_EXECUTABLE` and `AI_SCORING_SCRIPT_PATH` for the backend environment if the defaults (`python` and `../mvp_scoring.py`) do not apply. The current MVP compares knee angles and hip position and estimates speed from the time the knee angle changes; camera framing or an unclear pose can affect the suggestion.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
