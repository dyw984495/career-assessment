// ============================================================
// 通用工具函数
// ============================================================

/**
 * 生成「复制链接 / 二维码」用的站点根 URL。
 * 开发模式下始终用当前浏览器 origin，避免 .env 里写死 5173 而 Vite 实际跑在 5174/5175 时链接打开白屏。
 */
export function getAppBaseUrl(): string {
  if (import.meta.env.DEV) {
    return typeof window !== 'undefined' ? window.location.origin : ''
  }
  const fromEnv = import.meta.env.VITE_APP_URL as string | undefined
  if (fromEnv?.trim()) return fromEnv.replace(/\/$/, '')
  return typeof window !== 'undefined' ? window.location.origin : ''
}

// 生成唯一 token：UUID + 时间戳混淆
export function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let randomPart = ''
  for (let i = 0; i < 24; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  // 结合时间戳和高随机数，使 token 不可预测
  return `${randomPart}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`
}

// 格式化日期时间
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 格式化日期
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// 复制文本到剪贴板
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      return true
    } finally {
      document.body.removeChild(textarea)
    }
  }
}

// 获取任务状态的中文标签
export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待填写',
    started: '进行中',
    submitted: '已提交',
    expired: '已过期',
  }
  return map[status] || status
}

// 获取任务状态对应的颜色
export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    started: 'bg-blue-100 text-blue-700',
    submitted: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
  }
  return map[status] || 'bg-gray-100 text-gray-700'
}
