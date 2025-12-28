import './globals.css';

import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';

import { AuthProvider } from '@/components/providers/AuthProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { WebSocketProvider } from '@/components/providers/WebSocketProvider';
import { OnboardingTour } from '@/components/system/OnboardingTour';

export const metadata: Metadata = {
  title: {
    default: 'Delta Terminal - AI交易终端',
    template: '%s | Delta Terminal',
  },
  description: '无代码AI自动交易平台 - AI驱动的智能交易终端',
  keywords: ['交易', 'AI', '自动化', '加密货币', '策略'],
  authors: [{ name: 'Delta Terminal Team' }],
  icons: {
    icon: '/favicon.ico',
  },
};

// Inline script to prevent theme flash
// Only add 'dark' class for dark theme; light uses :root defaults
const themeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('ui-storage');
      var theme = 'dark';
      if (stored) {
        var parsed = JSON.parse(stored);
        theme = parsed.state && parsed.state.theme ? parsed.state.theme : 'dark';
      }
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      document.documentElement.style.colorScheme = theme;
    } catch (e) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${GeistSans.variable} ${GeistMono.variable} dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          <ThemeProvider>
            <WebSocketProvider>
              {children}
              {/* Story 5.1: Toast 通知容器 */}
              <Toaster
                position="top-right"
                richColors
                closeButton
                toastOptions={{
                  className: 'font-sans',
                }}
              />
              {/* Story 10.1: 新手引导 */}
              <OnboardingTour />
            </WebSocketProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
