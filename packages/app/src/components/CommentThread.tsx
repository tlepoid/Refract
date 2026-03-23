'use client';

import { useState } from 'react';
import type { CommentThread as CommentThreadType } from '@refract/shared';

interface Props {
  thread: CommentThreadType;
  onReply: (text: string) => void;
  onResolve: () => void;
  onWontfix: () => void;
  onClose: () => void;
}

export function CommentThreadPopover({ thread, onReply, onResolve, onWontfix, onClose }: Props) {
  const [replyText, setReplyText] = useState('');
  const isResolved = thread.status !== 'open';

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        width: 300,
        backgroundColor: 'white',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000,
        padding: 12,
        fontSize: 13,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, opacity: isResolved ? 0.5 : 1 }}>
          {isResolved ? `[${thread.status}]` : 'Comment Thread'}
        </span>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
          x
        </button>
      </div>

      <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 8 }}>
        {thread.messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              marginBottom: 8,
              padding: '6px 8px',
              backgroundColor: '#f3f4f6',
              borderRadius: 4,
              opacity: isResolved ? 0.6 : 1,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 11 }}>
              {msg.author}{' '}
              <span style={{ fontWeight: 400, color: '#6b7280' }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div>{msg.text}</div>
          </div>
        ))}
      </div>

      {!isResolved && (
        <>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && replyText.trim()) {
                  onReply(replyText.trim());
                  setReplyText('');
                }
              }}
              style={{
                flex: 1,
                padding: '4px 8px',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                fontSize: 13,
              }}
            />
            <button
              onClick={() => {
                if (replyText.trim()) {
                  onReply(replyText.trim());
                  setReplyText('');
                }
              }}
              style={{
                padding: '4px 8px',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Send
            </button>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={onResolve}
              style={{
                flex: 1,
                padding: '4px 8px',
                backgroundColor: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Resolve
            </button>
            <button
              onClick={onWontfix}
              style={{
                flex: 1,
                padding: '4px 8px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Won&apos;t Fix
            </button>
          </div>
        </>
      )}
    </div>
  );
}
