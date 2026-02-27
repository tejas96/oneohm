'use client';

import React from 'react';

import { QuoteDetailContent } from './quote-detail';

interface QuoteDetailPageProps {
  quoteId: string;
}

export function QuoteDetailPage({ quoteId }: QuoteDetailPageProps): React.JSX.Element {
  return <QuoteDetailContent quoteId={quoteId} />;
}
