import { createClient } from '@supabase/supabase-js';

// 환경 변수 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 'export'를 반드시 붙여야 다른 파일(page.tsx)에서 빌려 쓸 수 있습니다.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);