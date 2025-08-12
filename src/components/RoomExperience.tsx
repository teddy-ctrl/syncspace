import { useRouter } from "next/router";
import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import {
  PhoneOff,
  Users,
  MessageSquare,
  Presentation,
  ScreenShare,
  Mic,
  MicOff,
  Video,
  VideoOff,
  SmilePlus,
  Hand,
  User as UserIcon,
} from "lucide-react";
import styles from "../styles/RoomExperience.module.css";
import dynamic from "next/dynamic";
// FIX: Removed unused 'useAuth' and 'RtmEvent' imports
import { useAgoraRtm } from "../hooks/useAgoraRtm";

const Whiteboard = dynamic(() => import("./Whiteboard"), { ssr: false });

import AgoraRTC from "agora-rtc-sdk-ng";
import {
  AgoraRTCProvider,
  useJoin,
  useLocalCameraTrack,
  useLocalMicrophoneTrack,
  usePublish,
  useRemoteUsers,
  RemoteUser,
  LocalVideoTrack,
  useRTCClient,
  AgoraRTCError,
  useLocalScreenTrack,
} from "agora-rtc-react";
import type { IAgoraRTCRemoteUser, IAgoraRTCClient } from "agora-rtc-sdk-ng";

// --- TYPE DEFINITIONS ---
interface User {
  id: string;
  name: string;
  email: string;
}
interface RoomProps {
  roomName: string;
  user: User;
  appId: string;
  token: string | null;
}
interface PanelProps {
  roomName: string;
  user: User;
}
interface Reaction {
  id: number;
  emoji: string;
  from: string;
}
interface Message {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string };
}

// --- FEATURE: PARTICIPANTS PANEL COMPONENT ---
const ParticipantsPanel = ({
  localUser,
  remoteUsers,
  raisedHands,
  micOn,
  cameraOn,
}: {
  localUser: User;
  remoteUsers: IAgoraRTCRemoteUser[];
  raisedHands: Set<string>;
  micOn: boolean;
  cameraOn: boolean;
}) => {
  return (
    <aside className={styles.participantsPanel}>
      <h2 className={styles.panelTitle}>
        Participants ({1 + remoteUsers.length})
      </h2>
      <ul className={styles.userList}>
        {/* Local User */}
        <li className={styles.userListItem}>
          <UserIcon size={20} />
          <span className={styles.userName}>{localUser.name} (You)</span>
          <div className={styles.userIcons}>
            {raisedHands.has(localUser.id) && (
              <Hand size={18} color="#f1c40f" />
            )}
            {micOn ? (
              <Mic size={18} />
            ) : (
              <MicOff size={18} className={styles.iconOff} />
            )}
            {cameraOn ? (
              <Video size={18} />
            ) : (
              <VideoOff size={18} className={styles.iconOff} />
            )}
          </div>
        </li>
        {/* Remote Users */}
        {remoteUsers.map((user) => (
          <li key={user.uid} className={styles.userListItem}>
            <UserIcon size={20} />
            <span className={styles.userName}>User {user.uid}</span>
            <div className={styles.userIcons}>
              {raisedHands.has(user.uid.toString()) && (
                <Hand size={18} color="#f1c40f" />
              )}
              {user.hasAudio ? (
                <Mic size={18} />
              ) : (
                <MicOff size={18} className={styles.iconOff} />
              )}
              {user.hasVideo ? (
                <Video size={18} />
              ) : (
                <VideoOff size={18} className={styles.iconOff} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
};

const FloatingReactions = ({ reactions }: { reactions: Reaction[] }) => (
  <div className={styles.reactionsContainer}>
    {reactions.map((r) => (
      <div key={r.id} className={styles.reaction}>
        <span>{r.emoji}</span>
        <span className={styles.reactionAuthor}>{r.from}</span>
      </div>
    ))}
  </div>
);

const ChatPanel = ({ roomName, user }: PanelProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL as string);
    setSocket(newSocket);
    newSocket.on("connect", () => newSocket.emit("joinRoom", roomName));
    newSocket.on("newMessage", (message: Message) =>
      setMessages((prev) => [...prev, message])
    );
    return () => {
      if (newSocket.connected) {
        newSocket.emit("leaveRoom", roomName);
        newSocket.disconnect();
      }
    };
  }, [roomName, user]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && socket && user) {
      socket.emit("sendMessage", {
        roomName,
        message: newMessage,
        authorId: user.id,
      });
      setNewMessage("");
    }
  };

  return (
    <aside className={styles.chatPanel}>
      <h2 className={styles.panelTitle}>In-Room Chat</h2>
      <div className={styles.messagesContainer}>
        {messages.map((msg) => (
          <div key={msg.id} className={styles.message}>
            <span className={styles.authorName}>
              {msg.author?.name || "User"}:
            </span>
            <span>{msg.content}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className={styles.chatForm}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className={styles.chatInput}
          placeholder="Type a message..."
        />
        <button type="submit" className={styles.sendButton}>
          Send
        </button>
      </form>
    </aside>
  );
};

const VideoCall = ({ roomName, user, appId, token }: RoomProps) => {
  const router = useRouter();
  const agoraClient = useRTCClient();
  const { sendRtmEvent, reactionEvents, raiseHandEvents } =
    useAgoraRtm(roomName);

  // --- LOCAL STATE ---
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());

  // --- AGORA HOOKS ---
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
  const { localCameraTrack } = useLocalCameraTrack(cameraOn);
  const { screenTrack, error: screenShareError } = useLocalScreenTrack(
    isScreenSharing,
    {},
    "auto"
  );
  const remoteUsers = useRemoteUsers();

  // Publish camera and mic initially
  usePublish([localMicrophoneTrack, localCameraTrack]);

  // --- UID HASHING & JOIN LOGIC ---
  const [integerUid, setIntegerUid] = useState<number>(0);
  useEffect(() => {
    if (user?.id) {
      let hash = 0;
      for (let i = 0; i < user.id.length; i++) {
        const char = user.id.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      setIntegerUid(Math.abs(hash));
    }
  }, [user]);
  useJoin(
    { appid: appId, channel: roomName, token: token, uid: integerUid },
    !!(appId && token && integerUid > 0)
  );

  useEffect(() => {
    if (screenShareError) {
      console.error("Screen share error:", screenShareError);
      alert(
        "Could not start screen sharing. Please check browser permissions."
      );
      setIsScreenSharing(false); // Reset state on error
    }
  }, [screenShareError]);

  // --- ROBUST SCREEN SHARING LOGIC ---
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      // --- STOPPING screen share ---
      setIsScreenSharing(false);
      // The `useLocalScreenTrack` hook will automatically stop and dispose the track.
      // We must unpublish it first.
      if (screenTrack && agoraClient.localTracks.includes(screenTrack)) {
        await agoraClient.unpublish(screenTrack);
      }
      // Re-publish the camera track if it exists and is not already published.
      if (
        localCameraTrack &&
        !agoraClient.localTracks.includes(localCameraTrack)
      ) {
        await agoraClient.publish(localCameraTrack);
      }
    } else {
      // --- STARTING screen share ---
      // Unpublish the camera track first to avoid multiple video streams.
      if (
        localCameraTrack &&
        agoraClient.localTracks.includes(localCameraTrack)
      ) {
        await agoraClient.unpublish(localCameraTrack);
      }
      // This will trigger the `useLocalScreenTrack` hook to create the track.
      setIsScreenSharing(true);
    }
  };

  // This `useEffect` handles publishing the screen track once it's created by the hook.
  useEffect(() => {
    if (isScreenSharing && screenTrack) {
      agoraClient.publish(screenTrack).catch((e) => {
        console.error("Failed to publish screen track:", e);
      });
    }
  }, [isScreenSharing, screenTrack, agoraClient]);

  // --- RTM EVENT PROCESSING ---
  useEffect(() => {
    reactionEvents.forEach((event) => {
      const newReaction: Reaction = {
        id: Date.now() + Math.random(),
        emoji: event.emoji,
        from: event.fromName,
      };
      setReactions((prev) => [...prev, newReaction]);
      setTimeout(
        () =>
          setReactions((r) =>
            r.filter((reaction) => reaction.id !== newReaction.id)
          ),
        4000
      );
    });
  }, [reactionEvents]);

  useEffect(() => {
    raiseHandEvents.forEach((event) => {
      setRaisedHands((prev) => {
        const newSet = new Set(prev);
        if (event.isRaised) newSet.add(event.userId);
        else newSet.delete(event.userId);
        return newSet;
      });
    });
  }, [raiseHandEvents]);

  // --- CONTROL HANDLERS ---
  const handleEndCall = useCallback(async () => {
    agoraClient.leave();
    router.push("/");
  }, [agoraClient, router]);

  const handleToggleRaiseHand = () => {
    const isRaised = !raisedHands.has(user.id);
    sendRtmEvent({ type: "raise-hand", userId: user.id, isRaised });
  };

  const sendReaction = (emoji: string) => {
    sendRtmEvent({ type: "reaction", emoji, fromName: user.name });
  };

  // --- UI RENDER LOGIC ---
  const isSomeoneSharing =
    isScreenSharing || remoteUsers.some((u) => u.screenTrack);
  const mainStageUser = isScreenSharing
    ? null
    : remoteUsers.find((u) => u.screenTrack);

  return (
    <div className={styles.container}>
      <FloatingReactions reactions={reactions} />
      {showWhiteboard && (
        <Whiteboard
          channelName={roomName}
          onClose={() => setShowWhiteboard(false)}
        />
      )}

      <main
        className={`${styles.mainContent} ${
          showChat || showParticipants ? styles.panelActive : ""
        }`}
        style={{ display: showWhiteboard ? "none" : "flex" }}
      >
        <div className={styles.videoGrid}>
          {isSomeoneSharing ? (
            <div className={styles.screenShareView}>
              <div className={styles.mainScreen}>
                {isScreenSharing && (
                  <LocalVideoTrack track={screenTrack} play={true} />
                )}
                {mainStageUser && (
                  <RemoteUser
                    user={mainStageUser}
                    playVideo={true}
                    mediaType="screen"
                  />
                )}
              </div>
              <div className={styles.pipColumn}>
                <div className={styles.participantVideo}>
                  <LocalVideoTrack track={localCameraTrack} play={cameraOn} />
                  <div className={styles.identity}>{user.name} (You)</div>
                </div>
                {remoteUsers
                  .filter((u) => u.uid !== mainStageUser?.uid)
                  .map((remoteUser) => (
                    <div
                      key={remoteUser.uid}
                      className={styles.participantVideo}
                    >
                      <RemoteUser user={remoteUser} playVideo={true} />
                      <div className={styles.identity}>
                        User {remoteUser.uid}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <>
              <div className={styles.participantVideo}>
                <LocalVideoTrack track={localCameraTrack} play={cameraOn} />
                {!cameraOn && (
                  <div className={styles.videoOffIndicator}>
                    <VideoOff size={48} />
                  </div>
                )}
                <div className={styles.identity}>
                  {micOn ? <Mic size={14} /> : <MicOff size={14} color="red" />}{" "}
                  {user.name} (You)
                </div>
              </div>
              {remoteUsers.map((remoteUser) => (
                <div key={remoteUser.uid} className={styles.participantVideo}>
                  <RemoteUser user={remoteUser} playVideo={true} />
                  {!remoteUser.hasVideo && (
                    <div className={styles.videoOffIndicator}>
                      <VideoOff size={48} />
                    </div>
                  )}
                  <div className={styles.identity}>
                    {remoteUser.hasAudio ? (
                      <Mic size={14} />
                    ) : (
                      <MicOff size={14} color="red" />
                    )}{" "}
                    User {remoteUser.uid}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </main>

      {showChat && <ChatPanel roomName={roomName} user={user} />}
      {showParticipants && (
        <ParticipantsPanel
          localUser={user}
          remoteUsers={remoteUsers}
          raisedHands={raisedHands}
          micOn={micOn}
          cameraOn={cameraOn}
        />
      )}

      <footer className={styles.controlBar}>
        <div className={styles.controlsGroup}>
          <button
            title={micOn ? "Mute" : "Unmute"}
            onClick={() => setMicOn((m) => !m)}
            className={styles.controlButton}
          >
            {micOn ? <Mic /> : <MicOff />}
          </button>
          <button
            title={cameraOn ? "Stop Camera" : "Start Camera"}
            onClick={() => setCameraOn((c) => !c)}
            className={styles.controlButton}
          >
            {cameraOn ? <Video /> : <VideoOff />}
          </button>
        </div>
        <div className={styles.controlsGroup}>
          <button
            title="Participants"
            className={`${styles.controlButton} ${
              showParticipants ? styles.buttonActive : ""
            }`}
            onClick={() => {
              setShowParticipants((s) => !s);
              setShowChat(false);
            }}
          >
            <Users />
          </button>
          <button
            title="Chat"
            className={`${styles.controlButton} ${
              showChat ? styles.buttonActive : ""
            }`}
            onClick={() => {
              setShowChat((s) => !s);
              setShowParticipants(false);
            }}
          >
            <MessageSquare />
          </button>
          <button
            title="Share Screen"
            onClick={handleToggleScreenShare}
            className={`${styles.controlButton} ${
              isScreenSharing ? styles.buttonActive : ""
            }`}
          >
            <ScreenShare />
          </button>
          <button
            title="Whiteboard"
            onClick={() => setShowWhiteboard((s) => !s)}
            className={`${styles.controlButton} ${
              showWhiteboard ? styles.buttonActive : ""
            }`}
          >
            <Presentation />
          </button>
          <button
            title="Raise Hand"
            onClick={handleToggleRaiseHand}
            className={`${styles.controlButton} ${
              raisedHands.has(user.id) ? styles.buttonActive : ""
            }`}
          >
            <Hand />
          </button>
          <button
            title="React"
            onClick={() => sendReaction("👍")}
            className={styles.controlButton}
          >
            <SmilePlus />
          </button>
        </div>
        <div className={styles.controlsGroup}>
          <button
            title="End Call"
            onClick={handleEndCall}
            className={`${styles.controlButton} ${styles.endButton}`}
          >
            <PhoneOff />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default function RoomExperience(props: RoomProps) {
  const [agoraClient, setAgoraClient] = useState<IAgoraRTCClient | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAgoraClient(AgoraRTC.createClient({ codec: "vp8", mode: "rtc" }));
    }
  }, []);

  const handleError = (err: AgoraRTCError) => {
    console.error("Agora RTC Error:", err);
  };

  if (!agoraClient) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <h1>Initializing...</h1>
      </div>
    );
  }

  return (
    <AgoraRTCProvider client={agoraClient} onError={handleError}>
      <VideoCall {...props} />
    </AgoraRTCProvider>
  );
}