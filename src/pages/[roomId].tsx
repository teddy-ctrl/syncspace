import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import dynamic from 'next/dynamic';
import Head from 'next/head';

const RoomExperience = dynamic(
  () => import('../components/RoomExperience'),
  { ssr: false }
);

export default function RoomPage() {
  const router = useRouter();
  const { roomId } = router.query;
  const { user, token: authToken, isLoading, logout } = useAuth();
  const [agoraToken, setAgoraToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If auth is loading, wait.
    if (isLoading) {
      return;
    }
    // If not authenticated, redirect to login.
    if (!user || !authToken) {
      router.push('/login');
      return;
    }
    // If we have a user but no roomId yet, wait for router.
    if (typeof roomId !== 'string') {
      return;
    }
    
    (async () => {
      try {
        const resp = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/agora/token?roomName=${roomId}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        if (!resp.ok) {
           if (resp.status === 401) {
            // Unauthorized, likely expired token
            logout();
            return;
           }
          const errorInfo = await resp.json();
          throw new Error(errorInfo.message || 'Failed to get room token from server.');
        }

        const data = await resp.json();

        if (data && typeof data.token === 'string') {
          setAgoraToken(data.token);
        } else {
          throw new Error('Server response did not contain a valid token.');
        }
      } catch (e) {
        let errorMessage = 'An unknown error occurred.';
        if (e instanceof Error) {
          errorMessage = e.message;
        }
        setError(`Could not join the room: ${errorMessage}`);
      }
    })();
  }, [user, authToken, roomId, isLoading, router, logout]);

  if (isLoading || (!agoraToken && !error)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#212121', color: 'white' }}>
        <h1>Preparing your room...</h1>
        <p>Please wait a moment.</p>
      </div>
    );
  }

  if (error) {
     return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#212121', color: 'white' }}>
        <h1>Error</h1>
        <p style={{ color: 'red', margin: '20px', textAlign: 'center' }}>{error}</p>
        <button onClick={() => router.push('/')} style={{padding: '10px 20px', cursor: 'pointer'}}>Go to Home</button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Room: {roomId} | Unity Utopia</title>
      </Head>
      <RoomExperience 
        roomName={roomId as string} 
        user={user!} // We know user is not null here due to the checks above
        appId={process.env.NEXT_PUBLIC_AGORA_APP_ID as string}
        token={agoraToken}
      />
    </>
  );
}