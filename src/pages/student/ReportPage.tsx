// ============================================================
// 学生报告页面 - /report/:submissionId（公开访问，供学生查看，不含管理功能）
// ============================================================

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ReportView } from '../../components/ReportView'
import type { AssessmentSubmission } from '../../lib/types'

export default function ReportPage() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const [submission, setSubmission] = useState<AssessmentSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!submissionId) {
      setError('缺少报告 ID')
      setLoading(false)
      return
    }
    fetchSubmission(submissionId)
  }, [submissionId])

  async function fetchSubmission(id: string) {
    setLoading(true)
    setError(null)
    try {
      const { data, error: dbError } = await supabase
        .from('assessment_submissions')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (dbError) {
        console.error('加载报告失败:', dbError)
        setError('加载报告失败，请稍后重试')
        return
      }
      if (!data) {
        setError('未找到该报告')
        return
      }
      setSubmission(data as unknown as AssessmentSubmission)
    } catch {
      setError('加载报告失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">加载中…</p>
        </div>
      </div>
    )
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{error ?? '报告不存在'}</h2>
          <p className="text-gray-500 text-sm">请确认链接是否正确，或联系发送链接的人</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 极简顶部提示 */}
      <div className="bg-gray-900 text-white text-center py-2.5 px-4 text-xs">
        <span>📋 你的专属职业规划测评报告 · 建议横屏查看或截图保存</span>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <ReportView report={submission.report_json} />
      </div>
    </div>
  )
}
