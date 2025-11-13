import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Lock, Unlock, Search, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth để lấy thông tin user hiện tại

// Giao diện này khớp với dữ liệu trả về từ Edge Function
interface CombinedUser {
  user_id: string;
  full_name: string;
  email?: string;
  role: 'admin' | 'user';
  status: 'active' | 'locked';
  created_at: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<CombinedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth(); // Lấy thông tin user để không hiển thị nút khóa trên chính mình

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Gọi Edge Function 'get-all-users'
      const { data, error: functionError } = await supabase.functions.invoke('get-all-users');

      if (functionError) {
        throw new Error(`Function Error: ${functionError.message}`);
      }
      
      // Dữ liệu từ function có thể là một chuỗi JSON hoặc một object lỗi
      if (typeof data === 'string') {
         setUsers(JSON.parse(data));
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        setUsers(data);
      }

    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(`Không thể tải danh sách người dùng. ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdateStatus = async (userId: string, newStatus: 'active' | 'locked') => {
     // Logic để cập nhật trạng thái user
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('user_id', userId);

      if (error) throw error;
      // Tải lại danh sách sau khi cập nhật thành công
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      // Có thể thêm toast hoặc thông báo lỗi ở đây
    }
  };

  const filteredUsers = users.filter(u => 
    (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center p-10 bg-red-50 text-red-700 rounded-lg">
             <ShieldAlert className="w-10 h-10 mb-4" />
            <h3 className="text-lg font-semibold">Đã xảy ra lỗi</h3>
            <p className="text-center">{error}</p>
            <Button onClick={fetchUsers} className="mt-4">Thử lại</Button>
        </div>
    );
  }

  return (
    <div className="p-4 bg-card text-card-foreground rounded-lg shadow-md mt-4">
      <h2 className="text-xl font-semibold mb-4">Quản lý người dùng</h2>
       <div className="flex items-center mb-4">
          <div className="relative w-full max-w-sm">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                  placeholder="Tìm kiếm theo tên hoặc email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
              />
          </div>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ và tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? filteredUsers.map((u) => (
              <TableRow key={u.user_id}>
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell>{u.email || 'N/A'}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {u.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {u.user_id !== user?.id && u.role !== 'admin' && (
                     u.status === 'active' ? (
                        <Button variant="destructive" size="sm" onClick={() => handleUpdateStatus(u.user_id, 'locked')}>
                        <Lock className="w-4 h-4 mr-2" />
                        Khóa
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(u.user_id, 'active')}>
                        <Unlock className="w-4 h-4 mr-2" />
                        Mở khóa
                        </Button>
                    )
                  )}
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">Không tìm thấy người dùng nào khớp.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UserManagement;
