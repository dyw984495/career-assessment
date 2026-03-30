// ============================================================
// 根组件 - 路由配置
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

// 学生端页面
import AssessmentPage from './pages/student/AssessmentPage'
import SubmittedPage from './pages/student/SubmittedPage'
import ReportPage from './pages/student/ReportPage'

// 管理端页面
import LoginPage from './pages/admin/LoginPage'
import TaskListPage from './pages/admin/TaskListPage'
import TaskDetailPage from './pages/admin/TaskDetailPage'

// 管理员路由保护组件
function AdminRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthenticated(!!session)
      setLoading(false)
    })
  }, [])

  if (loading) {
  return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  return authenticated ? <>{children}</> : <Navigate to="/admin/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 学生端路由 */}
        <Route path="/" element={<Navigate to="/assessment" replace />} />
        <Route path="/assessment" element={<Navigate to="/assessment/t/demo" replace />} />
        <Route path="/assessment/t/:token" element={<AssessmentPage />} />
        <Route path="/assessment/submitted" element={<SubmittedPage />} />
        <Route path="/report/:submissionId" element={<ReportPage />} />

        {/* 管理端路由 */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route
          path="/admin/tasks"
          element={
            <AdminRoute>
              <TaskListPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/tasks/:taskId"
          element={
            <AdminRoute>
              <TaskDetailPage />
            </AdminRoute>
          }
        />

        {/* 兜底 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
