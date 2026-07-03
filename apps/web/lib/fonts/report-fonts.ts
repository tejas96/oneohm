import { Noto_Sans, Open_Sans } from 'next/font/google';

/** Report document fonts — scoped via CSS variables, separate from app Inter typography. */
export const reportOpenSans = Open_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-report-open-sans',
  weight: ['400', '600', '700'],
});

export const reportNotoSans = Noto_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-report-noto-sans',
  weight: ['400', '600', '700'],
});

export const reportFontVariables = `${reportOpenSans.variable} ${reportNotoSans.variable}`;
