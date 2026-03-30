// ============================================================
// Supabase 客户端初始化
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

// 环境变量
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// 校验环境变量
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] 缺少环境变量：VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY')
}

// 创建浏览器端 Supabase 客户端（用于前端）
export function createSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// 默认导出客户端实例
export const supabase = createSupabaseClient()

// 导出环境变量（供其他模块使用）
export { supabaseUrl, supabaseAnonKey }
