"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Server,
  Database,
  FolderGit2,
  Activity,
  ShieldCheck,
  Cpu,
  Users,
  MessageSquare,
  TrendingUp,
  Smile,
  Heart,
  ThumbsDown,
  FileText,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LogViewer } from "@/components/admin/LogViewer";
import { apiClient } from "@/lib/api/client";

interface SystemInfo {
  version: string;
  environment: string;
  backend_status: "online" | "offline";
  database_status: "connected" | "disconnected";
  submodules: {
    name: string;
    path: string;
    status: string;
    version?: string;
  }[];
}

interface HealthResponse {
  status: string;
  version?: string;
  app_version?: string;
  environment?: string;
  database?: string;
  checks?: {
    database?: { status: string; version?: string };
    redis?: { status: string; version?: string };
    cache?: { status: string };
    storage?: { status: string };
  };
}

interface AnalyticsData {
  users?: { total: number; active: number; new_today: number; growth_rate: number };
  messages?: { total: number; today: number; average_per_user: number; moderation_stats: unknown };
  locations?: { total_boards: number; active_areas: number; coverage_radius: number; most_active: unknown[] };
  performance?: {
    api_response_time: number;
    slow_requests_24h: number;
    sse_connections: number;
    cache_hit_rate: number;
    error_rate: number;
  };
  feedback?: { total: number; sentiment?: { positive: number; neutral: number; negative: number }; top_categories: unknown[] };
  trends?: unknown;
}

const VALID_TABS = new Set(["overview", "analytics", "logs", "structure", "changelog"]);

function SystemDashboardContent() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams?.get("tab") ?? "overview";
  const initialTab = VALID_TABS.has(requestedTab) ? requestedTab : "overview";

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (VALID_TABS.has(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [healthRes, analyticsRes] = await Promise.all([
          apiClient.get<HealthResponse>("/health"),
          apiClient.get<AnalyticsData>("/analytics?range=30d").catch(() => ({ data: null as AnalyticsData | null })),
        ]);

        const data = healthRes.data;
        const resolvedVersion = data.app_version || data.version || process.env.NEXT_PUBLIC_APP_VERSION || "2.3.93";
        const isHealthy = data.status === "ok" || data.status === "healthy";
        const dbConnected =
          data.database === "connected" ||
          data.checks?.database?.status === "ok" ||
          data.checks?.database?.status === "healthy";

        const systemInfo: SystemInfo = {
          version: resolvedVersion,
          environment: data.environment || "production",
          backend_status: isHealthy ? "online" : "offline",
          database_status: dbConnected ? "connected" : "disconnected",
          submodules: [
            { name: "fwber-backend-ts", path: "/fwber-backend-ts", status: "active", version: resolvedVersion },
            { name: "fwber-frontend", path: "/fwber-frontend", status: "active", version: resolvedVersion },
            { name: "fwber-geo (Rust)", path: "/fwber-geo", status: "active", version: resolvedVersion },
          ],
        };
        setInfo(systemInfo);
        setAnalytics(analyticsRes.data);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setInfo({
          version: "Unknown",
          environment: "Unknown",
          backend_status: "offline",
          database_status: "disconnected",
          submodules: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || !info) {
    return (
      <div className="min-h-screen bg-muted dark:bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const positive = analytics?.feedback?.sentiment?.positive ?? 0;
  const neutral = analytics?.feedback?.sentiment?.neutral ?? 0;
  const negative = analytics?.feedback?.sentiment?.negative ?? 0;
  const sentimentTotal = Math.max(1, positive + neutral + negative);

  return (
    <div className="min-h-screen bg-muted dark:bg-background">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Cpu className="w-8 h-8 text-blue-600" />
              System Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor live service health, version parity, runtime logs, and platform telemetry.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1 text-sm bg-card">
              v{info.version}
            </Badge>
            <Badge className={info.backend_status === "online" ? "bg-green-500 text-white" : "bg-red-500 text-white"}>
              {info.backend_status === "online" ? "System Operational" : "System Issues"}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics &amp; Sentiment</TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              Application Logs
            </TabsTrigger>
            <TabsTrigger value="structure">Project Structure</TabsTrigger>
            <TabsTrigger value="changelog">Changelog</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatusCard
                title="Backend API"
                status={info.backend_status}
                icon={<Server className="w-5 h-5" />}
                detail="Express + TypeScript + Prisma"
              />
              <StatusCard
                title="Database"
                status={info.database_status === "connected" ? "online" : "offline"}
                icon={<Database className="w-5 h-5" />}
                detail="MySQL 8.0 + Redis"
              />
              <StatusCard
                title="Frontend"
                status="online"
                icon={<Activity className="w-5 h-5" />}
                detail="Next.js 16 (React 18)"
              />
              <StatusCard
                title="Security & Geo"
                status="online"
                icon={<ShieldCheck className="w-5 h-5" />}
                detail="TOTP 2FA + Rust Geo-Screener"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Active Runtime Modules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs text-foreground uppercase bg-muted">
                      <tr>
                        <th scope="col" className="px-6 py-3">Module Name</th>
                        <th scope="col" className="px-6 py-3">Path</th>
                        <th scope="col" className="px-6 py-3">Version</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {info.submodules.map((mod, i) => (
                        <tr key={i} className="bg-card border-b border-border">
                          <th scope="row" className="px-6 py-4 font-medium text-foreground whitespace-nowrap flex items-center gap-2">
                            <FolderGit2 className="w-4 h-4" />
                            {mod.name}
                          </th>
                          <td className="px-6 py-4 font-mono text-xs">{mod.path}</td>
                          <td className="px-6 py-4">{mod.version}</td>
                          <td className="px-6 py-4">
                            <Badge variant="secondary" className="capitalize">{mod.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {analytics?.users ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(analytics.users.total ?? 0).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        {analytics.users.growth_rate ?? 0}% growth over selected window
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(analytics.messages?.total ?? 0).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        +{analytics.messages?.today ?? 0} today
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Communities</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.locations?.active_areas ?? 0}</div>
                      <p className="text-xs text-muted-foreground">
                        out of {analytics.locations?.total_boards ?? 0} total boards
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>User Sentiment Overview</CardTitle>
                      <CardDescription>Based on user feedback submissions and sentiment classification</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Heart className="w-5 h-5 text-green-500" />
                            <span className="font-medium">Positive</span>
                          </div>
                          <span className="font-bold">{Math.round((positive / sentimentTotal) * 100)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5">
                          <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${(positive / sentimentTotal) * 100}%` }}></div>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <Smile className="w-5 h-5 text-yellow-500" />
                            <span className="font-medium">Neutral</span>
                          </div>
                          <span className="font-bold">{Math.round((neutral / sentimentTotal) * 100)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5">
                          <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: `${(neutral / sentimentTotal) * 100}%` }}></div>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <ThumbsDown className="w-5 h-5 text-red-500" />
                            <span className="font-medium">Negative</span>
                          </div>
                          <span className="font-bold">{Math.round((negative / sentimentTotal) * 100)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5">
                          <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${(negative / sentimentTotal) * 100}%` }}></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>System Performance</CardTitle>
                      <CardDescription>Live health and efficiency metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between border-b border-border pb-2">
                          <span className="text-muted-foreground">Avg API Response</span>
                          <span className="font-mono font-medium">{analytics.performance?.api_response_time ?? 0}ms</span>
                        </div>
                        <div className="flex justify-between border-b border-border pb-2">
                          <span className="text-muted-foreground">Cache Hit Rate</span>
                          <span className="font-mono font-medium text-green-500">{analytics.performance?.cache_hit_rate ?? 0}%</span>
                        </div>
                        <div className="flex justify-between border-b border-border pb-2">
                          <span className="text-muted-foreground">Error Rate</span>
                          <span className="font-mono font-medium">{analytics.performance?.error_rate ?? 0}%</span>
                        </div>
                        <div className="flex justify-between pb-2">
                          <span className="text-muted-foreground">Active Realtime Conns</span>
                          <span className="font-mono font-medium text-blue-500">{analytics.performance?.sse_connections ?? 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Analytics telemetry is accessible to platform operators.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <LogViewer />
          </TabsContent>

          <TabsContent value="structure">
            <Card>
              <CardHeader>
                <CardTitle>Project Directory Structure</CardTitle>
              </CardHeader>
              <CardContent className="font-mono text-sm bg-muted/50 text-muted-foreground p-6 rounded-lg overflow-x-auto">
                <pre>{`
/ (Project Root — v${info.version})
├── fwber-backend-ts/       # Express + TypeScript + Prisma + Socket.IO API
│   ├── src/routes/         # 91 Mounted Express API Prefixes
│   ├── src/services/       # Auth, 2FA, AI Wingman, Trust & Geo Services
│   ├── prisma/             # MySQL Schema & Migrations
│   └── tests/              # Jest Integration & Security Test Suites
│
├── fwber-frontend/         # Next.js 16 (App Router) + React 18 Frontend
│   ├── app/                # 130+ App Router Pages & OG Image Generators
│   ├── components/         # Radix UI, WebRTC Video/Audio & Safety Widgets
│   └── lib/                # Typed API Clients, Socket.IO Hooks & Crypto Vault
│
├── fwber-geo/              # Rust Spatial Proximity Screener (< 3ms Haversine)
└── ops/hetzner/            # Zero-Downtime PM2 + Nginx Deployment Scripts
                `}</pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="changelog">
            <Card>
              <CardHeader>
                <CardTitle>Recent Platform Highlights (v{info.version})</CardTitle>
              </CardHeader>
              <CardContent className="prose dark:prose-invert max-w-none">
                <h3>Security, Realtime &amp; Full-Stack Contract Parity</h3>
                <ul>
                  <li><strong>TOTP Two-Factor Authentication:</strong> Domain-separated 5-minute login challenges with RFC 6238 TOTP and single-use emergency recovery codes.</li>
                  <li><strong>Live WebRTC Video &amp; Audio:</strong> Authenticated Socket.IO + REST SDP/ICE signaling with bidirectional block &amp; participant authorization guards.</li>
                  <li><strong>Operator Control Plane:</strong> Runtime feature flags persisted in <code>autonomous_settings</code>, live PM2 application log inspection, and rate-limiter telemetry.</li>
                  <li><strong>ActivityPub &amp; Solana Economy:</strong> Federated profile discovery, Merkle council governance, and FWB Token tipping/gifting.</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default function SystemDashboardPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="min-h-screen bg-muted dark:bg-background flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }
      >
        <SystemDashboardContent />
      </Suspense>
    </ProtectedRoute>
  );
}

function StatusCard({ title, status, icon, detail }: { title: string; status: string; icon: React.ReactNode; detail: string }) {
  const isOnline = status === "online";
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-full ${isOnline ? "bg-green-100 dark:bg-green-950/40 text-green-600" : "bg-red-100 dark:bg-red-950/40 text-red-600"}`}>
            {icon}
          </div>
          <span className={`flex h-3 w-3 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground capitalize">{status}</p>
          <p className="text-xs text-muted-foreground font-mono mt-2">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}
