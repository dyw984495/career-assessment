// ============================================================
// 报告生成模块 - 基于测评结果生成完整结构化报告
// ============================================================

import type { InterestScores, PersonalityScores, MajorProfile, RecommendedRole, AssessmentReport, Student } from '../lib/types'
import { interestLabels, personalityLabels } from './questions'
import { roles, majorRules, needHighInternship } from './roles'
import { sortEntries, topKeys, distance } from './scoring'

// 专业背景分类函数
export function majorProfile(major: string): MajorProfile {
  const value = major.trim()
  if (!value) return { label: '未填写专业', note: '由于未输入本科专业，系统无法做专业相关性校正。', direct: [], adjacent: [] }
  const hits = majorRules.filter((item) => item.keys.some((keyword) => value.includes(keyword)))
  if (!hits.length) return { label: '通用专业背景', note: '该专业未命中预设分类，系统将按通用职业能力进行推荐。', direct: [], adjacent: [] }
  return {
    label: [...new Set(hits.map((item) => item.label))].join(' / '),
    note: [...new Set(hits.map((item) => item.note))].join(' '),
    direct: [...new Set(hits.flatMap((item) => item.direct))],
    adjacent: [...new Set(hits.flatMap((item) => item.adjacent))],
  }
}

// 兴趣总结函数
export function interestSummary(interest: InterestScores) {
  const sorted = sortEntries(interest)
  const high = sorted.slice(0, 3)
  const low = sorted.slice(-2)
  return {
    code: high.map(([k]) => k).join(''),
    title: high.map(([k]) => interestLabels[k]).join(' × '),
    text: `你的职业兴趣更集中在「${high.map(([k]) => interestLabels[k]).join('、')}」上。相对而言，「${low.map(([k]) => interestLabels[k]).join('、')}」不是当前最强方向。`,
  }
}

// 人格总结函数
export function personalitySummary(personality: PersonalityScores) {
  const sorted = sortEntries(personality)
  const high = sorted.slice(0, 2)
  const low = sorted.slice(-2)
  return {
    headline: high.map(([k]) => personalityLabels[k]).join(' × '),
    text: `你当前较突出的工作风格主要体现在「${high.map(([k]) => personalityLabels[k]).join('、')}」上；相对而言，「${low.map(([k]) => personalityLabels[k]).join('、')}」不是当前最突出的特征。`,
  }
}

// 专业相关性评分
function majorScore(roleName: string, profile: MajorProfile): number {
  if (profile.direct.includes(roleName)) return 92
  if (profile.adjacent.includes(roleName)) return 78
  return profile.direct.length || profile.adjacent.length ? 55 : 70
}

// 专业相关性理由
function majorReason(roleName: string, profile: MajorProfile): string {
  if (profile.direct.includes(roleName)) return '该岗位与你的本科专业相关性较强。'
  if (profile.adjacent.includes(roleName)) return '该岗位与你的本科专业存在可迁移关联。'
  return '该岗位更多基于通用能力匹配。'
}

// 岗位推荐函数
export function recommend(interest: InterestScores, personality: PersonalityScores, profile: MajorProfile): RecommendedRole[] {
  return roles
    .map((role) => ({
      ...role,
      score: Math.round(
        distance(interest, role.interest) * 0.4 +
        distance(personality, role.personality) * 0.35 +
        majorScore(role.name, profile) * 0.25
      ),
      why: [
        { label: '兴趣模型', text: `你的高分兴趣为「${topKeys(interest, 3).map((k) => interestLabels[k]).join('、')}」，该岗位更偏向「${topKeys(role.interest, 3).map((k) => interestLabels[k]).join('、')}」的工作场景。` },
        { label: '性格模型', text: `你的突出工作风格为「${topKeys(personality, 2).map((k) => personalityLabels[k]).join('、')}」，与该岗位常见要求较接近。` },
        { label: '专业相关性', text: majorReason(role.name, profile) },
      ],
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
}

// 年级建议
const GRADE_ADVICE: Record<string, string> = {
  大一: '先做职业探索与基础能力建设。',
  大二: '开始岗位定向补强；如已有相关实习，继续提高实习质量与岗位相关性；如尚无相关实习，尽快争取首段岗位相关实习。',
  大三: '围绕目标岗位继续补强经历质量，检查是否已具备 1-2 段有含金量的相关实习。',
  大四: '聚焦秋招春招投递、面试与简历打磨。',
  研一: '尽快锁定目标岗位并完成高质量实习。',
  研二: '重点放在秋招转化和 offer 结果。',
  研三: '快速补强短板并进入高频投递。',
  '已毕业 / Gap': '缩窄岗位范围，补可验证经历。',
}

export function gradeAdvice(grade: string): string {
  return GRADE_ADVICE[grade] || '尽快把测评结果转化为岗位选择与经历补强行动。'
}

// 构建行动建议
export function buildTips(student: Student, selected: RecommendedRole[]): string[] {
  const first = selected[0]?.name || '目标岗位'
  return [gradeAdvice(student.grade), `建议尽早围绕「${first}」补齐相关实习或项目经历，并尽快进入岗位化准备。`]
}

// 完整的报告生成入口函数（服务端直接调用）
export function buildReport(
  answers: Record<number, number>,
  student: Student,
  riasecScores: InterestScores,
  ipipScores: PersonalityScores
): AssessmentReport {
  const profile = majorProfile(student.major)
  const interestResult = interestSummary(riasecScores)
  const personalityResult = personalitySummary(ipipScores)
  const selectedRoles = recommend(riasecScores, ipipScores, profile)
  const tips = buildTips(student, selectedRoles)

  return {
    id: `RP-${Date.now()}`,
    createdAt: new Date().toISOString(),
    student,
    profile,
    interest: riasecScores,
    personality: ipipScores,
    interestResult,
    personalityResult,
    selectedRoles,
    tips,
  }
}

// 实习建议
export function getInternshipAdvice(roleName: string): string {
  return needHighInternship(roleName) ? '建议至少 3 段高质量相关实习。' : '建议至少 2 段相关实习。'
}
