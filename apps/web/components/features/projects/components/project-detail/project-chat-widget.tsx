'use client';

import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { useProjectChatMessages, useSendProjectChatMessage } from '../../hooks';

import { useAuth } from '@/providers/auth-provider';

interface ProjectChatWidgetProps {
  projectId: string;
}

export function ProjectChatWidget({ projectId }: ProjectChatWidgetProps): React.JSX.Element {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const isDifferentDay = (currentMsg: any, prevMsg: any) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.createdAt);
    const prevDate = new Date(prevMsg.createdAt);
    return (
      currentDate.getDate() !== prevDate.getDate() ||
      currentDate.getMonth() !== prevDate.getMonth() ||
      currentDate.getFullYear() !== prevDate.getFullYear()
    );
  };

  const getDayHeading = (dateStr: string) => {
    try {
      const msgDate = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (msgDate.toDateString() === today.toDateString()) {
        return 'Today';
      }
      if (msgDate.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      return msgDate.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

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
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Scroll to bottom on initial open and when new messages arrive
  useEffect(() => {
    if (!isOpen || messages.length === 0) return;
    const timer = setTimeout(() => scrollToBottom('smooth'), 100);
    return () => clearTimeout(timer);
  }, [isOpen, messages.length, scrollToBottom]);

  const handleSend = (e: React.FormEvent) => {
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
      {/* Chat Window Panel */}
      {isOpen && (
        <div className="mb-4 w-96 h-[500px] bg-background/95 backdrop-blur border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform scale-100 origin-bottom-right">
          {/* Header */}
          <div className="p-4 bg-white text-neutral-900 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary animate-pulse" />
              <div>
                <h3 className="font-semibold text-sm leading-none">Project Chat</h3>
                <span className="text-[10px] text-muted-foreground">
                  Customer & Team Discussion
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 p-1.5 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 p-4 overflow-y-auto space-y-4 bg-muted/20 custom-scrollbar"
          >
            {isLoading && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs">Loading conversation...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-3 text-muted/65 stroke-[1.5]" />
                <p className="text-sm font-semibold mb-1">No messages yet</p>
                <p className="text-xs max-w-[200px]">
                  Send the first message to start discussing this solar project.
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
                      <div className="relative flex items-center justify-center my-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border/60"></div>
                        </div>
                        <span className="relative px-3 bg-neutral-50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider rounded-full py-0.5 border border-border/50 text-[9px] shadow-sm">
                          {getDayHeading(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex flex-col max-w-[80%] transition-all duration-200 ${
                        isOwn ? 'ml-auto items-end' : 'mr-auto items-start'
                      } ${isConsecutive ? 'mt-1' : 'mt-4'}`}
                    >
                      {!isOwn && !isConsecutive && (
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[10px] font-bold text-neutral-800">
                            {senderName}
                          </span>
                          {msg.sender?.roleType === 'customer' && (
                            <span className="text-[9px] bg-secondary/15 text-secondary font-bold px-1.5 py-0.5 rounded-md border border-secondary/10">
                              Customer
                            </span>
                          )}
                          {msg.sender?.roleType === 'team' && (
                            <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-md border border-primary/10">
                              Team
                            </span>
                          )}
                        </div>
                      )}
                      <div
                        className={`p-3 rounded-2xl text-sm leading-normal shadow-sm transition-all hover:shadow-md ${
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-tr-none border border-primary/10'
                            : 'bg-white text-neutral-900 border border-border rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.messageText}</p>
                      </div>
                      <span className="text-[9px] text-muted-foreground/75 mt-1 px-1 font-medium">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-border bg-background flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 min-w-0 bg-muted/40 hover:bg-muted/60 focus:bg-background border border-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sendMessageMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 p-2.5 rounded-xl transition flex items-center justify-center"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition transform hover:scale-105 active:scale-95 duration-200"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageSquare className="w-6 h-6 text-white" />
        )}

        {!isOpen && hasUnread && (
          <span className="absolute top-0 right-0 flex h-4 w-4 transform translate-x-1/3 -translate-y-1/3 z-[60]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border border-white shadow"></span>
          </span>
        )}
      </button>
    </div>
  );
}
