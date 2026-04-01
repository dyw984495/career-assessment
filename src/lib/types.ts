// ============================================================
// 全局 TypeScript 类型定义
// ============================================================

// RIASEC 职业兴趣维度
export type InterestKey = 'R' | 'I' | 'A' | 'S' | 'E' | 'C'

// IPIP 五大人格维度
export type PersonalityKey = 'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'stability'

// 兴趣得分
export type InterestScores = Record<InterestKey, number>

// 人格得分
export type PersonalityScores = Record<PersonalityKey, number>

// 题目类型
export type QuestionKind = 'interest' | 'personality'

// 单道题目
export interface Question {
  id: number
  kind: QuestionKind
  dim: InterestKey | PersonalityKey
  text: string
  reverse?: boolean
}

// 岗位类型
export interface Role {
  name: string
  icon: string
  interest: InterestScores
  personality: PersonalityScores
  desc: string
  tasks: string[]
  taskDetails: string[]  // Excel 中的详细任务（分点描述）
  school: string
  skills: string[]
  salary: string[]
  industries: string[]
  companies: string[]
  /** 校招门槛-实习经历要求（岗位库.xlsx）；历史报告 JSON 可能无此字段 */
  internshipRequirement?: string
}

// 推荐岗位（含匹配分和推荐理由）
export interface RecommendedRole extends Role {
  score: number
  why: Array<{ label: string; text: string }>
}

// 专业背景分类
export interface MajorProfile {
  label: string
  note: string
  direct: string[]
  adjacent: string[]
}

// 学生信息
export interface Student {
  name: string
  major: string
  grade: string
}

// 任务状态
export type TaskStatus = 'pending' | 'started' | 'submitted' | 'expired'

// 任务记录（数据库模型）
export interface AssessmentTask {
  id: string
  token: string
  student_name: string | null
  student_phone: string | null
  source: string | null
  /** 管理端记录，不写入学生报告（旧库未迁移时可能无此字段） */
  institution_name?: string | null
  status: TaskStatus
  expires_at: string | null
  submitted_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// 提交记录（数据库模型）
export interface AssessmentSubmission {
  id: string
  task_id: string
  answers_json: Record<number, number>
  riasec_scores_json: InterestScores
  ipip_scores_json: PersonalityScores
  top_roles_json: RecommendedRole[]
  report_json: AssessmentReport
  created_at: string
  updated_at: string
}

// 完整报告结构
export interface AssessmentReport {
  id: string
  createdAt: string
  student: Student
  profile: MajorProfile
  interest: InterestScores
  personality: PersonalityScores
  interestResult: {
    code: string
    title: string
    text: string
  }
  personalityResult: {
    headline: string
    text: string
  }
  selectedRoles: RecommendedRole[]
  tips: string[]
}

// Token 校验结果
export interface TokenValidation {
  valid: boolean
  reason?: 'not_found' | 'expired' | 'already_submitted' | 'usable'
  task?: AssessmentTask
}

// 提交结果
export interface SubmitResult {
  success: boolean
  error?: string
}

// API 响应类型
export interface ApiResponse<T> {
  data?: T
  error?: string
}
