'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { Activity, Server, Database, GitBranch, Folder, FileText, Layers } from 'lucide-react';

export default function ProjectDashboardPage() {
  const projectVersion = process.env.NEXT_PUBLIC_PROJECT_VERSION || 'Unknown';
  const backendVersion = process.env.NEXT_PUBLIC_BACKEND_VERSION || 'Unknown';
  const frontendVersion = process.env.NEXT_PUBLIC_FRONTEND_VERSION || 'Unknown';

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background transition-colors duration-300">
        <header className="bg-card dark:bg-background shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground dark:text-foreground">Project Dashboard</h1>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">System Architecture & Versioning</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/admin/settings"
                  className="rounded-md bg-card dark:bg-card border border-border dark:border-border px-4 py-2 text-sm font-medium text-foreground dark:text-muted-foreground hover:bg-muted dark:bg-background dark:hover:bg-gray-700 transition-colors"
                >
                  Back to Settings
                </a>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Versioning Section */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-4 flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-muted-foreground dark:text-muted-foreground" />
              Component Versions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card dark:bg-background rounded-lg border border-border dark:border-border dark:border-gray-800 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground dark:text-foreground">Project Root</span>
                  <span className="text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                    v{projectVersion}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Orchestration & Docs</p>
                <div className="mt-4 text-xs text-muted-foreground dark:text-muted-foreground font-mono">Source: /VERSION</div>
              </div>

              <div className="bg-card dark:bg-background rounded-lg border border-border dark:border-border dark:border-gray-800 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground dark:text-foreground">Backend API</span>
                  <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    v{backendVersion}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Laravel 12 Framework</p>
                <div className="mt-4 text-xs text-muted-foreground dark:text-muted-foreground font-mono">Source: /fwber-backend/package.json</div>
              </div>

              <div className="bg-card dark:bg-background rounded-lg border border-border dark:border-border dark:border-gray-800 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground dark:text-foreground">Frontend App</span>
                  <span className="text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full">
                    v{frontendVersion}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Next.js 14 Framework</p>
                <div className="mt-4 text-xs text-muted-foreground dark:text-muted-foreground font-mono">Source: /fwber-frontend/package.json</div>
              </div>
            </div>
          </section>

          {/* Project Structure Section */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-4 flex items-center gap-2">
              <Folder className="h-5 w-5 text-muted-foreground dark:text-muted-foreground" />
              Project Structure
            </h2>
            <div className="bg-card dark:bg-background rounded-lg border border-border dark:border-border dark:border-gray-800 overflow-hidden shadow-sm">
              <div className="p-6">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-muted dark:bg-card rounded-lg">
                      <Layers className="h-6 w-6 text-muted-foreground dark:text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground dark:text-foreground">Root Directory (/)</h3>
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                        Contains orchestration files (Docker), documentation, and deployment scripts.
                        Acts as the monorepo root.
                      </p>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted dark:bg-card text-foreground dark:text-foreground dark:text-muted-foreground border border-border dark:border-border">
                          docker-compose.yml
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted dark:bg-card text-foreground dark:text-foreground dark:text-muted-foreground border border-border dark:border-border">
                          deploy.sh
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted dark:bg-card text-foreground dark:text-foreground dark:text-muted-foreground border border-border dark:border-border">
                          VERSION
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-6 flex items-start gap-4">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Server className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground dark:text-foreground">Backend (/fwber-backend)</h3>
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                        Laravel API server handling business logic, database interactions, queues, and WebSocket broadcasting.
                      </p>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
                          app/Http/Controllers
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
                          routes/api.php
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
                          config/
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-6 flex items-start gap-4">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Database className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground dark:text-foreground">Frontend (/fwber-frontend)</h3>
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                        Next.js application providing the user interface, PWA capabilities, and client-side logic.
                      </p>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-100 dark:border-green-900/40">
                          app/
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-100 dark:border-green-900/40">
                          components/
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-100 dark:border-green-900/40">
                          lib/
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-6 flex items-start gap-4">
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <FileText className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground dark:text-foreground">Documentation (/docs)</h3>
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                        Centralized documentation for API, deployment, features, and AI agent protocols.
                      </p>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-100 dark:border-yellow-900/40">
                          LLM_INSTRUCTIONS.md
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-100 dark:border-yellow-900/40">
                          ROADMAP.md
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-100 dark:border-yellow-900/40">
                          API_DOCS.md
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
