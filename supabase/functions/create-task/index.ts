// ============================================================
// Supabase Edge Functions - 创建测评任务
// Deno Runtime
// 部署路径：supabase/functions/create-task/index.ts
// 调用方式：POST /functions/v1/create-task
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 生成唯一 token
function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let randomPart = ''
  for (let i = 0; i < 24; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${randomPart}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[create-task] 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
      return new Response(JSON.stringify({ success: false, error: '服务端配置异常' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // verify_jwt=false 时由这里校验：必须是已登录用户（管理员）
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!jwt) {
      return new Response(JSON.stringify({ success: false, error: '未授权：请先登录管理后台' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: userData, error: authErr } = await supabaseAdmin.auth.getUser(jwt)
    if (authErr || !userData?.user) {
      console.error('[create-task] 鉴权失败:', authErr)
      return new Response(JSON.stringify({ success: false, error: '未授权：登录已失效，请重新登录' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { student_name, student_phone, source, expires_at } = await req.json()

    // 生成唯一 token
    const token = generateToken()

    // 插入任务记录（service role 绕过 RLS）
    const { data: task, error: insertError } = await supabaseAdmin
      .from('assessment_tasks')
      .insert({
        token,
        student_name: student_name || null,
        student_phone: student_phone || null,
        source: source || null,
        status: 'pending',
        expires_at: expires_at || null,
      })
      .select()
      .single()

    if (insertError || !task) {
      console.error('[create-task] 创建失败:', insertError)
      return new Response(
        JSON.stringify({
          success: false,
          error: '创建任务失败',
          details: insertError?.message ?? String(insertError),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(JSON.stringify({ success: true, task }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[create-task] 异常:', err)
    return new Response(JSON.stringify({ success: false, error: '服务器异常' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
