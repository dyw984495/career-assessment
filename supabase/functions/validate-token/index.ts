// ============================================================
// Supabase Edge Functions - 校验 Token
// Deno Runtime
// 部署路径：supabase/functions/validate-token/index.ts
// 调用方式：POST /functions/v1/validate-token
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token } = await req.json()

    if (!token) {
      return new Response(JSON.stringify({ valid: false, reason: 'not_found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: task, error } = await supabase
      .from('assessment_tasks')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !task) {
      return new Response(JSON.stringify({ valid: false, reason: 'not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (task.status === 'submitted') {
      return new Response(JSON.stringify({ valid: false, reason: 'already_submitted', task }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (task.expires_at && new Date(task.expires_at) < new Date()) {
      // 自动更新状态
      await supabase.from('assessment_tasks').update({ status: 'expired' }).eq('token', token)
      return new Response(JSON.stringify({ valid: false, reason: 'expired', task }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ valid: true, reason: 'usable', task }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[validate-token] 异常:', err)
    return new Response(JSON.stringify({ valid: false, reason: 'not_found' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
