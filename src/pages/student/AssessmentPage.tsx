// ============================================================
// 学生测评页 - /assessment/t/:token
// 校验 token → 显示答题表单 → 提交 → 跳转成功页
// ============================================================

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { introTexts, grades } from '../../assessment'
import { QuizForm } from '../../components/QuizForm'
import type { TokenValidation, Student } from '../../lib/types'

export default function AssessmentPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [stage, setStage] = useState<'loading' | 'error' | 'intro' | 'quiz'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [student, setStudent] = useState<Student>({ name: '', major: '', grade: '' })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 组件挂载时校验 token
  useEffect(() => {
    if (!token) {
      setErrorMsg('无效的测评链接')
      setStage('error')
      return
    }
    validateToken(token)
  }, [token])

  // 校验 token 有效性
  async function validateToken(t: string) {
    try {
      // 先尝试通过 Edge Function 校验（更安全）
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

      const res = await fetch(`${supabaseUrl}/functions/v1/validate-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ token: t }),
      })

      if (res.ok) {
        const data: TokenValidation = await res.json()
        if (!data.valid) {
          setErrorMsg(getErrorMessage(data.reason))
          setStage('error')
          return
        }
        // 如果任务已有姓名预填，填充
        if (data.task?.student_name) {
          setStudent(s => ({ ...s, name: data.task!.student_name! }))
        }
        setStage('intro')
        return
      }

      // 降级：直接查询数据库
      const { data: task, error } = await supabase
        .from('assessment_tasks')
        .select('*')
        .eq('token', t)
        .single()

      if (error || !task) {
        setErrorMsg('无效的测评链接')
        setStage('error')
        return
      }

      if (task.status === 'submitted') {
        setErrorMsg('该测评链接已提交，请勿重复提交')
        setStage('error')
        return
      }

      if (task.expires_at && new Date(task.expires_at) < new Date()) {
        setErrorMsg('该测评链接已过期')
        setStage('error')
        return
      }

      if (task.student_name) {
        setStudent(s => ({ ...s, name: task.student_name! }))
      }

      setStage('intro')
    } catch {
      setErrorMsg('网络异常，请刷新重试')
      setStage('error')
    }
  }

  function getErrorMessage(reason?: string): string {
    switch (reason) {
      case 'not_found': return '无效的测评链接'
      case 'already_submitted': return '该测评已提交，请勿重复提交'
      case 'expired': return '该测评链接已过期'
      default: return '链接无效或已失效'
    }
  }

  const handleStart = () => {
    if (!student.name.trim() || !student.major.trim() || !student.grade.trim()) {
      setFormError('请先填写姓名、本科专业和年级')
      return
    }
    setFormError('')
    setStage('quiz')
  }

  const handleSubmit = async (answers: Record<number, number>) => {
    if (!token) return
    setSubmitting(true)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

      const res = await fetch(`${supabaseUrl}/functions/v1/submit-assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ token, answers, student }),
      })

      const data = await res.json()

      if (data.success) {
        navigate('/assessment/submitted')
      } else {
        setFormError(data.error || '提交失败，请重试')
      }
    } catch {
      setFormError('网络异常，请检查网络后重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (stage === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">正在验证链接...</p>
        </div>
      </div>
    )
  }

  if (stage === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">链接已失效</h1>
          <p className="text-gray-500 mb-6">{errorMsg}</p>
          <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-500">
            如有问题，请联系你的老师或顾问获取新的测评链接。
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'quiz') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-gray-50 py-8 px-4">
        {/* 顶部信息 */}
        <div className="max-w-3xl mx-auto mb-6">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                🧠 RIASEC + IPIP 职业规划测评
              </span>
            </div>
            <p className="text-sm text-gray-500">
              答题人：{student.name} &nbsp;|&nbsp; {student.major} &nbsp;|&nbsp; {student.grade}
            </p>
          </div>
        </div>

        <QuizForm
          student={student}
          onSubmit={handleSubmit}
          submitting={submitting}
        />

        {formError && (
          <div className="max-w-3xl mx-auto mt-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
              {formError}
            </div>
          </div>
        )}
      </div>
    )
  }

  // stage === 'intro'
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-600 mb-4">
            🧠 RIASEC + IPIP 职业规划测评
          </span>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">学生职业规划测评</h1>
          <p className="text-gray-600 leading-relaxed mb-2">{introTexts.riasec}</p>
          <p className="text-gray-600 leading-relaxed mb-2">{introTexts.ipip}</p>
          <p className="text-gray-400 text-sm">{introTexts.combined}</p>
        </div>

        {/* 信息填写 */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm">
          <div className="p-6 pb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">开始测评前</h2>
            <p className="text-sm text-gray-500">请先填写姓名、本科专业与当前年级</p>
          </div>
          <div className="px-6 pb-2 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">姓名</label>
              <input
                type="text"
                value={student.name}
                onChange={e => setStudent(s => ({ ...s, name: e.target.value }))}
                placeholder="请输入你的姓名"
                className="w-full h-12 rounded-2xl border border-gray-200 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">本科专业</label>
              <input
                type="text"
                value={student.major}
                onChange={e => setStudent(s => ({ ...s, major: e.target.value }))}
                placeholder="例如：市场营销 / 计算机科学与技术"
                className="w-full h-12 rounded-2xl border border-gray-200 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">当前年级</label>
              <select
                value={student.grade}
                onChange={e => setStudent(s => ({ ...s, grade: e.target.value }))}
                className="w-full h-12 rounded-2xl border border-gray-200 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
              >
                <option value="">请选择年级</option>
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          {formError && (
            <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
              {formError}
            </div>
          )}
          <div className="px-6 pb-6">
            <button
              onClick={handleStart}
              className="w-full h-14 rounded-2xl bg-gray-900 text-white font-semibold text-base hover:bg-gray-800 transition-colors"
            >
              开始答题
            </button>
          </div>
        </div>

        {/* 说明 */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">测评说明</h3>
          <div className="space-y-3">
            {[
              '职业兴趣：判断你更容易被什么工作内容吸引',
              '人格特征：判断你通常以什么方式做事与协作',
              '专业相关性：让推荐方向更贴近本科背景',
              '年级信息：帮助生成更符合当前阶段的行动建议',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-600">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
