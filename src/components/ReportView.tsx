// ============================================================
// 报告展示组件 - 用于管理端查看完整报告
// ============================================================

import type { AssessmentReport, InterestKey, PersonalityKey, RecommendedRole } from '../lib/types'
import {
  interestLabels,
  interestNotes,
  interestTypeExplain,
  personalityLabels,
  personalityNotes,
  personalityTypeExplain,
} from '../assessment/questions'
import { getTaskNote, INTERNSHIP_REQUIREMENTS } from '../assessment/roles'
import { getInternshipAdvice } from '../assessment/report'

/** 报告末尾附带的求职时间线参考图（置于 public/report-timeline/） */
const REPORT_TIMELINE_IMAGES = [
  {
    src: '/report-timeline/26入学港硕求职时间线_01.png',
    alt: '2026 fall 港硕求职时间线规划（以 9 月入学为例）',
  },
  {
    src: '/report-timeline/26入学港硕求职时间线_02.png',
    alt: '2026 fall 英硕求职时间线规划（以 9 月入学为例）',
  },
  {
    src: '/report-timeline/26入学港硕求职时间线_03.png',
    alt: '2026 fall 美硕求职时间线规划（一年制授课示例）',
  },
  {
    src: '/report-timeline/26入学港硕求职时间线_04.png',
    alt: '2026 fall 澳硕求职时间线规划（以 9 月入学为例）',
  },
] as const

interface ReportViewProps {
  report: AssessmentReport
}

/**
 * 用 SVG 画条：html2canvas 对 flex 内 linear-gradient 常画不出；SVG 属性克隆不依赖子树 syncPdfStyles。
 */
function IntensityBar(props: { value0to100: number; fill: string; track?: string }) {
  const { value0to100, fill, track = '#f3f4f6' } = props
  const p = Math.max(0, Math.min(100, Math.round(value0to100)))
  const wFill = Math.max(p, p > 0 ? 0.8 : 0)
  return (
    <div className="flex items-center gap-2 w-full min-w-[8rem]">
      <svg
        className="flex-1 min-w-[5rem] h-[10px]"
        style={{ width: '100%', maxWidth: '14rem', display: 'block' }}
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
        aria-hidden
      >
        <rect x="0" y="0" width="100" height="8" fill={track} rx="3" />
        <rect x="0" y="0" width={wFill} height="8" fill={fill} rx="3" />
      </svg>
      <span className="text-xs tabular-nums w-9 text-right shrink-0" style={{ color: '#6b7280' }}>
        {p}
      </span>
    </div>
  )
}

function interestToPercent(score: number): number {
  return Math.round(((score - 18) / (92 - 18)) * 100)
}

function taskDetailLine(task: string) {
  return (
    <li key={task} className="text-sm text-gray-700 leading-relaxed">
      <span className="font-semibold text-gray-800">{task}</span>
      <span className="text-gray-600">：{getTaskNote(task)}</span>
    </li>
  )
}

/** 实习经历要求：优先报告内嵌字段，否则按岗位名对齐岗位库.xlsx，最后兼容旧版短句 */
function internshipDisplayText(role: RecommendedRole): string {
  if (role.internshipRequirement) return role.internshipRequirement
  const fromExcel = INTERNSHIP_REQUIREMENTS[role.name]
  if (fromExcel) return fromExcel
  return getInternshipAdvice(role.name)
}

const INTEREST_KEYS: InterestKey[] = ['R', 'I', 'A', 'S', 'E', 'C']
const PERSONALITY_KEYS: PersonalityKey[] = [
  'openness',
  'conscientiousness',
  'extraversion',
  'agreeableness',
  'stability',
]

export function ReportView({ report }: ReportViewProps) {
  const { student, profile, interest, personality, interestResult, personalityResult, selectedRoles, tips } = report
  const createdStr = new Date(report.createdAt).toLocaleString('zh-CN')
  const interestOrder = [...INTEREST_KEYS].sort((a, b) => interest[b] - interest[a])
  const personalityOrder = [...PERSONALITY_KEYS].sort((a, b) => personality[b] - personality[a])

  return (
    <div className="space-y-6" data-report-pdf-root>
      {/* 测评封面：高度控制在一页内，避免 PDF 把同一节裁成两页 */}
      <section
        className="rounded-2xl overflow-hidden flex flex-col gap-8 p-10 md:p-11 box-border"
        style={{
          background: 'linear-gradient(165deg, #0f172a 0%, #1e3a5f 45%, #0c4a6e 100%)',
          color: '#f8fafc',
        }}
      >
        <div>
          <p className="text-sm font-medium tracking-widest uppercase opacity-80" style={{ color: '#94a3b8' }}>
            Career Assessment
          </p>
          <h1 className="mt-3 text-3xl md:text-4xl font-black leading-tight" style={{ color: '#ffffff' }}>
            职业规划测评报告
          </h1>
          <p className="mt-3 text-base max-w-xl" style={{ color: '#cbd5e1' }}>
            RIASEC 职业兴趣 × IPIP 五大人格 · 综合解读与岗位推荐
          </p>
        </div>
        <div
          className="rounded-2xl p-6 md:p-7 border"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', borderColor: 'rgba(148, 163, 184, 0.35)' }}
        >
          <p className="text-xs mb-1" style={{ color: '#94a3b8' }}>
            测评对象
          </p>
          <p className="text-2xl font-bold" style={{ color: '#ffffff' }}>
            {student.name}
          </p>
          <p className="mt-2 text-sm" style={{ color: '#e2e8f0' }}>
            {student.major} &nbsp;|&nbsp; {student.grade}
          </p>
          <div className="mt-6 pt-6 border-t text-sm space-y-1" style={{ borderColor: 'rgba(148, 163, 184, 0.35)', color: '#cbd5e1' }}>
            <p>
              <span style={{ color: '#94a3b8' }}>报告 ID：</span>
              {report.id}
            </p>
            <p>
              <span style={{ color: '#94a3b8' }}>生成时间：</span>
              {createdStr}
            </p>
          </div>
        </div>
      </section>

      {/* RIASEC */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">兴趣模型</h3>
          <p className="text-sm text-gray-500 mt-1">RIASEC 霍兰德职业兴趣</p>
        </div>
        <div className="px-5 py-4">
          <div className="flex flex-wrap items-start gap-3 mb-3">
            <span className="text-4xl font-black text-gray-900 leading-none">{interestResult.code}</span>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-50 text-orange-700">
                {interestResult.title}
              </span>
              <p className="text-sm text-gray-500 mt-1">{interestResult.text}</p>
            </div>
          </div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-3 font-medium">维度</th>
                <th className="py-2 pr-3 font-medium w-[4.5rem]">得分</th>
                <th className="py-2 font-medium">相对强度（0–100）</th>
              </tr>
            </thead>
            <tbody>
              {interestOrder.map(key => (
                <tr key={key} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-2 pr-3 font-medium text-gray-800 align-middle">{interestLabels[key]}</td>
                  <td className="py-2 pr-3 font-bold text-gray-900 align-middle tabular-nums">{interest[key]}</td>
                  <td className="py-2 align-middle">
                    <IntensityBar value0to100={interestToPercent(interest[key])} fill="#111827" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs mt-3 leading-relaxed" style={{ color: '#6b7280' }}>
            「得分」为量表原始分（约 18–92）；「相对强度」已将各维度映射到 0–100 便于对比。表中各维度按得分从高到低排列。
          </p>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-1">不同类型的解析</h4>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              下面对 RIASEC 六种兴趣类型分别说明职业含义；卡片中的高低分提示结合你的相对强度（以 50 为参考中位）给出。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {interestOrder.map(key => {
                const pct = interestToPercent(interest[key])
                const hi = pct >= 50
                return (
                  <div key={key} className="rounded-xl border border-gray-100 bg-gray-50/90 p-4">
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                      <span className="font-bold text-gray-900">{interestLabels[key]}</span>
                      <span className="text-xs text-gray-500 tabular-nums shrink-0">
                        得分 {interest[key]} · {pct}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                      {hi ? interestNotes[key].hi : interestNotes[key].lo}
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed">{interestTypeExplain[key]}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* IPIP */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">性格模型</h3>
          <p className="text-sm text-gray-500 mt-1">IPIP 五大人格</p>
        </div>
        <div className="px-5 py-4">
          <div className="mb-3">
            <span className="text-xl font-bold text-gray-900">{personalityResult.headline}</span>
            <p className="text-sm text-gray-500 mt-1">{personalityResult.text}</p>
          </div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-3 font-medium">维度</th>
                <th className="py-2 pr-3 font-medium w-[4.5rem]">得分</th>
                <th className="py-2 font-medium">相对强度（0–100）</th>
              </tr>
            </thead>
            <tbody>
              {personalityOrder.map(key => (
                <tr key={key} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-2 pr-3 font-medium text-gray-800 align-middle">{personalityLabels[key]}</td>
                  <td className="py-2 pr-3 font-bold text-gray-900 align-middle tabular-nums">{personality[key]}</td>
                  <td className="py-2 align-middle">
                    <IntensityBar value0to100={personality[key]} fill="#3b82f6" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs mt-3 leading-relaxed" style={{ color: '#6b7280' }}>
            「得分」为 0–100 量表分；条形与右侧数字为同尺度下的相对强度。表中各维度按得分从高到低排列。
          </p>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-1">不同类型的解析</h4>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              下面对 IPIP 五大人格维度分别说明在工作中的典型表现；高低分提示以 50 分为参考中位。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {personalityOrder.map(key => {
                const pct = personality[key]
                const hi = pct >= 50
                return (
                  <div key={key} className="rounded-xl border border-gray-100 bg-gray-50/90 p-4">
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                      <span className="font-bold text-gray-900">{personalityLabels[key]}</span>
                      <span className="text-xs text-gray-500 tabular-nums shrink-0">得分 {pct}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                      {hi ? personalityNotes[key].hi : personalityNotes[key].lo}
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed">{personalityTypeExplain[key]}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 专业校正 */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">专业与阶段校正</h3>
        </div>
        <div className="p-6 space-y-3">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">本科专业标签</div>
            <div className="font-semibold text-gray-900">{profile.label}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">专业判断</div>
            <div className="text-sm text-gray-700">{profile.note}</div>
          </div>
        </div>
      </div>

      {/* Top 6 岗位匹配度 */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">推荐岗位 Top 6</h3>
          <p className="text-sm text-gray-500 mt-1">按综合匹配度排序</p>
        </div>
        <div className="px-5 py-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[520px]">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-2 font-medium w-10">#</th>
                <th className="py-2 pr-2 font-medium w-10 text-gray-400">图标</th>
                <th className="py-2 pr-3 font-medium">岗位</th>
                <th className="py-2 pr-3 font-medium w-16">匹配度</th>
                <th className="py-2 pr-3 font-medium min-w-[6rem]">代表机构</th>
                <th className="py-2 pr-3 font-medium min-w-[10rem] max-w-[18rem]">实习经历要求</th>
                <th className="py-2 font-medium min-w-[7rem]">条形</th>
              </tr>
            </thead>
            <tbody>
              {selectedRoles.slice(0, 6).map((role, idx) => (
                <tr key={role.name} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-2 pr-2 font-black text-gray-300 tabular-nums align-middle">{idx + 1}</td>
                  <td className="py-2 pr-2 text-lg align-middle" aria-hidden>
                    {role.icon}
                  </td>
                  <td className="py-2 pr-3 font-semibold text-gray-900 align-middle">{role.name}</td>
                  <td className="py-2 pr-3 font-bold text-gray-900 tabular-nums align-middle">{role.score}%</td>
                  <td className="py-2 pr-3 text-xs text-gray-600 align-middle max-w-[10rem]">
                    {role.companies?.length ? role.companies.join('、') : '—'}
                  </td>
                  <td className="py-2 pr-3 text-xs text-gray-600 align-top max-w-[18rem] leading-relaxed">
                    {internshipDisplayText(role)}
                  </td>
                  <td className="py-2 align-middle">
                    <IntensityBar value0to100={role.score} fill="#111827" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs mt-4 leading-relaxed" style={{ color: '#6b7280' }}>
            条形与右侧数字为匹配度相对强度（0–100）。排序综合 RIASEC、IPIP 与专业校正，供方向参考。
          </p>
        </div>
      </div>

      {/* 典型任务仅在「推荐岗位详情」中展示，避免与上方重复 */}

      {/* 每个岗位单独一节 PDF，避免长图纵向裁切把同一张卡片隔断 */}
      {selectedRoles.slice(0, 6).map((role, idx) => (
        <div key={role.name} className="space-y-4">
          {idx === 0 ? (
            <h3 className="font-bold text-gray-900 text-lg">推荐岗位详情</h3>
          ) : null}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{role.icon}</span>
                <div>
                  <div className="font-bold text-gray-900">Top {idx + 1} · {role.name}</div>
                  <div className="text-sm text-gray-500">综合匹配度 {role.score}%</div>
                </div>
                <span className="ml-auto inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-900 text-white">
                  推荐
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-700 text-sm mb-2">推荐理由</h4>
                <div className="space-y-2">
                  {role.why.length > 0 ? (
                    role.why.map(item => (
                      <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                        <span className="text-xs font-semibold text-gray-500">{item.label}：</span>
                        <span className="text-sm text-gray-700">{item.text}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
                      综合你的兴趣与人格画像，该岗位与当前测评结果整体匹配度较高，可作为探索方向之一。
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 text-sm mb-2">工作内容</h4>
                <p className="text-sm text-gray-600">{role.desc}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm mb-2">典型任务</h4>
                  <ul className="space-y-2 list-none m-0 p-0">{role.tasks.map(task => taskDetailLine(task))}</ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 text-sm mb-2">薪酬范围</h4>
                  <ul className="space-y-1">
                    {role.salary.map(item => (
                      <li key={item} className="text-sm text-gray-600">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm mb-2">学校门槛</h4>
                  <p className="text-xs text-gray-600">{role.school}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm mb-2">技能要求</h4>
                  <p className="text-xs text-gray-600">{role.skills.join('、')}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm mb-2">推荐行业</h4>
                  <p className="text-xs text-gray-600">{role.industries.join('、')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm mb-2">代表机构 / 企业</h4>
                  <p className="text-xs text-gray-600">
                    {role.companies?.length ? role.companies.join('、') : '—'}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm mb-2">实习积累建议</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">{internshipDisplayText(role)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* 行动建议 */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">行动建议</h3>
        </div>
        <div className="p-6 space-y-3">
          {tips.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className="text-sm text-gray-700">{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 求职时间线参考图（港/英/美/澳硕示例，便于导出长图一并呈现） */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">求职时间线参考</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            以下时间线以 2026 年 9 月前后入学为示例，覆盖港硕、英硕、美硕、澳硕常见节奏，供你将测评结果与申请周期对照使用；具体节点请以所在学校与目标公司当年公告为准。
          </p>
        </div>
        <div className="p-5 space-y-5">
          {REPORT_TIMELINE_IMAGES.map((item, idx) => (
            <figure key={item.src} className="m-0 rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
              <img
                src={item.src}
                alt={item.alt}
                className="w-full h-auto block align-middle"
                loading="eager"
                decoding="async"
              />
              <figcaption className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100 bg-white">
                图 {idx + 1} / {REPORT_TIMELINE_IMAGES.length} · {item.alt}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  )
}
