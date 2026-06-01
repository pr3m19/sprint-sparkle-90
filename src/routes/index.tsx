import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity, Users, Target, AlertTriangle, TrendingUp, Wrench,
  Shield, Database, KeyRound, RefreshCw, Layers,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  LineChart, Line,
} from "recharts";
import {
  LEADS, MEMBERS, PILLARS, TOOLS, QUARTERS, SPRINT_CAPACITY_PER_MEMBER,
  TEAM_CONFIG, generateQuarterData, totalForAllocation,
} from "@/lib/sre-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SRE Capacity Tracker" },
      { name: "description", content: "Track sprint and quarterly effort allocation across SRE team, pillars, tools and EKS admin." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [quarter, setQuarter] = useState(QUARTERS[1]);
  const [jiraConnected, setJiraConnected] = useState(false);
  const data = useMemo(() => generateQuarterData(quarter), [quarter]);

  const quarterCapacity = MEMBERS.length * SPRINT_CAPACITY_PER_MEMBER * 6;
  const quarterSpent = data.reduce((s, a) => s + totalForAllocation(a), 0);
  const utilization = Math.round((quarterSpent / quarterCapacity) * 100);

  const pillarTotals = PILLARS.map((p) => ({
    pillar: p,
    points: data.reduce((s, a) => s + a.pillars[p], 0),
  }));

  const sprintBreakdown = Array.from({ length: 6 }, (_, i) => {
    const s = i + 1;
    const rows = data.filter((d) => d.sprint === s);
    return {
      sprint: `S${s}`,
      "Team Support": rows.reduce((x, r) => x + r.teamSupport, 0),
      Pillars: rows.reduce((x, r) => x + Object.values(r.pillars).reduce((a, b) => a + b, 0), 0),
      Initiatives: rows.reduce((x, r) => x + r.initiatives, 0),
      Tools: rows.reduce((x, r) => x + r.toolsSupport, 0),
      EKS: rows.reduce((x, r) => x + r.eksAdmin, 0),
      Adhoc: rows.reduce((x, r) => x + r.adhoc, 0),
    };
  });

  const teamSupportTarget = TEAM_CONFIG.pointsPerSprintPerMember * MEMBERS.length * 6;
  const teamSupportActual = data.reduce((s, a) => s + a.teamSupport, 0);
  const teamSupportDeviation = teamSupportActual - teamSupportTarget;

  const initiativeTarget = TEAM_CONFIG.initiativePointsPerQuarter * MEMBERS.length;
  const initiativeActual = data.reduce((s, a) => s + a.initiatives, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        quarter={quarter}
        onQuarter={setQuarter}
        jiraConnected={jiraConnected}
        onConnect={() => setJiraConnected(true)}
      />

      <main className="mx-auto max-w-[1400px] px-6 py-8 space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<Users className="h-4 w-4" />}
            label="Team Headcount"
            value={MEMBERS.length.toString()}
            sub={`${TEAM_CONFIG.leads} leads · ${TEAM_CONFIG.supportedTeams} teams supported`}
          />
          <KpiCard
            icon={<Activity className="h-4 w-4" />}
            label="Quarter Utilization"
            value={`${utilization}%`}
            sub={`${quarterSpent} / ${quarterCapacity} SP`}
            tone={utilization > 100 ? "danger" : utilization > 90 ? "warn" : "ok"}
          />
          <KpiCard
            icon={<Target className="h-4 w-4" />}
            label="Team Support Deviation"
            value={`${teamSupportDeviation > 0 ? "+" : ""}${teamSupportDeviation} SP`}
            sub={`target ${teamSupportTarget} · actual ${teamSupportActual}`}
            tone={Math.abs(teamSupportDeviation) > teamSupportTarget * 0.1 ? "warn" : "ok"}
          />
          <KpiCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="SRE Initiatives"
            value={`${initiativeActual} / ${initiativeTarget}`}
            sub="quarterly initiative points"
            tone={initiativeActual < initiativeTarget * 0.8 ? "warn" : "ok"}
          />
        </section>

        <Tabs defaultValue="sprints" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="sprints">Sprint Breakdown</TabsTrigger>
            <TabsTrigger value="pillars">Pillars</TabsTrigger>
            <TabsTrigger value="leads">Leads & Teams</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="ops">Tools & EKS</TabsTrigger>
          </TabsList>

          <TabsContent value="sprints" className="space-y-6">
            <Card title="Effort allocation across 6 sprints" subtitle="Stacked story points per category">
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sprintBreakdown}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="sprint" stroke="var(--muted-foreground)" />
                    <YAxis stroke="var(--muted-foreground)" />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                    <Legend wrapperStyle={{ color: "var(--muted-foreground)" }} />
                    <Bar dataKey="Team Support" stackId="a" fill="var(--chart-1)" />
                    <Bar dataKey="Pillars" stackId="a" fill="var(--chart-2)" />
                    <Bar dataKey="Initiatives" stackId="a" fill="var(--chart-3)" />
                    <Bar dataKey="Tools" stackId="a" fill="var(--chart-4)" />
                    <Bar dataKey="EKS" stackId="a" fill="var(--chart-5)" />
                    <Bar dataKey="Adhoc" stackId="a" fill="var(--accent)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Team support trend vs target" subtitle={`Target ${TEAM_CONFIG.pointsPerSprintPerMember} SP × ${MEMBERS.length} members per sprint`}>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sprintBreakdown.map((s) => ({
                    sprint: s.sprint,
                    Actual: s["Team Support"],
                    Target: TEAM_CONFIG.pointsPerSprintPerMember * MEMBERS.length,
                  }))}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="sprint" stroke="var(--muted-foreground)" />
                    <YAxis stroke="var(--muted-foreground)" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ color: "var(--muted-foreground)" }} />
                    <Line type="monotone" dataKey="Actual" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Target" stroke="var(--chart-3)" strokeDasharray="5 5" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="pillars">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Pillar effort distribution" subtitle="Total story points this quarter">
                <div className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={pillarTotals}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="pillar" stroke="var(--muted-foreground)" />
                      <PolarRadiusAxis stroke="var(--muted-foreground)" />
                      <Radar name="Points" dataKey="points" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.45} />
                      <Tooltip contentStyle={tooltipStyle} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card title="Pillar ownership" subtitle="1–2 SP / sprint per member commitment">
                <div className="space-y-4 py-2">
                  {pillarTotals.map((p) => {
                    const max = Math.max(...pillarTotals.map((x) => x.points));
                    const pct = (p.points / max) * 100;
                    const icon = pillarIcon(p.pillar);
                    return (
                      <div key={p.pillar} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-primary">{icon}</span>
                            <span className="font-medium">{p.pillar}</span>
                          </div>
                          <span className="font-mono text-muted-foreground">{p.points} SP</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="leads">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LEADS.map((lead) => {
                const members = MEMBERS.filter((m) => m.leadId === lead.id);
                const points = data.filter((d) => members.some((m) => m.id === d.memberId))
                  .reduce((s, a) => s + totalForAllocation(a), 0);
                const cap = members.length * SPRINT_CAPACITY_PER_MEMBER * 6;
                const pct = Math.round((points / cap) * 100);
                return (
                  <div key={lead.id} className="rounded-lg border border-border bg-card p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Lead</div>
                        <div className="text-lg font-semibold">{lead.name}</div>
                      </div>
                      <Badge variant="outline" className="font-mono">{pct}% util</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lead.teams.map((t) => (
                        <Badge key={t} className="bg-secondary text-secondary-foreground">{t}</Badge>
                      ))}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">{members.length} members · {points}/{cap} SP</div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="members">
            <Card title="Member-level allocation" subtitle="Quarter totals across all categories">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-3 px-2 font-medium">Member</th>
                      <th className="py-3 px-2 font-medium">Team</th>
                      <th className="py-3 px-2 font-medium text-right">Support</th>
                      <th className="py-3 px-2 font-medium text-right">Pillars</th>
                      <th className="py-3 px-2 font-medium text-right">Init.</th>
                      <th className="py-3 px-2 font-medium text-right">Tools</th>
                      <th className="py-3 px-2 font-medium text-right">EKS</th>
                      <th className="py-3 px-2 font-medium text-right">Adhoc</th>
                      <th className="py-3 px-2 font-medium text-right">Total</th>
                      <th className="py-3 px-2 font-medium">Capacity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MEMBERS.map((m) => {
                      const rows = data.filter((d) => d.memberId === m.id);
                      const support = rows.reduce((s, r) => s + r.teamSupport, 0);
                      const pillars = rows.reduce((s, r) => s + Object.values(r.pillars).reduce((a, b) => a + b, 0), 0);
                      const init = rows.reduce((s, r) => s + r.initiatives, 0);
                      const tools = rows.reduce((s, r) => s + r.toolsSupport, 0);
                      const eks = rows.reduce((s, r) => s + r.eksAdmin, 0);
                      const adhoc = rows.reduce((s, r) => s + r.adhoc, 0);
                      const total = support + pillars + init + tools + eks + adhoc;
                      const cap = SPRINT_CAPACITY_PER_MEMBER * 6;
                      const pct = Math.round((total / cap) * 100);
                      return (
                        <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-semibold text-primary-foreground">
                                {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-medium">{m.name}</div>
                                <div className="text-xs text-muted-foreground">{m.role}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">{m.primaryTeam}</td>
                          <td className="py-3 px-2 text-right font-mono">{support}</td>
                          <td className="py-3 px-2 text-right font-mono">{pillars}</td>
                          <td className="py-3 px-2 text-right font-mono">{init}</td>
                          <td className="py-3 px-2 text-right font-mono">{tools}</td>
                          <td className="py-3 px-2 text-right font-mono">{eks}</td>
                          <td className="py-3 px-2 text-right font-mono">{adhoc}</td>
                          <td className="py-3 px-2 text-right font-mono font-semibold">{total}</td>
                          <td className="py-3 px-2 w-32">
                            <div className="flex items-center gap-2">
                              <Progress value={Math.min(pct, 100)} className="h-1.5" />
                              <span className={`text-xs font-mono w-9 text-right ${pct > 100 ? "text-destructive" : "text-muted-foreground"}`}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="ops">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Tools ownership" subtitle="10 tools recently transitioned to SRE">
                <div className="grid grid-cols-2 gap-2">
                  {TOOLS.map((t) => (
                    <div key={t} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                      <Wrench className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm">{t}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="EKS administration" subtitle="Sustained admin effort across clusters">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quarter EKS effort</span>
                    <span className="text-2xl font-semibold font-mono">
                      {data.reduce((s, a) => s + a.eksAdmin, 0)} SP
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tools support effort</span>
                    <span className="text-2xl font-semibold font-mono">
                      {data.reduce((s, a) => s + a.toolsSupport, 0)} SP
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Adhoc / unplanned</span>
                    <span className="text-2xl font-semibold font-mono text-warning" style={{ color: "var(--warning)" }}>
                      {data.reduce((s, a) => s + a.adhoc, 0)} SP
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Header({
  quarter, onQuarter, jiraConnected, onConnect,
}: {
  quarter: string; onQuarter: (q: string) => void;
  jiraConnected: boolean; onConnect: () => void;
}) {
  const [token, setToken] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-border bg-sidebar/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-[1400px] px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Layers className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">SRE Capacity Tracker</h1>
            <p className="text-xs text-muted-foreground">Sprint & quarterly effort allocation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border bg-card p-0.5">
            {QUARTERS.map((q) => (
              <button
                key={q}
                onClick={() => onQuarter(q)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  q === quarter ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Sync
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant={jiraConnected ? "secondary" : "default"}>
                <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                {jiraConnected ? "Jira Connected" : "Connect Jira"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect Jira</DialogTitle>
                <DialogDescription>
                  Paste your Atlassian personal access token. We'll pull sprints, story points and labels per member.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="jira-url">Jira base URL</Label>
                  <Input id="jira-url" placeholder="https://yourorg.atlassian.net" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jira-email">Email</Label>
                  <Input id="jira-email" type="email" placeholder="you@company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jira-token">Personal Access Token</Label>
                  <Input id="jira-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ATATT3xFfGF0..." />
                </div>
                <Button
                  className="w-full"
                  onClick={() => { onConnect(); setOpen(false); }}
                >
                  Save & sync
                </Button>
                <p className="text-xs text-muted-foreground">
                  Token is stored locally in this prototype. Hook up Lovable Cloud to persist securely.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}

function KpiCard({
  icon, label, value, sub, tone = "neutral",
}: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  tone?: "neutral" | "ok" | "warn" | "danger";
}) {
  const toneClass = {
    neutral: "text-foreground",
    ok: "text-primary",
    warn: "",
    danger: "text-destructive",
  }[tone];
  const style = tone === "warn" ? { color: "var(--warning)" } : undefined;
  return (
    <div className="rounded-lg border border-border bg-card p-5 hover:border-primary/40 transition-colors">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className={`mt-3 text-3xl font-semibold font-mono ${toneClass}`} style={style}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function pillarIcon(p: string) {
  const map: Record<string, React.ReactNode> = {
    Cost: <TrendingUp className="h-3.5 w-3.5" />,
    Monitoring: <Activity className="h-3.5 w-3.5" />,
    Security: <Shield className="h-3.5 w-3.5" />,
    AI: <Database className="h-3.5 w-3.5" />,
    Observability: <AlertTriangle className="h-3.5 w-3.5" />,
  };
  return map[p] ?? <Layers className="h-3.5 w-3.5" />;
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  color: "var(--popover-foreground)",
  fontSize: "12px",
};
