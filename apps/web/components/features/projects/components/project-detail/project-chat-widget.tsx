'use client';

import { Loader2, MessageSquare, Send, X } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { IconCircle, TonePill } from './primitives';
import { useProjectChatMessages, useSendProjectChatMessage } from '../../hooks';
import type { ProjectChatMessage } from '../../hooks/use-project-chat';

import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

interface ProjectChatWidgetProps {
  projectId: string;
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function isDifferentDay(
  current: ProjectChatMessage,
  prev: ProjectChatMessage | undefined,
): boolean {
  if (!prev) return true;
  const a = new Date(current.createdAt);
  const b = new Date(prev.createdAt);
  return (
    a.getDate() !== b.getDate() ||
    a.getMonth() !== b.getMonth() ||
    a.getFullYear() !== b.getFullYear()
  );
}

function dayHeading(dateStr: string): string {
  try {
    const msgDate = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (msgDate.toDateString() === today.toDateString()) return 'Today';
    if (msgDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return msgDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * The project's conversation, floating over every tab.
 *
 * Deliberately ungated. Posting a message is collaboration on a project you
 * can already open — the route gate (projects.view) is the real boundary, and
 * there is no catalog code for commenting.
 */
export function ProjectChatWidget({ projectId }: ProjectChatWidgetProps): React.JSX.Element {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');

  const { data: messages = [], isLoading } = useProjectChatMessages(projectId);
  const sendMessageMutation = useSendProjectChatMessage(projectId);

  const [lastReadTime, setLastReadTime] = useState<number>(0);

  // Retrieve last read time on mount & when isOpen changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem(`chat_last_read_${projectId}`);
      if (val) {
        setLastReadTime(parseInt(val, 10));
      }
    }
  }, [projectId, isOpen]);

  // Mark messages as read when the chat panel is open
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      const latestMsg = messages[messages.length - 1];
      if (!latestMsg) return;
      const ts = new Date(latestMsg.createdAt).getTime().toString();
      localStorage.setItem(`chat_last_read_${projectId}`, ts);
      setLastReadTime(parseInt(ts, 10));
    }
  }, [isOpen, messages, projectId]);

  const hasUnread = React.useMemo(() => {
    if (isOpen) return false;
    if (messages.length === 0) return false;
    const latestMsg = messages[messages.length - 1];
    if (!latestMsg || latestMsg.senderId === user?.id) return false;
    return new Date(latestMsg.createdAt).getTime() > lastReadTime;
  }, [messages, lastReadTime, isOpen, user?.id]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Scroll to bottom on initial open and when new messages arrive
  useEffect(() => {
    if (!isOpen || messages.length === 0) return;
    const timer = setTimeout(() => scrollToBottom('smooth'), 100);
    return () => clearTimeout(timer);
  }, [isOpen, messages.length, scrollToBottom]);

  const handleSend = (e: React.FormEvent): void => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sendMessageMutation.isPending) return;

    setInputText('');
    sendMessageMutation
      .mutateAsync(trimmed)
      .then(() => {
        scrollToBottom('smooth');
      })
      .catch((err) => {
        console.error('Failed to send message:', err);
      });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div
          role="dialog"
          aria-label="Project chat"
          className="mb-4 flex h-[520px] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-3xl bg-surface shadow-e5"
        >
          <div className="flex items-center justify-between px-5 pb-3 pt-4">
            <div className="flex items-center gap-3">
              <IconCircle tone="accent" size={32}>
                <MessageSquare className="size-4" strokeWidth={1.75} />
              </IconCircle>
              <div>
                <h3 className="text-[13.5px] font-semibold leading-tight text-foreground">
                  Project chat
                </h3>
                <span className="text-[11px] text-foreground-tertiary">Customer and team</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="flex size-8 items-center justify-center rounded-full text-foreground-secondary transition-colors duration-fast hover:bg-background-tertiary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto bg-background-secondary px-4 py-3 scrollbar-thin">
            {isLoading && messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-foreground-tertiary">
                <Loader2 className="size-5 animate-spin text-primary-dark" />
                <span className="text-xs">Loading the conversation…</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <IconCircle tone="neutral" size={40} className="mb-3">
                  <MessageSquare className="size-[18px]" strokeWidth={1.75} />
                </IconCircle>
                <p className="text-[13.5px] font-semibold text-foreground">No messages yet</p>
                <p className="mt-1 max-w-[220px] text-[12px] text-foreground-secondary">
                  Send the first message to start the conversation on this project.
                </p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isOwn = msg.senderId === user?.id;
                const senderName = isOwn
                  ? 'You'
                  : `${msg.sender?.firstName || ''} ${msg.sender?.lastName || ''}`.trim() || 'User';

                const prevMsg = index > 0 ? messages[index - 1] : undefined;
                const isConsecutive =
                  prevMsg &&
                  prevMsg.senderId === msg.senderId &&
                  new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() <
                    120000;

                const showDateHeader = isDifferentDay(msg, prevMsg);

                return (
                  <React.Fragment key={msg.id}>
                    {showDateHeader && (
                      <div className="flex justify-center py-3">
                        <span className="rounded-pill bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground-tertiary shadow-e1">
                          {dayHeading(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        'flex max-w-[82%] flex-col',
                        isOwn ? 'ml-auto items-end' : 'mr-auto items-start',
                        isConsecutive ? 'mt-1' : 'mt-3',
                      )}
                    >
                      {!isOwn && !isConsecutive && (
                        <div className="mb-1 flex items-center gap-1.5 px-1">
                          <span className="text-[11px] font-semibold text-foreground">
                            {senderName}
                          </span>
                          {msg.sender?.roleType === 'customer' && (
                            <TonePill
                              label="Customer"
                              tone="info"
                              className="h-4 px-1.5 text-[9.5px]"
                            />
                          )}
                          {msg.sender?.roleType === 'team' && (
                            <TonePill
                              label="Team"
                              tone="accent"
                              className="h-4 px-1.5 text-[9.5px]"
                            />
                          )}
                        </div>
                      )}
                      <div
                        className={cn(
                          'px-3.5 py-2.5 text-[13px] leading-normal',
                          isOwn
                            ? 'rounded-2xl rounded-br-md bg-primary-dark text-white'
                            : 'rounded-2xl rounded-bl-md bg-surface text-foreground shadow-e1',
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.messageText}</p>
                      </div>
                      <span className="mt-1 px-1 text-[10px] tabular-nums text-foreground-tertiary">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 bg-surface px-3 py-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Write a message"
              aria-label="Message"
              className="h-10 min-w-0 flex-1 rounded-pill bg-background-tertiary px-4 text-[13px] text-foreground placeholder:text-foreground-tertiary focus:outline-2 focus:outline-offset-2 focus:outline-primary"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!inputText.trim() || sendMessageMutation.isPending}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-dark text-white transition-[transform,opacity] duration-fast hover:brightness-110 active:scale-[0.97] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={
          isOpen
            ? 'Close project chat'
            : hasUnread
              ? 'Open project chat, new messages'
              : 'Open project chat'
        }
        aria-expanded={isOpen}
        className="relative flex size-[52px] items-center justify-center rounded-full bg-primary-dark text-white shadow-e3 transition-[box-shadow,transform] duration-fast hover:shadow-e4 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {isOpen ? <X className="size-5" /> : <MessageSquare className="size-5" />}

        {!isOpen && hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center">
            <span className="absolute inline-flex size-full rounded-full bg-error opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex size-3.5 rounded-full bg-error ring-2 ring-surface" />
          </span>
        )}
      </button>
    </div>
  );
}
