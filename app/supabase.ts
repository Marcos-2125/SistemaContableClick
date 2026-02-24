import { createClient } from '@supabase/supabase-js'

// Sustituye los valores con los que sacaste de Settings -> API
const supabaseUrl = 'https://djvztoyejfhmbjnlcava.supabase.co'
const supabaseKey = 'sb_publishable_8F8FU61YVIm7w_Y6t03k_g_vzgdLnoS' 

export const supabase = createClient(supabaseUrl, supabaseKey)