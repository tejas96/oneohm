'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/system';
import { useEffect, useState } from 'react';

const zigzagMove = keyframes`
  0%      { transform: translate(0, 0); }
  12.5%   { transform: translate(10px, -14px); }
  25%     { transform: translate(20px, 0); }
  37.5%   { transform: translate(10px, 14px); }
  50%     { transform: translate(0, 0); }
  62.5%   { transform: translate(-10px, -14px); }
  75%     { transform: translate(-20px, 0); }
  87.5%   { transform: translate(-10px, 14px); }
  100%    { transform: translate(0, 0); }
`;

const zigzagGlow = keyframes`
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50%      { opacity: 1; transform: scale(1); }
`;

const messageFade = keyframes`
  0%   { opacity: 0; transform: translateY(6px); }
  15%  { opacity: 1; transform: translateY(0); }
  85%  { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-6px); }
`;

const DOT_COUNT = 4;
const DOT_STAGGER = -0.45;

const DEFAULT_LOADING_MESSAGES = [
  'Preparing your workspace…',
  'Syncing latest updates…',
  'Loading your projects…',
  'Setting things up…',
  'Almost ready…',
];

interface ZigzagLoaderProps {
  /** Custom messages to rotate through (defaults to built-in set) */
  messages?: string[];
  /** Interval between messages in ms (default 3000) */
  interval?: number;
  /** Static message — disables rotation when provided */
  staticMessage?: string;
}

export function ZigzagLoader({
  messages = DEFAULT_LOADING_MESSAGES,
  interval = 3000,
  staticMessage,
}: ZigzagLoaderProps): React.JSX.Element {
  const [messageIndex, setMessageIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (staticMessage) return;
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
      setAnimKey((prev) => prev + 1);
    }, interval);
    return (): void => clearInterval(timer);
  }, [messages, interval, staticMessage]);

  const displayMessage = staticMessage ?? messages[messageIndex];

  return (
    <Box
      role="status"
      aria-label={displayMessage}
      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
    >
      <Box
        sx={{
          position: 'relative',
          height: 40,
          width: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {Array.from({ length: DOT_COUNT }, (_, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              height: 10,
              width: 10,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              opacity: 0.9 - i * 0.15,
              animation: `${zigzagMove} 2s ease-in-out infinite`,
              animationDelay: `${i * DOT_STAGGER}s`,
            }}
          />
        ))}
        <Box
          sx={{
            position: 'absolute',
            height: 24,
            width: 56,
            borderRadius: 9999,
            bgcolor: 'primary.main',
            opacity: 0.1,
            filter: 'blur(16px)',
            animation: `${zigzagGlow} 1.4s ease-in-out infinite`,
          }}
        />
      </Box>

      <Typography
        key={animKey}
        variant="body2"
        color="text.secondary"
        sx={{ animation: `${messageFade} 3s ease-in-out forwards` }}
      >
        {displayMessage}
      </Typography>
    </Box>
  );
}
