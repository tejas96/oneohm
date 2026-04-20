/**
 * Configuration Usage Examples for Next.js Web App
 * This file demonstrates how to use the config service in your components
 */

import { config } from './config';

// ==========================================
// Example 1: Using Config in a Component
// ==========================================
export function ExampleComponent() {
  // Access configuration values
  const apiUrl = config.api.baseUrl;
  const appName = config.app.name;

  return (
    <div>
      <h1>{appName}</h1>
      <p>API URL: {apiUrl}</p>
      <p>Environment: {config.environment}</p>
    </div>
  );
}

// ==========================================
// Example 2: Using Config in API Calls
// ==========================================
export async function fetchData() {
  const url = `${config.api.baseUrl}/data`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error;
  }
}

// ==========================================
// Example 3: Conditional Rendering Based on Environment
// ==========================================
export function DebugInfo() {
  // Only show debug info in development
  if (!config.isDevelopment) {
    return null;
  }

  return (
    <div className="debug-info">
      <h3>Debug Information</h3>
      <pre>{JSON.stringify(config.all, null, 2)}</pre>
    </div>
  );
}

// ==========================================
// Example 4: Using Config in Server-Side Code
// ==========================================
// In pages/api/health.ts
export async function healthCheck() {
  return {
    status: 'ok',
    environment: config.environment,
    version: config.app.version,
    apiUrl: config.api.baseUrl,
  };
}

// ==========================================
// Example 5: Using Feature Flags
// ==========================================
export function AnalyticsComponent() {
  if (!config.isAnalyticsEnabled) {
    return null; // Don't render if analytics is disabled
  }

  return (
    <script
      async
      src={`https://www.googletagmanager.com/gtag/js?id=${config.analytics.gaTrackingId}`}
    />
  );
}

// ==========================================
// Example 6: Using Third-Party Services
// ==========================================
export function MapComponent() {
  const mapsKey = config.thirdParty.googleMapsApiKey;

  if (!mapsKey) {
    return <p>Google Maps API key not configured</p>;
  }

  // Use maps key to load Google Maps
  return <div>Map component with API key: {mapsKey}</div>;
}

// ==========================================
// Example 7: Environment-Specific Logic
// ==========================================
export function Logger() {
  const log = (...args: any[]) => {
    if (config.isDevelopment) {
      // eslint-disable-next-line no-console
      console.log('[DEV]', ...args);
    } else if (config.isProduction) {
      // Send to logging service in production
      // sendToLogService(args);
    }
  };

  return { log };
}

// ==========================================
// Example 8: Using in Next.js App Router
// ==========================================
// In app/layout.tsx
export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>{config.app.name}</title>
        {config.isAnalyticsEnabled && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${config.analytics.gaTrackingId}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${config.analytics.gaTrackingId}');
                `,
              }}
            />
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}

// ==========================================
// Example 9: Using in API Route Handler
// ==========================================
// In app/api/config/route.ts
export async function GET() {
  return Response.json({
    app: {
      name: config.app.name,
      version: config.app.version,
      environment: config.environment,
    },
    api: {
      baseUrl: config.api.baseUrl,
    },
    features: {
      analytics: config.isAnalyticsEnabled,
      errorTracking: config.isErrorTrackingEnabled,
    },
  });
}

// ==========================================
// Example 10: Creating an API Client
// ==========================================
class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = config.api.baseUrl;
    this.timeout = config.api.timeout;
  }

  async get<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}

export const apiClient = new ApiClient();
