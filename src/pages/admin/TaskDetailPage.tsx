// ============================================================
// 管理员任务详情/报告页 - /admin/tasks/:taskId
// ============================================================

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ReportView } from '../../components/ReportView'
import { QrCodeModal } from '../../components/QrCodeModal'
import { formatDateTime, getStatusLabel, getStatusColor, copyToClipboard, getAppBaseUrl } from '../../lib/utils'
import type { AssessmentTask, AssessmentSubmission } from '../../lib/types'

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const baseUrl = getAppBaseUrl()

  const [task, setTask] = useState<AssessmentTask | null>(null)
  const [submission, setSubmission] = useState<AssessmentSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [showQr, setShowQr] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [shared, setShared] = useState(false)

  useEffect(() => {
    if (!taskId) return
    fetchData(taskId)
  }, [taskId])

  async function fetchData(id: string) {
    setLoading(true)
    try {
      // 获取任务
      const { data: taskData, error: taskError } = await supabase
        .from('assessment_tasks')
        .select('*')
        .eq('id', id)
        .single()

      if (taskError || !taskData) {
        navigate('/admin/tasks')
        return
      }
      setTask(taskData)

      // 获取提交记录（需 RLS 允许 authenticated 读取，见 supabase/FIX_ADMIN_READ_SUBMISSIONS.sql）
      const { data: subData, error: subError } = await supabase
        .from('assessment_submissions')
        .select('*')
        .eq('task_id', id)
        .maybeSingle()

      if (subError) {
        console.error('加载提交记录失败:', subError)
      }
      if (subData) {
        setSubmission(subData as unknown as AssessmentSubmission)
      } else {
        setSubmission(null)
      }
    } catch {
      navigate('/admin/tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!task) return
    const url = `${baseUrl}/assessment/t/${task.token}`
    const ok = await copyToClipboard(url)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShareReport = async () => {
    if (!submission) return
    const url = `${baseUrl}/report/${submission.id}`
    const ok = await copyToClipboard(url)
    if (ok) {
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  const handleDeleteTask = async () => {
    if (!task) return
    const tip =
      task.status === 'submitted'
        ? '确定删除该任务？已提交的测评记录将一并删除，不可恢复。'
        : '确定删除该任务？不可恢复。'
    if (!window.confirm(tip)) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('assessment_tasks').delete().eq('id', task.id)
      if (error) {
        alert(error.message || '删除失败。若提示无权限，请在 Supabase 执行 supabase/FIX_DELETE_TASKS.sql。')
        return
      }
      navigate('/admin/tasks')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  if (!task) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/tasks')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← 返回
              </button>
              <h1 className="text-lg font-bold text-gray-900">任务详情</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              {submission && (
                <button
                  type="button"
                  onClick={handleShareReport}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  {shared ? '链接已复制!' : '分享报告'}
                </button>
              )}
              <button
                onClick={() => setShowQr(true)}
                className="px-3 py-1.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                二维码
              </button>
              <button
                onClick={handleCopy}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {copied ? '已复制!' : '复制链接'}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteTask}
                className="px-3 py-1.5 rounded-xl text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {deleting ? '删除中…' : '删除任务'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 任务基础信息 */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">任务信息</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <div className="text-xs text-gray-500 mb-1">学生姓名</div>
                <div className="font-semibold text-gray-900">{task.student_name || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">手机号</div>
                <div className="font-semibold text-gray-900">{task.student_phone || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">来源</div>
                <div className="font-semibold text-gray-900">{task.source || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">机构名</div>
                <div className="font-semibold text-gray-900">{task.institution_name || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">状态</div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                  {getStatusLabel(task.status)}
                </span>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Token</div>
                <div className="font-mono text-xs text-gray-600 truncate">{task.token}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">过期时间</div>
                <div className="text-sm text-gray-900">{task.expires_at ? formatDateTime(task.expires_at) : '无限制'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">提交时间</div>
                <div className="text-sm text-gray-900">{task.submitted_at ? formatDateTime(task.submitted_at) : '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">创建时间</div>
                <div className="text-sm text-gray-900">{formatDateTime(task.created_at)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 报告内容 */}
        {submission ? (
          <ReportView report={submission.report_json as any} />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">{task.status === 'submitted' ? '🔒' : '⏳'}</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {task.status === 'submitted' ? '无法加载测评报告' : '尚未提交'}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {task.status === 'submitted'
                ? '任务已标记为已提交，但当前账号无法从数据库读取提交记录。请在 Supabase SQL Editor 执行项目内 supabase/FIX_ADMIN_READ_SUBMISSIONS.sql，刷新本页即可。'
                : task.status === 'expired'
                  ? '该任务已过期'
                  : task.status === 'pending'
                    ? '学生尚未完成测评'
                    : '等待学生提交'}
            </p>
          </div>
        )}
      </div>

      {/* 二维码弹窗 */}
      {showQr && task && (
        <QrCodeModal
          url={`${baseUrl}/assessment/t/${task.token}`}
          studentName={task.student_name}
          taskId={task.id}
          onClose={() => setShowQr(false)}
        />
      )}
    </div>
  )
}
