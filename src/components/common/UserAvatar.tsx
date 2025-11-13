
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  userId: string;
  avatarUrl: string | null;
  fullName: string | null;
}

const UserAvatar = ({ userId, avatarUrl, fullName }: UserAvatarProps) => {
  return (
    <Link to={`/user/${userId}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
      <Avatar className="h-10 w-10">
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback>{fullName?.[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate text-sm">{fullName || 'Người dùng'}</p>
      </div>
    </Link>
  );
};

export default UserAvatar;
