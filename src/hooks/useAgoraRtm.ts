import { useState, useEffect, useRef, useCallback } from 'react';
import type { RtmClient, RtmChannel, RtmMessage } from 'agora-rtm-sdk';
import { useAuth } from '../contexts/AuthContext';

// Define the types of messages we can send
export type RtmEvent = 
  | { type: 'reaction', emoji: string, fromName: string }
  | { type: 'raise-hand', userId: string, isRaised: boolean }
  | { type: 'tldraw-event', data: any };

export const useAgoraRtm = (channelName: string) => {
  const { user, token: authToken } = useAuth();
  const rtmClientRef = useRef<RtmClient | null>(null);
  const rtmChannelRef = useRef<RtmChannel | null>(null);
  
  const [isRtmConnected, setIsRtmConnected] = useState(false);
  const [reactionEvents, setReactionEvents] = useState<Extract<RtmEvent, { type: 'reaction' }>[]>([]);
  const [raiseHandEvents, setRaiseHandEvents] = useState<Extract<RtmEvent, { type: 'raise-hand' }>[]>([]);
  const [tldrawEvents, setTldrawEvents] = useState<Extract<RtmEvent, { type: 'tldraw-event' }>[]>([]);

  const onMessage = useCallback((message: RtmMessage, memberId: string) => {
    if (message.messageType === 'TEXT') {
      try {
        const eventData = JSON.parse(message.text) as RtmEvent;
        // Route events to their respective state arrays for cleaner processing in components
        if (eventData.type === 'reaction') {
          setReactionEvents(prev => [...prev, eventData]);
        } else if (eventData.type === 'raise-hand') {
          setRaiseHandEvents(prev => [...prev, eventData]);
        } else if (eventData.type === 'tldraw-event') {
          setTldrawEvents(prev => [...prev, eventData]);
        }
      } catch (e) {
        console.error("Failed to parse RTM message", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!user || !authToken || !channelName || typeof window === 'undefined') return;

    let mounted = true;

    // Use a dynamic import for the agora-rtm-sdk@1.5.1
    import('agora-rtm-sdk').then(async (module) => {
      if (!mounted) return;

      const AgoraRTM = module.default;
      
      try {
        const resp = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/agora/rtm-token`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        if (!resp.ok) {
            const errorBody = await resp.text();
            throw new Error(`Failed to fetch RTM token: ${resp.status} ${errorBody}`);
        }

        const { token: rtmToken } = await resp.json();
        const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID as string;
        
        const client = AgoraRTM.createInstance(appId);
        rtmClientRef.current = client;

        await client.login({ uid: user.id, token: rtmToken });
        
        const channel = client.createChannel(channelName);
        rtmChannelRef.current = channel;
        
        await channel.join();
        if (!mounted) return;

        channel.on('ChannelMessage', onMessage);
        setIsRtmConnected(true);
        console.log("Agora RTM Client v1.5.1 Connected Successfully.");

      } catch (error) {
        console.error('Agora RTM initialization failed:', error);
      }
    });

    return () => {
      mounted = false;
      const client = rtmClientRef.current;
      if (client) {
        client.removeAllListeners();
        client.logout();
      }
    };
  }, [user, authToken, channelName, onMessage]);

  const sendRtmEvent = useCallback((event: RtmEvent) => {
    if (isRtmConnected && rtmChannelRef.current) {
      const payload = JSON.stringify(event);
      // The v1.5.1 SDK uses { text: payload } not { text: payload, messageType: 'TEXT' }
      rtmChannelRef.current.sendMessage({ text: payload })
        .catch(err => console.error("RTM send message failed", err));
    }
  }, [isRtmConnected]);

  return { 
    sendRtmEvent, 
    reactionEvents, 
    raiseHandEvents, 
    tldrawEvents,
    isRtmConnected 
  };
};