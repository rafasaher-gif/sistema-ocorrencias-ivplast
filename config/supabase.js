
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_KEY || '').trim()

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL não configurada')
}

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_KEY não configurada')
}

if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  throw new Error('SUPABASE_URL inválida')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

module.exports = supabase
