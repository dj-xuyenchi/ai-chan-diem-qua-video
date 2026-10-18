export type VideoSubmission = {
  studentId: string;
  videoName: string;
  videoUrl: string;
  submittedAt: string;
};

export type VideoAssignment = {
  id: string;
  classId: string;
  title: string;
  instructions: string;
  dueDate: string;
  videoName: string;
  videoUrl: string;
  createdAt: string;
  createdBy: string;
  submissions: VideoSubmission[];
};
