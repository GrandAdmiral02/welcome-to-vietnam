import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"; // Fixed imports
import UserAvatar from '@/components/common/UserAvatar';

export interface SocialUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface SocialConnectionsProps {
  friends: SocialUser[];
  followers: SocialUser[];
  following: SocialUser[];
}

const SocialConnections = ({ friends, followers, following }: SocialConnectionsProps) => {

  const renderUserList = (users: SocialUser[], emptyMessage: string) => {
    if (users.length === 0) {
      return <p className="text-sm text-muted-foreground p-4 text-center">{emptyMessage}</p>;
    }
    return (
      <div className="space-y-2 p-2 max-h-72 overflow-y-auto">
        {users.map(user => (
          <UserAvatar key={user.id} userId={user.id} avatarUrl={user.avatar_url} fullName={user.full_name} />
        ))}
      </div>
    );
  };

  return (
    <Card>
        <CardHeader className="p-4">
            <CardTitle className="text-lg">Mối quan hệ</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <Tabs defaultValue="friends" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="friends">Bạn bè ({friends.length})</TabsTrigger>
                    <TabsTrigger value="followers">Theo dõi ({followers.length})</TabsTrigger>
                    <TabsTrigger value="following">Đ. theo dõi ({following.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="friends">
                    {renderUserList(friends, "Chưa có bạn bè.")}
                </TabsContent>
                <TabsContent value="followers">
                    {renderUserList(followers, "Chưa có người theo dõi.")}
                </TabsContent>
                <TabsContent value="following">
                    {renderUserList(following, "Chưa theo dõi ai.")}
                </TabsContent>
            </Tabs>
        </CardContent>
    </Card>
  );
};

export default SocialConnections;
