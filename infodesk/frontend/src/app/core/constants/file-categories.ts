export const FRONTEND_FILE_CATEGORIES: Record<
  string,
  { label: string; mimeTypes: string[]; extensions: string[] }
> = {
  image: {
    label: 'Images',
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  pdf: {
    label: 'PDF Documents',
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
  },
  excel: {
    label: 'Excel Spreadsheets',
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    extensions: ['.xlsx', '.xls'],
  },
  document: {
    label: 'Word Documents',
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    extensions: ['.doc', '.docx'],
  },
  video: {
    label: 'Videos',
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
    extensions: ['.mp4', '.mov', '.avi'],
  },
};
