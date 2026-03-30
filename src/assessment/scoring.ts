// ============================================================
// 评分模块 - RIASEC + IPIP 五大人格评分逻辑
// ============================================================

import type { InterestScores, PersonalityScores, InterestKey, PersonalityKey, Question } from '../lib/types'
import { questions, interestKeys, personalityKeys } from './questions'

// 计算平均值
function mean(values: number[], fallback = 3): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : fallback
}

// 标准化 RIASEC 兴趣分数到 18-92 量表
export function normalizeInterest(raw: InterestScores): InterestScores {
  const values = interestKeys.map((k) => raw[k])
  const m = values.reduce((a, b) => a + b, 0) / values.length
  const spread = Math.max(...values) - Math.min(...values)
  const amp = spread < 0.2 ? 2.2 : spread < 0.35 ? 2.0 : spread < 0.5 ? 1.75 : 1.55
  return interestKeys.reduce((acc, k) => {
    const centered = raw[k] - m
    const scaled = 50 + centered * 25 * amp
    acc[k] = Math.max(18, Math.min(92, Math.round(scaled)))
    return acc
  }, { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 } as InterestScores)
}

// 核心评分函数：根据答题计算 RIASEC 和 IPIP 分数
export function score(answers: Record<number, number>): { interest: InterestScores; personality: PersonalityScores } {
  // 按维度收集答题分数
  const interestBuckets = Object.fromEntries(interestKeys.map((k) => [k, [] as number[]])) as Record<InterestKey, number[]>
  const personalityBuckets = Object.fromEntries(personalityKeys.map((k) => [k, [] as number[]])) as Record<PersonalityKey, number[]>

  questions.forEach((q: Question) => {
    const raw = answers[q.id]
    if (typeof raw !== 'number') return
    const value = Math.max(1, Math.min(5, raw))
    if (q.kind === 'interest') {
      interestBuckets[q.dim as InterestKey].push(value)
    } else {
      // IPIP 人格题：反向计分题用 6-value
      personalityBuckets[q.dim as PersonalityKey].push(q.reverse ? 6 - value : value)
    }
  })

  // 计算原始 RIASEC 分数（加权平均，越靠后的题目权重略高）
  const rawInterest = interestKeys.reduce((acc, k, idx) => {
    const arr = interestBuckets[k]
    const weightedSum = arr.reduce((sum, v, i) => sum + v * (1 + i * 0.04), 0)
    const weightedWeight = arr.reduce((sum, _, i) => sum + 1 + i * 0.04, 0) || 1
    acc[k] = (arr.length ? weightedSum / weightedWeight : 3) + idx * 0.002
    return acc
  }, { R: 3, I: 3, A: 3, S: 3, E: 3, C: 3 } as InterestScores)

  // 标准化
  const interest = normalizeInterest(rawInterest)

  // 计算 IPIP 五大人格分数（转换为 0-100 量表）
  const personality = personalityKeys.reduce((acc, k) => {
    acc[k] = Math.round(((mean(personalityBuckets[k]) - 1) / 4) * 100)
    return acc
  }, { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, stability: 50 } as PersonalityScores)

  return { interest, personality }
}

// 对得分对象按值降序排序
export function sortEntries<T extends string>(obj: Record<T, number>): Array<[T, number]> {
  return (Object.entries(obj) as Array<[T, number]>).sort((a, b) => b[1] - a[1])
}

// 取 Top N 维度 key
export function topKeys<T extends string>(obj: Record<T, number>, n: number): T[] {
  return sortEntries(obj).slice(0, n).map(([key]) => key)
}

// 计算用户向量与岗位向量的余弦相似度（简化为曼哈顿距离反转）
export function distance<T extends string>(user: Record<T, number>, target: Record<T, number>): number {
  const keys = Object.keys(target) as T[]
  const total = keys.reduce((sum, key) => sum + Math.abs((user[key] ?? 0) - target[key]), 0)
  return Math.round((1 - total / (keys.length * 100)) * 100)
}
