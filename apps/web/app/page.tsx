export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <main className="flex flex-col items-center gap-8 p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900">Welcome to OneOhm EPC</h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          Your Energy Performance Certificate management system
        </p>
        <div className="flex gap-4">
          <a
            href="/docs"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </a>
          <a
            href="/api"
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            API Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
