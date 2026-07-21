'use client';

import * as React from 'react';

/**
 * Local replacement for `@radix-ui/react-avatar`.
 *
 * The part worth preserving is the load-state coordination: the image is only
 * shown once it has actually decoded, and the fallback holds the space until
 * then — so a broken or slow avatar URL never leaves an empty circle or flashes
 * a fallback over a loaded image.
 *
 * MUI's `Avatar` does its own fallback handling but owns the markup and sizing,
 * which would discard the deterministic per-name colour classes this app
 * applies to `AvatarFallback`.
 */

type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface AvatarContextValue {
  status: LoadStatus;
  setStatus: (status: LoadStatus) => void;
}

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

function useAvatar(component: string): AvatarContextValue {
  const ctx = React.useContext(AvatarContext);
  if (!ctx) throw new Error(`<${component}> must be rendered inside an <Avatar.Root>`);
  return ctx;
}

export const Root = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ children, ...props }, ref) => {
    const [status, setStatus] = React.useState<LoadStatus>('idle');
    const value = React.useMemo(() => ({ status, setStatus }), [status]);
    return (
      <AvatarContext.Provider value={value}>
        <span ref={ref} {...props}>
          {children}
        </span>
      </AvatarContext.Provider>
    );
  },
);
Root.displayName = 'Avatar.Root';

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  onLoadingStatusChange?: (status: LoadStatus) => void;
}

export const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  ({ src, onLoadingStatusChange, onLoad, onError, ...props }, ref) => {
    const { status, setStatus } = useAvatar('Avatar.Image');

    // Reset when the src changes so a second avatar doesn't inherit the first
    // one's loaded state.
    React.useEffect(() => {
      setStatus(src ? 'loading' : 'error');
      onLoadingStatusChange?.(src ? 'loading' : 'error');
    }, [src, setStatus, onLoadingStatusChange]);

    if (!src || status === 'error') return null;

    return (
      <img
        ref={ref}
        src={src}
        // Hidden rather than unmounted while loading: the browser needs the
        // element in the tree to fetch it at all.
        style={{ visibility: status === 'loaded' ? 'visible' : 'hidden', ...props.style }}
        onLoad={(e) => {
          setStatus('loaded');
          onLoadingStatusChange?.('loaded');
          onLoad?.(e);
        }}
        onError={(e) => {
          setStatus('error');
          onLoadingStatusChange?.('error');
          onError?.(e);
        }}
        {...props}
      />
    );
  },
);
Image.displayName = 'Avatar.Image';

export interface FallbackProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Hold the fallback back by N ms, to avoid a flash on a fast connection. */
  delayMs?: number;
}

export const Fallback = React.forwardRef<HTMLSpanElement, FallbackProps>(
  ({ delayMs, children, ...props }, ref) => {
    const { status } = useAvatar('Avatar.Fallback');
    const [canRender, setCanRender] = React.useState(delayMs === undefined);

    React.useEffect(() => {
      if (delayMs === undefined) return;
      const timer = window.setTimeout(() => setCanRender(true), delayMs);
      return () => window.clearTimeout(timer);
    }, [delayMs]);

    if (!canRender || status === 'loaded') return null;

    return (
      <span ref={ref} {...props}>
        {children}
      </span>
    );
  },
);
Fallback.displayName = 'Avatar.Fallback';
