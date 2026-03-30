// ============================================================
// 题库模块 - 从原 App.tsx 提取的 44 道测评题目
// RIASEC 霍兰德职业兴趣 18 题 + IPIP 五大人格 26 题
// ============================================================

import type { Question, InterestKey, PersonalityKey } from '../lib/types'

// 霍兰德职业兴趣维度标签
export const interestLabels: Record<InterestKey, string> = {
  R: '现实型',
  I: '研究型',
  A: '艺术型',
  S: '社会型',
  E: '企业型',
  C: '常规型',
}

// 霍兰德职业兴趣维度说明
export const interestNotes: Record<InterestKey, { hi: string; lo: string }> = {
  R: { hi: '高分代表偏好动手实操和成果落地', lo: '低分代表不以具体执行为首要偏好' },
  I: { hi: '高分代表喜欢研究分析和追根究底', lo: '低分代表不偏好长时间深度分析' },
  A: { hi: '高分代表偏好创意表达和开放探索', lo: '低分代表更偏向明确结构与规则' },
  S: { hi: '高分代表关注助人协作与关系支持', lo: '低分代表不以服务型互动为主' },
  E: { hi: '高分代表愿意影响他人并推动结果', lo: '低分代表较少主动主导或说服' },
  C: { hi: '高分代表重视秩序流程与细节管理', lo: '低分代表不偏好高重复和强规则' },
}

// IPIP 五大人格维度标签
export const personalityLabels: Record<PersonalityKey, string> = {
  openness: '开放性',
  conscientiousness: '尽责性',
  extraversion: '外向性',
  agreeableness: '宜人性',
  stability: '情绪稳定性',
}

// IPIP 五大人格维度说明
export const personalityNotes: Record<PersonalityKey, { hi: string; lo: string }> = {
  openness: { hi: '高分代表开放好奇、愿意尝试新方法', lo: '低分代表更偏稳妥熟悉路径' },
  conscientiousness: { hi: '高分代表自律负责、重计划和闭环', lo: '低分代表执行节奏易受外界影响' },
  extraversion: { hi: '高分代表表达主动、乐于外部互动', lo: '低分代表更偏安静独立处理任务' },
  agreeableness: { hi: '高分代表重协作、体谅与关系维护', lo: '低分代表更直接，较少顾及关系缓冲' },
  stability: { hi: '高分代表情绪稳定、抗压恢复较快', lo: '低分代表更易受压力波动影响' },
}

/** 各兴趣类型在求职与岗位选择上的补充解读（用于报告「不同类型的解析」） */
export const interestTypeExplain: Record<InterestKey, string> = {
  R: '更偏好可触摸的产出与工具操作，适合工程实施、运维、技术支持与生产类岗位；职业满意度往往来自「看得见、摸得着」的交付物。',
  I: '擅长信息搜集、假设验证与深度分析，适合研究、策略分析与研发类工作；在决策前更愿意把问题拆透再行动。',
  A: '重视创意表达与审美空间，适合内容、设计、策划与产品创新类角色；在规则过死、重复度极高的环境中容易消耗热情。',
  S: '从助人、协作与关系支持中获得动力，适合教育、服务、人力与客户成功等方向；团队氛围与意义感对留存影响较大。',
  E: '愿意影响他人、争取资源并推动结果，适合销售、商务、管理与对外岗位；需要明确目标感与可量化的成就感。',
  C: '偏好清晰流程、数据与细节管理，适合运营、财务、审计与流程类岗位；结构化环境更容易发挥稳定输出。',
}

/** 各人格维度在工作场景中的补充解读（用于报告「不同类型的解析」） */
export const personalityTypeExplain: Record<PersonalityKey, string> = {
  openness: '影响你对新方法、新领域与不确定性的接纳度；偏高更适合探索型岗位，偏低更适合成熟打法与可预期节奏。',
  conscientiousness: '影响计划性、闭环与细节把控；偏高适合强交付与多线程项目，偏低需注意排期与复盘习惯的外化。',
  extraversion: '影响对外沟通、会议与协作密度；偏高适合高频互动场景，偏低可优先深度工作与异步协作环境。',
  agreeableness: '影响合作风格与冲突处理；偏高更擅长润滑团队，偏低在谈判与目标推进时可能更直接。',
  stability: '影响压力下的情绪波动与恢复速度；偏高适合高压节奏，偏低可搭配节奏管理与支持系统。',
}

// 年级选项
export const grades = ['大一', '大二', '大三', '大四', '研一', '研二', '研三', '已毕业 / Gap']

// 5 级李克特量表选项
export const scoreScale = [
  { value: 1, label: '非常不符合' },
  { value: 2, label: '比较不符合' },
  { value: 3, label: '一般' },
  { value: 4, label: '比较符合' },
  { value: 5, label: '非常符合' },
]

// 维度 key 数组（用于遍历计算）
export const interestKeys: InterestKey[] = ['R', 'I', 'A', 'S', 'E', 'C']
export const personalityKeys: PersonalityKey[] = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'stability']

// 正式测评题目（44 道）
// 格式：[id, kind, dim, text, reverse?]
const questionData: Array<[number, 'interest' | 'personality', string, string, boolean?]> = [
  // ---------- RIASEC 霍兰德职业兴趣 18 题 ----------
  [1, 'interest', 'R', '我愿意动手完成具体任务。'],
  [2, 'interest', 'R', '我喜欢看见直接成果。'],
  [3, 'interest', 'R', '我对现场执行类工作有兴趣。'],
  [4, 'interest', 'I', '我愿意研究问题原因。'],
  [5, 'interest', 'I', '分析归纳会让我有成就感。'],
  [6, 'interest', 'I', '我倾向先分析再下结论。'],
  [7, 'interest', 'A', '我喜欢创意表达。'],
  [8, 'interest', 'A', '我喜欢尝试新方法。'],
  [9, 'interest', 'A', '有创作空间时我更投入。'],
  [10, 'interest', 'S', '我愿意倾听并帮助别人。'],
  [11, 'interest', 'S', '看到别人进步会让我满足。'],
  [12, 'interest', 'S', '我更容易被服务支持类工作吸引。'],
  [13, 'interest', 'E', '我愿意争取资源推动目标。'],
  [14, 'interest', 'E', '我不回避说服他人。'],
  [15, 'interest', 'E', '我对组织带动结果类工作有兴趣。'],
  [16, 'interest', 'C', '我对整理信息和流程执行有耐心。'],
  [17, 'interest', 'C', '规则清晰时我更容易发挥。'],
  [18, 'interest', 'C', '我不排斥核对排期复盘。'],

  // ---------- IPIP 五大人格 26 题 ----------
  [19, 'personality', 'extraversion', '我通常愿意主动表达。'],
  [20, 'personality', 'agreeableness', '我愿意配合团队推进。'],
  [21, 'personality', 'conscientiousness', '我做事有计划。'],
  [22, 'personality', 'stability', '我常因压力明显焦虑。', true],
  [23, 'personality', 'openness', '我对新想法保持开放。'],
  [24, 'personality', 'extraversion', '我更倾向独处。', true],
  [25, 'personality', 'agreeableness', '我有时不太顾及他人感受。', true],
  [26, 'personality', 'conscientiousness', '我偶尔会拖延。', true],
  [27, 'personality', 'stability', '我通常能较快恢复稳定。'],
  [28, 'personality', 'openness', '我不太愿意尝试新做法。', true],
  [29, 'personality', 'extraversion', '我能自然加入讨论。'],
  [30, 'personality', 'agreeableness', '我愿意理解不同观点。'],
  [31, 'personality', 'conscientiousness', '我重视质量和结果闭环。'],
  [32, 'personality', 'stability', '我容易反复担心。', true],
  [33, 'personality', 'openness', '我愿意多角度思考。'],
  [34, 'personality', 'extraversion', '陌生场景中我通常不主动。', true],
  [35, 'personality', 'agreeableness', '为了目标我有时不顾协调过程。', true],
  [36, 'personality', 'conscientiousness', '没有要求时我不一定主动检查细节。', true],
  [37, 'personality', 'stability', '遇到变化时我大多能保持冷静。'],
  [38, 'personality', 'openness', '我愿意接触新领域。'],

  // ---------- 补充题目（用于提高区分度） ----------
  [39, 'interest', 'R', '我更喜欢把想法变成看得见的成果。'],
  [40, 'interest', 'I', '遇到复杂问题时，我会想继续追根究底。'],
  [41, 'interest', 'A', '我喜欢在固定要求之外加入自己的表达方式。'],
  [42, 'interest', 'S', '我会因为帮助别人解决问题而获得满足感。'],
  [43, 'interest', 'E', '我愿意主动带头推动一件事往前走。'],
  [44, 'interest', 'C', '我做事时会自然去整理顺序和细节。'],
]

// 将题目元组数组转换为正式 Question 对象数组
export const questions: Question[] = questionData.map(
  ([id, kind, dim, text, reverse]) => ({
    id,
    kind,
    dim: dim as InterestKey | PersonalityKey,
    text,
    reverse: reverse ?? false,
  })
)

// 题目总数
export const QUESTION_COUNT = questions.length

// 简介文字（用于学生端展示）
export const introTexts = {
  riasec: 'RIASEC 模型（霍兰德），是职业心理学领域最具影响力和广泛研究的框架之一。该理论基于人格-环境匹配的范式，主张职业选择是个性的表达。',
  ipip: 'IPIP 五大人格测试由 IPIP-NEO-50 理论支撑，从开放性、尽责性、外向性等 5 个维度对你进行评估。',
  combined: 'RIASEC 用来判断你更容易被哪类工作内容吸引，IPIP 用来识别你的做事风格、沟通方式和压力反应。两者结合，能更完整地看清你适合什么岗位，以及更适合怎样的发展路径。',
}
