
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Định nghĩa kiểu dữ liệu trả về
interface Profile {
  user_id: string;
  full_name: string;
  role: 'admin' | 'user';
  status: 'active' | 'locked';
  created_at: string;
}

interface AuthUser {
  id: string;
  email?: string;
  created_at: string;
}

interface CombinedUser extends Profile {
  email?: string;
}

Deno.serve(async (req) => {
  // Xử lý CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Tạo Supabase client với quyền admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Tạo Supabase client từ header Authorization của người dùng để kiểm tra quyền
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
    );
    
    // 1. Lấy thông tin người dùng đang gọi để xác thực
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Lấy profile của người dùng đang gọi để kiểm tra vai trò
    const { data: callerProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    if (profileError || callerProfile?.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Forbidden: Not an admin' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Nếu là admin, lấy tất cả người dùng từ auth
    const { data: { users: authUsers }, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers();
    if (authUsersError) {
        throw authUsersError;
    }

    // 4. Lấy tất cả profiles từ database
    const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('*');

    if (profilesError) {
        throw profilesError;
    }

    // 5. Kết hợp dữ liệu authUsers và profiles
    const profilesMap = new Map(profiles.map(p => [p.user_id, p]));

    const combinedUsers: CombinedUser[] = authUsers.map(authUser => {
        const profile = profilesMap.get(authUser.id);
        return {
            user_id: authUser.id,
            full_name: profile?.full_name || 'N/A',
            email: authUser.email,
            role: profile?.role || 'user',
            status: profile?.status || 'active',
            created_at: profile?.created_at || authUser.created_at
        };
    });
    
    return new Response(
        JSON.stringify(combinedUsers),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

