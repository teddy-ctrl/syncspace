import { Tldraw, useEditor, Editor, TLRecord, TLChange } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useAgoraRtm } from '../hooks/useAgoraRtm';

const TldrawWrapper = ({ channelName }: { channelName: string }) => {
  const editor = useEditor();
  const { sendRtmEvent, tldrawEvents } = useAgoraRtm(channelName);

  // Send local changes to other users
  useEffect(() => {
    if (!editor) return;
    const onChange = (change: TLChange) => {
      if (change.source !== 'user') return;
      const msg = { type: 'tldraw-event' as const, data: change };
      sendRtmEvent(msg);
    };
    editor.on('change', onChange);
    return () => { editor.off('change', onChange); };
  }, [editor, sendRtmEvent]);

  // Apply remote changes to the local editor
  useEffect(() => {
    if (editor && tldrawEvents.length > 0) {
      tldrawEvents.forEach(event => {
        const change: TLChange = event.data;
        editor.store.mergeRemoteChanges(() => {
          const { added, updated, removed } = change.changes;
          if (added) {
            const records = Object.values(added) as TLRecord[];
            editor.store.put(records);
          }
          if (updated) {
            const records = Object.values(updated).map(([, to]) => to) as TLRecord[];
            editor.store.put(records);
          }
          if (removed) {
            const ids = Object.values(removed).map(r => (r as TLRecord).id);
            editor.store.remove(ids);
          }
        });
      });
    }
  }, [tldrawEvents, editor]);

  return null;
};

export default function Whiteboard({ channelName, onClose }: { channelName: string, onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'white' }}>
      <Tldraw persistenceKey={`tldraw-${channelName}`}>
        <TldrawWrapper channelName={channelName} />
      </Tldraw>
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 999,
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Back to Call"
      >
        <X size={24} />
      </button>
    </div>
  );
}