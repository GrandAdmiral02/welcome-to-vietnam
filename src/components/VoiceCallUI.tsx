import { Phone, PhoneOff, PhoneIncoming, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { CallState } from '@/hooks/useVoiceCall';

interface VoiceCallUIProps {
  callState: CallState;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const IncomingCallModal = ({ callState, onAccept, onReject }: VoiceCallUIProps) => {
  if (!callState.isReceivingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-card border shadow-2xl animate-in fade-in-0 zoom-in-95">
        <div className="relative">
          <Avatar className="w-24 h-24 ring-4 ring-primary/20">
            <AvatarImage src={callState.callerAvatar || ''} />
            <AvatarFallback className="text-2xl">
              {callState.callerName?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 p-2 rounded-full bg-green-500 animate-pulse">
            <PhoneIncoming className="w-4 h-4 text-white" />
          </div>
        </div>
        
        <div className="text-center">
          <h3 className="text-xl font-semibold">{callState.callerName}</h3>
          <p className="text-muted-foreground animate-pulse">Đang gọi đến...</p>
        </div>

        <div className="flex gap-4">
          <Button
            size="lg"
            variant="destructive"
            className="rounded-full w-14 h-14"
            onClick={onReject}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
          <Button
            size="lg"
            className="rounded-full w-14 h-14 bg-green-500 hover:bg-green-600"
            onClick={onAccept}
          >
            <Phone className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const OutgoingCallModal = ({ callState, onEnd }: VoiceCallUIProps) => {
  if (!callState.isRinging) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-card border shadow-2xl animate-in fade-in-0 zoom-in-95">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <PhoneCall className="w-10 h-10 text-primary animate-pulse" />
          </div>
        </div>
        
        <div className="text-center">
          <h3 className="text-xl font-semibold">Đang gọi...</h3>
          <p className="text-muted-foreground">Đang chờ trả lời</p>
        </div>

        <Button
          size="lg"
          variant="destructive"
          className="rounded-full w-14 h-14"
          onClick={onEnd}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};

export const ActiveCallModal = ({ callState, onEnd }: VoiceCallUIProps) => {
  if (!callState.isInCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-card border shadow-2xl">
        <div className="relative">
          <Avatar className="w-24 h-24 ring-4 ring-green-500/20">
            <AvatarImage src={callState.callerAvatar || ''} />
            <AvatarFallback className="text-2xl">
              {callState.callerName?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 p-2 rounded-full bg-green-500">
            <Phone className="w-4 h-4 text-white" />
          </div>
        </div>
        
        <div className="text-center">
          <h3 className="text-xl font-semibold">{callState.callerName || 'Đang gọi'}</h3>
          <p className="text-green-500 font-mono text-lg">
            {formatDuration(callState.callDuration)}
          </p>
        </div>

        <Button
          size="lg"
          variant="destructive"
          className="rounded-full w-14 h-14"
          onClick={onEnd}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};

export const VoiceCallUI = (props: VoiceCallUIProps) => {
  return (
    <>
      <IncomingCallModal {...props} />
      <OutgoingCallModal {...props} />
      <ActiveCallModal {...props} />
    </>
  );
};

export default VoiceCallUI;
