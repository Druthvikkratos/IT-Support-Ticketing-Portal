export const FILE_CATEGORIES = {
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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ],
    extensions: ['.xlsx', '.xls'],
  },
  document: {
    label: 'Word Documents',
    mimeTypes: [
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    ],
    extensions: ['.doc', '.docx'],
  },
  video: {
    label: 'Videos',
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
    extensions: ['.mp4', '.mov', '.avi'],
  },
} as const;

export type FileCategory = keyof typeof FILE_CATEGORIES;