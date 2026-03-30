// ============================================================
// 学生提交成功页 - /assessment/submitted
// ============================================================

export default function SubmittedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-gray-200 shadow-sm p-10 text-center">
        <div className="text-8xl mb-6">✅</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">提交成功</h1>
        <p className="text-gray-500 leading-relaxed mb-8">
          你的职业规划测评已成功提交。<br />
          结果将由老师 / 顾问统一解读，<br />
          请耐心等待反馈通知。
        </p>
        <div className="bg-gray-50 rounded-2xl p-5 text-sm text-gray-500 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <span>你的作答已安全保存</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🔒</span>
            <span>报告内容仅内部可见</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">⏱️</span>
            <span>老师 / 顾问将尽快与你联系</span>
          </div>
        </div>
      </div>
    </div>
  )
}
