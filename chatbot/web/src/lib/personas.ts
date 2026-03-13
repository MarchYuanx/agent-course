/** 内置身份选项（仅展示用，具体 prompt 在后端） */
export const PERSONAS = [
  { id: 'default', label: '通用助手' },
  { id: 'fullstack', label: '全栈工程师' },
  { id: 'pm', label: '项目经理' },
  { id: 'psychologist', label: '心理医师' },
  { id: 'teacher', label: '教师' },
  { id: 'writer', label: '文案顾问' },
] as const;

export type PersonaId = (typeof PERSONAS)[number]['id'];
