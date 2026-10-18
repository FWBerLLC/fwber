"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Server, Database, FolderGit2, Activity, ShieldCheck, Cpu, Users, MessageSquare, TrendingUp, Smile, Heart, ThumbsDown, Globe } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import ProtectedRoute from "@/components/ProtectedRoute";
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
  version: string;
  environment: string;
  checks: {
    database?: { status: string; version: string };
    redis?: { status: string; version: string };
    cache?: { status: string };
    storage?: { status: string };
  };
}

interface AnalyticsData {
  users: { total: number; active: number; new_today: number; growth_rate: number };
  messages: { total: number; today: number; average_per_user: number; moderation_stats: any };
  locations: { total_boards: number; active_areas: number; coverage_radius: number; most_active: any[] };
  performance: { api_response_time: number; slow_requests_24h: number; sse_connections: number; cache_hit_rate: number; error_rate: number };
  feedback: { total: number; sentiment: { positive: number; neutral: number; negative: number }; top_categories: any[] };
  trends: any;
}

export default function SystemDashboardPage() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [healthRes, analyticsRes] = await Promise.all([
          apiClient.get<HealthResponse>('/health'),
          apiClient.get<AnalyticsData>('/analytics?range=30d')
        ]);
        
        const data = healthRes.data;

        const systemInfo: SystemInfo = {
          version: data.version || "0.99.6", 
          environment: data.environment,
          backend_status: data.status === 'healthy' ? 'online' : 'offline',
          database_status: data.checks.database?.status === 'ok' ? 'connected' : 'disconnected',
          submodules: [
            { name: "fwber-backend", path: "/fwber-backend", status: "active", version: process.env.NEXT_PUBLIC_BACKEND_VERSION || "0.99.6" },
            { name: "fwber-frontend", path: "/fwber-frontend", status: "active", version: process.env.NEXT_PUBLIC_FRONTEND_VERSION || "0.99.6" }
          ]
        };
        setInfo(systemInfo);
        setAnalytics(analyticsRes.data);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        // Fallback or error state
        setInfo({
            version: "Unknown",
            environment: "Unknown",
            backend_status: "offline",
            database_status: "disconnected",
            submodules: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || !info) {
      return (
        <ProtectedRoute>
            <div className="min-h-screen bg-muted dark:bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        </ProtectedRoute>
      );
  }

  const sentimentTotal = analytics?.feedback.sentiment 
    ? analytics.feedback.sentiment.positive + analytics.feedback.sentiment.neutral + analytics.feedback.sentiment.negative 
    : 1;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader />

        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground dark:text-foreground flex items-center gap-2">
                <Cpu className="w-8 h-8 text-blue-600" />
                System Dashboard
              </h1>
              <p className="text-muted-foreground dark:text-muted-foreground mt-1">
                Monitor system health, versions, and engagement metrics.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1 text-sm bg-card dark:bg-card">
                v{info.version}
              </Badge>
              <Badge className={info.backend_status === "online" ? "bg-green-500" : "bg-red-500"}>
                {info.backend_status === "online" ? "System Operational" : "System Issues"}
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics & Sentiment</TabsTrigger>
              <TabsTrigger value="structure">Project Structure</TabsTrigger>
              <TabsTrigger value="changelog">Changelog</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatusCard
                  title="Backend API"
                  status={info.backend_status}
                  icon={<Server className="w-5 h-5" />}
                  detail="Laravel 12 (PHP 8.4)"
                />
                <StatusCard
                  title="Database"
                  status={info.database_status === "connected" ? "online" : "offline"}
                  icon={<Database className="w-5 h-5" />}
                  detail="MySQL 8.0"
                />
                <StatusCard
                  title="Frontend"
                  status="online"
                  icon={<Activity className="w-5 h-5" />}
                  detail="Next.js 16 (React 18)"
                />
                <StatusCard
                  title="Security"
                  status="online"
                  icon={<ShieldCheck className="w-5 h-5" />}
                  detail="E2E Encrypted"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Submodules & Packages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative overflow-x-auto">
                    <table className="w-full text-sm text-left text-muted-foreground dark:text-muted-foreground">
                      <thead className="text-xs text-foreground dark:text-muted-foreground uppercase bg-muted dark:bg-background dark:dark:bg-muted dark:text-muted-foreground">
                        <tr>
                          <th scope="col" className="px-6 py-3">Module Name</th>
                          <th scope="col" className="px-6 py-3">Path</th>
                          <th scope="col" className="px-6 py-3">Version</th>
                          <th scope="col" className="px-6 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {info.submodules.map((mod, i) => (
                          <tr key={i} className="bg-card border-b dark:bg-card dark:border-border">
                            <th scope="row" className="px-6 py-4 font-medium text-foreground dark:text-foreground whitespace-nowrap dark:text-foreground flex items-center gap-2">
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
              {analytics ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analytics.users.total.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                          {analytics.users.growth_rate}% from last month
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analytics.messages.total.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                          +{analytics.messages.today} today
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Communities</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analytics.locations.active_areas}</div>
                        <p className="text-xs text-muted-foreground">
                          out of {analytics.locations.total_boards} total boards
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>User Sentiment Overview</CardTitle>
                        <CardDescription>Based on feedback and AI conversation analysis</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Heart className="w-5 h-5 text-green-500" />
                              <span className="font-medium">Positive</span>
                            </div>
                            <span className="font-bold">{Math.round((analytics.feedback.sentiment.positive / sentimentTotal) * 100)}%</span>
                          </div>
                          <div className="w-full bg-muted dark:dark:bg-muted rounded-full h-2.5">
                            <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${(analytics.feedback.sentiment.positive / sentimentTotal) * 100}%` }}></div>
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-2">
                              <Smile className="w-5 h-5 text-yellow-500" />
                              <span className="font-medium">Neutral</span>
                            </div>
                            <span className="font-bold">{Math.round((analytics.feedback.sentiment.neutral / sentimentTotal) * 100)}%</span>
                          </div>
                          <div className="w-full bg-muted dark:dark:bg-muted rounded-full h-2.5">
                            <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: `${(analytics.feedback.sentiment.neutral / sentimentTotal) * 100}%` }}></div>
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-2">
                              <ThumbsDown className="w-5 h-5 text-red-500" />
                              <span className="font-medium">Negative</span>
                            </div>
                            <span className="font-bold">{Math.round((analytics.feedback.sentiment.negative / sentimentTotal) * 100)}%</span>
                          </div>
                          <div className="w-full bg-muted dark:dark:bg-muted rounded-full h-2.5">
                            <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${(analytics.feedback.sentiment.negative / sentimentTotal) * 100}%` }}></div>
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
                          <div className="flex justify-between border-b dark:border-border pb-2">
                            <span className="text-muted-foreground dark:text-muted-foreground">Avg API Response</span>
                            <span className="font-mono font-medium">{analytics.performance.api_response_time}ms</span>
                          </div>
                          <div className="flex justify-between border-b dark:border-border pb-2">
                            <span className="text-muted-foreground dark:text-muted-foreground">Cache Hit Rate</span>
                            <span className="font-mono font-medium text-green-500">{analytics.performance.cache_hit_rate}%</span>
                          </div>
                          <div className="flex justify-between border-b dark:border-border pb-2">
                            <span className="text-muted-foreground dark:text-muted-foreground">Error Rate</span>
                            <span className="font-mono font-medium">{analytics.performance.error_rate}%</span>
                          </div>
                          <div className="flex justify-between pb-2">
                            <span className="text-muted-foreground dark:text-muted-foreground">Active WebSocket Conns</span>
                            <span className="font-mono font-medium text-blue-500">{analytics.performance.sse_connections}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Loading analytics data...</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="structure">
              <Card>
                <CardHeader>
                  <CardTitle>Project Directory Structure</CardTitle>
                </CardHeader>
                <CardContent className="font-mono text-sm dark:bg-background text-muted-foreground p-6 rounded-lg overflow-x-auto">
                  <pre>{`
/ (Project Root)
├── fwber-backend/          # Laravel API Source
│   ├── app/                # Core Logic (Controllers, Models)
│   ├── routes/             # API Definitions
│   ├── tests/              # Feature & Unit Tests
│   └── database/           # Migrations & Seeds
│
├── fwber-frontend/         # Next.js Application
│   ├── app/                # App Router Pages
│   │   ├── (auth)/         # Authentication Routes
│   │   ├── admin/          # Admin Dashboard
│   │   ├── dashboard/      # User Dashboard
│   │   └── ...             # Feature Pages
│   ├── components/         # Reusable UI Components
│   ├── lib/                # Utilities & Hooks
│   └── public/             # Static Assets
│
├── docs/                   # Documentation
│   ├── PROJECT_STATUS.md   # Current State
│   └── ROADMAP.md          # Future Plans
│
└── docker-compose.yml      # Orchestration
                  `}</pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="changelog">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Updates (v0.99.6)</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                  <h3>Federation & Growth</h3>
                  <ul>
                    <li><strong>ActivityPub:</strong> Global Federation Gateway with follow/followers feeds.</li>
                    <li><strong>Merchant Portal:</strong> Zero-commission local merchant dashboard and promotions.</li>
                    <li><strong>E2E Encryption:</strong> Automated 30-day key rotation.</li>
                    <li><strong>AI Wingman:</strong> Proactive Smart Suggestions in real-time chat.</li>
                  </ul>
                  <h3>Performance</h3>
                  <ul>
                    <li>Rust Geo-Screener handles spatial queries with &lt; 3ms latency.</li>
                    <li>TypeErrors and 500 errors fully resolved.</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function StatusCard({ title, status, icon, detail }: { title: string, status: string, icon: React.ReactNode, detail: string }) {
  const isOnline = status === "online";
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-full ${isOnline ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
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
