import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dylxoqnauorghuqehjnb.supabase.co'
const supabaseAnonKey = 'sb_publishable_sn444CRrqULVJsRXvkPvMA_YfwzYax9'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)