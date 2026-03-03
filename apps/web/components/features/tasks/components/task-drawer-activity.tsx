'use client';

import type { TaskActivityEntry } from '@oneohm-epc/shared-types';
import { MessageSquare } from 'lucide-react';
import { useCallback, useState } from 'react';

import { ACTIVITY_TYPE_LABELS } from '../constants';

import { Button } from '@/components/ui/button';
import { formatRelativeDate } from '@/lib/utils';

interface TaskDrawerActivityProps {
  activityLog: TaskActivityEntry[];
  onAddComment: (comment: string) => void;
  isAddingComment?: boolean;
}

export function TaskDrawerActivity({
  activityLog,
  onAddComment,
  isAddingComment,
}: TaskDrawerActivityProps): React.JSX.Element {
  const [commentText, setCommentText] = useState('');

  const handleSubmit = useCallback(() => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setCommentText('');
  }, [commentText, onAddComment]);

  return (
    <div className="space-y-4">
      {/* Comment input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 rounded-lg border border-border-light bg-background px-3 py-1.5 text-sm placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={handleSubmit}
          disabled={!commentText.trim() || isAddingComment}
        >
          Send
        </Button>
      </div>

      {/* Activity timeline */}
      {activityLog.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-foreground-muted">No activity yet</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {activityLog.map((entry) => (
            <li key={entry.id} className="flex items-start gap-2">
              <div className="mt-1 size-5 shrink-0 rounded-full bg-muted flex items-center justify-center">
                {entry.activityType === 'commented' ? (
                  <MessageSquare className="size-3 text-foreground-tertiary" />
                ) : (
                  <div className="size-1.5 rounded-full bg-foreground-tertiary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground-secondary">
                  {entry.activityType === 'commented' ? (
                    <span>{entry.newValue}</span>
                  ) : (
                    <span>
                      {ACTIVITY_TYPE_LABELS[entry.activityType] ?? entry.activityType}
                      {entry.fieldName === 'status' && entry.oldValue && entry.newValue && (
                        <span>
                          {' '}
                          from <span className="font-medium">{entry.oldValue}</span> to{' '}
                          <span className="font-medium">{entry.newValue}</span>
                        </span>
                      )}
                      {entry.fieldName === 'priority' && entry.oldValue && entry.newValue && (
                        <span>
                          {' '}
                          from <span className="font-medium">{entry.oldValue}</span> to{' '}
                          <span className="font-medium">{entry.newValue}</span>
                        </span>
                      )}
                    </span>
                  )}
                </p>
                <p className="text-2xs text-foreground-muted">
                  {formatRelativeDate(entry.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
