// ============================================================
// 管理员任务列表页 - /admin/tasks
// ============================================================

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { QrCodeModal } from '../../components/QrCodeModal'
import { formatDateTime, getStatusLabel, getStatusColor, copyToClipboard, getAppBaseUrl } from '../../lib/utils'
import type { AssessmentTask } from '../../lib/types'

export default function TaskListPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<AssessmentTask[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showQrModal, setShowQrModal] = useState<AssessmentTask | null>(null)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 创建任务表单
  const [form, setForm] = useState({ student_name: '', student_phone: '', source: '', expires_days: '7' })

  const baseUrl = getAppBaseUrl()

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('assessment_tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setTasks(data)
      }
    } catch (err) {
      console.error('获取任务列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)

    try {
      const expiresAt = form.expires_days
        ? new Date(Date.now() + parseInt(form.expires_days) * 24 * 60 * 60 * 1000).toISOString()
        : null

      // 必须使用已登录管理员的 access_token；publishable/anon 密钥不能作为 Edge Functions 的 JWT
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('登录已过期，请重新登录')
        navigate('/admin/login')
        return
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
      // 显式 fetch：非 2xx 时也能读到 JSON 里的 error/details（invoke 只给泛化报错）
      const res = await fetch(`${supabaseUrl}/functions/v1/create-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          student_name: form.student_name || null,
          student_phone: form.student_phone || null,
          source: form.source || null,
          expires_at: expiresAt,
        }),
      })

      const payload = (await res.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
        details?: string
      }

      if (!res.ok || !payload.success) {
        console.error('create-task:', res.status, payload)
        alert(
          [payload.error, payload.details].filter(Boolean).join(' — ') ||
            `创建失败（HTTP ${res.status}）`,
        )
        return
      }

      setShowCreateModal(false)
      setForm({ student_name: '', student_phone: '', source: '', expires_days: '7' })
      fetchTasks()
    } catch (err) {
      console.error(err)
      alert('创建失败，请重试')
    } finally {
      setCreating(false)
    }
  }

  async function handleCopy(token: string) {
    const url = `${baseUrl}/assessment/t/${token}`
    const ok = await copyToClipboard(url)
    if (ok) {
      setCopied(token)
      setTimeout(() => setCopied(''), 2000)
    }
  }

  async function handleDeleteTask(task: AssessmentTask) {
    const tip =
      task.status === 'submitted'
        ? '确定删除该任务？已提交的测评记录将一并删除，不可恢复。'
        : '确定删除该任务？不可恢复。'
    if (!window.confirm(tip)) return
    setDeletingId(task.id)
    try {
      const { error } = await supabase.from('assessment_tasks').delete().eq('id', task.id)
      if (error) {
        alert(error.message || '删除失败。若提示无权限，请在 Supabase 执行 supabase/FIX_DELETE_TASKS.sql。')
        return
      }
      fetchTasks()
    } finally {
      setDeletingId(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <h1 className="text-lg font-bold text-gray-900">职业测评管理后台</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchTasks}
                className="px-3 py-1.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                刷新
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: '全部任务', value: tasks.length, icon: '📋' },
            { label: '待填写', value: tasks.filter(t => t.status === 'pending').length, icon: '⏳' },
            { label: '已提交', value: tasks.filter(t => t.status === 'submitted').length, icon: '✅' },
            { label: '已过期', value: tasks.filter(t => t.status === 'expired').length, icon: '⛔' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 任务列表 */}
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">测评任务列表</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              + 创建任务
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-gray-500">暂无测评任务</p>
              <p className="text-sm text-gray-400 mt-1">点击上方"创建任务"生成第一个测评链接</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['学生姓名', '来源', '状态', '过期时间', '提交时间', '创建时间', '操作'].map(h => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr
                      key={task.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {task.student_name || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {task.source || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusLabel(task.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {task.expires_at ? formatDateTime(task.expires_at) : <span className="text-gray-400">无限制</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {task.submitted_at ? formatDateTime(task.submitted_at) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDateTime(task.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setShowQrModal(task)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                          >
                            二维码
                          </button>
                          <button
                            onClick={() => handleCopy(task.token)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              copied === task.token
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {copied === task.token ? '已复制!' : '复制链接'}
                          </button>
                          {task.status === 'submitted' && (
                            <button
                              onClick={() => navigate(`/admin/tasks/${task.id}`)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              查看报告
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={deletingId === task.id}
                            onClick={() => handleDeleteTask(task)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            {deletingId === task.id ? '删除中…' : '删除'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 创建任务弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-8" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-6">创建测评任务</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">学生姓名（可选）</label>
                <input
                  type="text"
                  value={form.student_name}
                  onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))}
                  placeholder="如：张三"
                  className="w-full h-11 rounded-2xl border border-gray-200 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">手机号（可选）</label>
                <input
                  type="tel"
                  value={form.student_phone}
                  onChange={e => setForm(f => ({ ...f, student_phone: e.target.value }))}
                  placeholder="用于后续通知联系"
                  className="w-full h-11 rounded-2xl border border-gray-200 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">来源（可选）</label>
                <input
                  type="text"
                  value={form.source}
                  onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  placeholder="例如：2024秋招 / XX课程"
                  className="w-full h-11 rounded-2xl border border-gray-200 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">链接有效期</label>
                <select
                  value={form.expires_days}
                  onChange={e => setForm(f => ({ ...f, expires_days: e.target.value }))}
                  className="w-full h-11 rounded-2xl border border-gray-200 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  <option value="">永不过期</option>
                  <option value="7">7 天</option>
                  <option value="14">14 天</option>
                  <option value="30">30 天</option>
                  <option value="90">90 天</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-11 rounded-2xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 h-11 rounded-2xl bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {creating ? '创建中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 二维码弹窗 */}
      {showQrModal && (
        <QrCodeModal
          url={`${baseUrl}/assessment/t/${showQrModal.token}`}
          studentName={showQrModal.student_name}
          taskId={showQrModal.id}
          onClose={() => setShowQrModal(null)}
        />
      )}
    </div>
  )
}
