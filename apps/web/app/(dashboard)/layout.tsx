'use client';

import React, { type ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Dashboard Layout
 * Main application layout with sidebar and header
 * TODO: Implement actual Sidebar and Header components
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for layouts
export default function DashboardLayout({ children }: DashboardLayoutProps): React.JSX.Element {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar Placeholder */}
      <aside className="hidden md:flex w-64 flex-col bg-gray-900 text-white">
        {/* Logo */}
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-primary">OneOhm</h1>
          <p className="text-gray-400 text-sm mt-1">EPC Platform</p>
        </div>

        {/* Navigation Placeholder */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <a
            href="/"
            className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-lg"
          >
            <span>Dashboard</span>
          </a>
          <a
            href="/customers"
            className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-lg"
          >
            <span>Customers</span>
          </a>
          <a
            href="/quotes"
            className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-lg"
          >
            <span>Quotes</span>
          </a>
          <a
            href="/projects"
            className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-lg"
          >
            <span>Projects</span>
          </a>
          <a
            href="/inventory"
            className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-lg"
          >
            <span>Inventory</span>
          </a>
          <a
            href="/settings"
            className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-lg"
          >
            <span>Settings</span>
          </a>
        </nav>

        {/* User Profile Placeholder */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
              A
            </div>
            <div>
              <p className="text-sm font-medium">Admin User</p>
              <p className="text-xs text-gray-400">admin@oneohm.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header Placeholder */}
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Search */}
            <div className="hidden sm:flex items-center bg-gray-100 rounded-lg px-3 py-2">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search... (⌘K)"
                className="bg-transparent border-none outline-none ml-2 text-sm w-48"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="p-2 rounded-lg hover:bg-gray-100 relative">
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
