import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CallState {
  isInCall: boolean;
  isRinging: boolean;
  isReceivingCall: boolean;
  callId: string | null;
  callerId: string | null;
  callerName: string | null;
  callerAvatar: string | null;
  matchId: string | null;
  callDuration: number;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useVoiceCall = () => {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    isRinging: false,
    isReceivingCall: false,
    callId: null,
    callerId: null,
    callerName: null,
    callerAvatar: null,
    matchId: null,
    callDuration: 0,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('[VoiceCall] Cleaning up...');
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    setCallState({
      isInCall: false,
      isRinging: false,
      isReceivingCall: false,
      callId: null,
      callerId: null,
      callerName: null,
      callerAvatar: null,
      matchId: null,
      callDuration: 0,
    });
  }, []);

  // Initialize audio element for remote stream
  useEffect(() => {
    remoteAudioRef.current = new Audio();
    remoteAudioRef.current.autoplay = true;
    
    return () => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
    };
  }, []);

  // Subscribe to call signals via Supabase Realtime
  useEffect(() => {
    if (!user?.id) return;

    console.log('[VoiceCall] Setting up realtime subscription for user:', user.id);

    const channel = supabase.channel(`calls-${user.id}`)
      .on('broadcast', { event: 'call-signal' }, async ({ payload }) => {
        console.log('[VoiceCall] Received signal:', payload.type);
        
        if (payload.targetUserId !== user.id) return;

        switch (payload.type) {
          case 'incoming-call':
            // Someone is calling us
            setCallState(prev => ({
              ...prev,
              isReceivingCall: true,
              callId: payload.callId,
              callerId: payload.callerId,
              callerName: payload.callerName,
              callerAvatar: payload.callerAvatar,
              matchId: payload.matchId,
            }));
            break;

          case 'call-accepted':
            // Our call was accepted, create offer
            if (peerConnectionRef.current) {
              const offer = await peerConnectionRef.current.createOffer();
              await peerConnectionRef.current.setLocalDescription(offer);
              
              // Send offer to the other user
              await supabase.channel(`calls-${payload.callerId}`).send({
                type: 'broadcast',
                event: 'call-signal',
                payload: {
                  type: 'offer',
                  offer,
                  targetUserId: payload.callerId,
                  callerId: user.id,
                },
              });
            }
            break;

          case 'offer':
            // Received offer, create answer
            if (peerConnectionRef.current) {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.offer));
              const answer = await peerConnectionRef.current.createAnswer();
              await peerConnectionRef.current.setLocalDescription(answer);
              
              // Send answer back
              await supabase.channel(`calls-${payload.callerId}`).send({
                type: 'broadcast',
                event: 'call-signal',
                payload: {
                  type: 'answer',
                  answer,
                  targetUserId: payload.callerId,
                  callerId: user.id,
                },
              });
            }
            break;

          case 'answer':
            // Received answer
            if (peerConnectionRef.current) {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
            }
            break;

          case 'ice-candidate':
            // Received ICE candidate
            if (peerConnectionRef.current && payload.candidate) {
              try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (e) {
                console.error('[VoiceCall] Error adding ICE candidate:', e);
              }
            }
            break;

          case 'call-rejected':
          case 'call-ended':
            cleanup();
            break;
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, cleanup]);

  // Setup WebRTC peer connection
  const setupPeerConnection = useCallback(async (targetUserId: string) => {
    console.log('[VoiceCall] Setting up peer connection...');
    
    try {
      // Get local audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('[VoiceCall] Received remote track');
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await supabase.channel(`calls-${targetUserId}`).send({
            type: 'broadcast',
            event: 'call-signal',
            payload: {
              type: 'ice-candidate',
              candidate: event.candidate,
              targetUserId,
              callerId: user?.id,
            },
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('[VoiceCall] Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setCallState(prev => ({ ...prev, isRinging: false, isInCall: true }));
          
          // Start duration timer
          durationIntervalRef.current = setInterval(() => {
            setCallState(prev => ({ ...prev, callDuration: prev.callDuration + 1 }));
          }, 1000);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          cleanup();
        }
      };

      return pc;
    } catch (error) {
      console.error('[VoiceCall] Error setting up peer connection:', error);
      cleanup();
      throw error;
    }
  }, [user?.id, cleanup]);

  // Start a call
  const startCall = useCallback(async (matchId: string, targetUserId: string, callerName: string, callerAvatar: string) => {
    if (!user?.id) return;

    console.log('[VoiceCall] Starting call to:', targetUserId);

    try {
      // Create call log in database
      const { data: callLog, error } = await supabase
        .from('call_logs')
        .insert({
          caller_id: user.id,
          receiver_id: targetUserId,
          match_id: matchId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Setup peer connection
      await setupPeerConnection(targetUserId);

      // Update state
      setCallState(prev => ({
        ...prev,
        isRinging: true,
        callId: callLog.id,
        matchId,
      }));

      // Get caller profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      // Send call signal to target user
      await supabase.channel(`calls-${targetUserId}`).send({
        type: 'broadcast',
        event: 'call-signal',
        payload: {
          type: 'incoming-call',
          callId: callLog.id,
          callerId: user.id,
          callerName: profile?.full_name || 'Người dùng',
          callerAvatar: profile?.avatar_url || '',
          matchId,
          targetUserId,
        },
      });

      // Set timeout for unanswered call (30 seconds)
      setTimeout(async () => {
        if (callState.isRinging) {
          await supabase.from('call_logs').update({ status: 'missed' }).eq('id', callLog.id);
          cleanup();
        }
      }, 30000);

    } catch (error) {
      console.error('[VoiceCall] Error starting call:', error);
      cleanup();
    }
  }, [user?.id, setupPeerConnection, cleanup, callState.isRinging]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!user?.id || !callState.callerId || !callState.callId) return;

    console.log('[VoiceCall] Accepting call from:', callState.callerId);

    try {
      // Update call log
      await supabase
        .from('call_logs')
        .update({ status: 'accepted', started_at: new Date().toISOString() })
        .eq('id', callState.callId);

      // Setup peer connection
      await setupPeerConnection(callState.callerId);

      // Update state
      setCallState(prev => ({
        ...prev,
        isReceivingCall: false,
        isInCall: true,
      }));

      // Notify caller that call was accepted
      await supabase.channel(`calls-${callState.callerId}`).send({
        type: 'broadcast',
        event: 'call-signal',
        payload: {
          type: 'call-accepted',
          callerId: user.id,
          targetUserId: callState.callerId,
        },
      });

    } catch (error) {
      console.error('[VoiceCall] Error accepting call:', error);
      cleanup();
    }
  }, [user?.id, callState.callerId, callState.callId, setupPeerConnection, cleanup]);

  // Reject incoming call
  const rejectCall = useCallback(async () => {
    if (!callState.callerId || !callState.callId) return;

    console.log('[VoiceCall] Rejecting call');

    // Update call log
    await supabase
      .from('call_logs')
      .update({ status: 'rejected' })
      .eq('id', callState.callId);

    // Notify caller
    await supabase.channel(`calls-${callState.callerId}`).send({
      type: 'broadcast',
      event: 'call-signal',
      payload: {
        type: 'call-rejected',
        targetUserId: callState.callerId,
      },
    });

    cleanup();
  }, [callState.callerId, callState.callId, cleanup]);

  // End ongoing call
  const endCall = useCallback(async () => {
    console.log('[VoiceCall] Ending call');

    if (callState.callId) {
      await supabase
        .from('call_logs')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', callState.callId);
    }

    // Notify other party
    const otherUserId = callState.callerId;
    if (otherUserId) {
      await supabase.channel(`calls-${otherUserId}`).send({
        type: 'broadcast',
        event: 'call-signal',
        payload: {
          type: 'call-ended',
          targetUserId: otherUserId,
        },
      });
    }

    cleanup();
  }, [callState.callId, callState.callerId, cleanup]);

  return {
    callState,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
  };
};
