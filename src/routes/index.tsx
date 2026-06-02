import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity, Users, Target, AlertTriangle, TrendingUp, Wrench,
  Shield, Database, KeyRound, RefreshCw, Box, Cpu, BarChart3,
  ChevronDown, Layers, Zap, Sparkles, Server
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  LineChart, Line, AreaChart, Area,
} from "recharts";
import {
  LEADS, MEMBERS, PILLARS, TOOLS, QUARTERS, SPRINT_CAPACITY_PER_MEMBER,
  TEAM_CONFIG, generateQuarterData, totalForAllocation,
  type Pillar,
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
      { name: "description", content: "Track sprint and quarterly effort allocation across your SRE team." },
    ],
  }),
  component: Dashboard,
});

/* ─── helpers ─── */

function toHex(oklchStr: string): string {
  // quick approximation from oklch — not exact but good enough for inline SVGs
  // we return the raw string for CSS vars which recharts handles fine
  return oklchStr;
}

/* ─── page ─── */

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
      sprint: `S${String(s).padStart(2, "0")}`,
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
        {/* KPI cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard
            icon={<Users className="h-5 w-5" />}
            label="Team Size"
            value={MEMBERS.length.toString()}
            sub={`${TEAM_CONFIG.leads} leads · ${TEAM_CONFIG.supportedTeams} teams`}
            tone="neutral"
          />
          <KpiCard
            icon={<Activity className="h-5 w-5" />}
            label="Utilization"
            value={`${utilization}%`}
            sub={`${quarterSpent} / ${quarterCapacity} SP`}
            tone={utilization > 100 ? "danger" : utilization > 90 ? "warn" : "ok"}
          />
          <KpiCard
            icon={<Target className="h-5 w-5" />}
            label="Support Deviation"
            value={`${teamSupportDeviation > 0 ? "+" : ""}${teamSupportDeviation} SP`}
            sub={`target ${teamSupportTarget} · actual ${teamSupportActual}`}
            tone={Math.abs(teamSupportDeviation) > teamSupportTarget * 0.1 ? "warn" : "ok"}
          />
          <KpiCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Initiatives"
            value={`${initiativeActual} / ${initiativeTarget}`}
            sub="quarterly initiative points"
            tone={initiativeActual < initiativeTarget * 0.8 ? "warn" : "ok"}
          />
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader
              icon={<BarChart3 className="h-4 w-4" />}
              title="Sprint Effort Allocation"
              subtitle="Story points by category across 6 sprints"
            />
            <div className="px-5 pb-5">
              <Legend2
                items={[
                  ["Team Support", "var(--chart-1)"],
                  ["Pillars", "var(--chart-2)"],
                  ["Initiatives", "var(--chart-3)"],
                  ["Tools", "var(--chart-4)"],
                  ["EKS", "var(--chart-5)"],
                  ["Adhoc", "var(--destructive)"],
                ]}
              />
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sprintBreakdown} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="4 4" />
                    <XAxis dataKey="sprint" stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                    <Bar dataKey="Team Support" stackId="a" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Pillars" stackId="a" fill="var(--chart-2)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Initiatives" stackId="a" fill="var(--chart-3)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Tools" stackId="a" fill="var(--chart-4)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="EKS" stackId="a" fill="var(--chart-5)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Adhoc" stackId="a" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              icon={<Layers className="h-4 w-4" />}
              title="Pillar Distribution"
              subtitle="Effort across internal pillars"
            />
            <div className="px-5 pb-5">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={pillarTotals}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="pillar" stroke="var(--muted-foreground)" tick={{ fontSize: 11, fontWeight: 500 }} />
                    <PolarRadiusAxis stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                    <Radar name="Points" dataKey="points" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.25} />
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-3">
                {pillarTotals.map((p) => {
                  const max = Math.max(...pillarTotals.map((x) => x.points));
                  const pct = (p.points / max) * 100;
                  return (
                    <div key={p.pillar} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--chart-2)]">{pillarIcon(p.pillar)}</span>
                          <span className="font-medium">{p.pillar}</span>
                        </div>
                        <span className="text-muted-foreground text-xs">{p.points} SP</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--chart-2)]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </section>

        {/* Trend line */}
        <Card>
          <CardHeader
            icon={<TrendingUp className="h-4 w-4" />}
            title="Team Support Trend"
            subtitle={`Target: ${TEAM_CONFIG.pointsPerSprintPerMember} SP × ${MEMBERS.length} members per sprint`}
          />
          <div className="px-5 pb-5">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sprintBreakdown.map((s) => ({
                    sprint: s.sprint,
                    Actual: s["Team Support"],
                    Target: TEAM_CONFIG.pointsPerSprintPerMember * MEMBERS.length,
                  }))}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="4 4" />
                  <XAxis dataKey="sprint" stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
                  <Area type="monotone" dataKey="Actual" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#actualFill)" dot={{ r: 4, fill: "var(--chart-1)", strokeWidth: 2, stroke: "var(--card)" }} />
                  <Line type="monotone" dataKey="Target" stroke="var(--chart-3)" strokeDasharray="6 4" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Tabs: Leads, Members, Tools */}
        <Tabs defaultValue="leads" className="space-y-6">
          <TabsList className="bg-card border border-border p-1.5 rounded-xl h-auto w-full grid grid-cols-3 gap-1.5">
            {[
              ["leads", "Leads & Teams", Users],
              ["members", "Members", Server],
              ["ops", "Tools & EKS", Wrench],
            ].map(([v, l, Icon]) => (
              <TabsTrigger
                key={v}
                value={v}
                className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground py-2.5 transition-all flex items-center justify-center gap-2"
              >
                <Icon className="h-4 w-4" /> {l}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="leads" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {LEADS.map((lead, idx) => {
                const members = MEMBERS.filter((m) => m.leadId === lead.id);
                const points = data
                  .filter((d) => members.some((m) => m.id === d.memberId))
                  .reduce((s, a) => s + totalForAllocation(a), 0);
                const cap = members.length * SPRINT_CAPACITY_PER_MEMBER * 6;
                const pct = Math.round((points / cap) * 100);
                return (
                  <Card key={lead.id}>
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-[var(--chart-1)]/10 flex items-center justify-center text-[var(--chart-1)]">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base">{lead.name}</h3>
                            <p className="text-xs text-muted-foreground">{members.length} members · Lead {idx + 1}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="rounded-lg font-medium">
                          {pct}% utilized
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {lead.teams.map((t) => (
                          <Badge key={t} variant="secondary" className="rounded-lg font-medium text-xs bg-[var(--secondary)]/60">
                            {t}
                          </Badge>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Capacity used</span>
                          <span className="font-medium">{points} / {cap} SP</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              background: pct > 100 ? "var(--destructive)" : pct > 90 ? "var(--chart-3)" : "var(--chart-2)",
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        {members.slice(0, 4).map((m) => (
                          <div key={m.id} className="flex items-center gap-2 text-xs">
                            <div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                              {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                            <span className="text-muted-foreground truncate">{m.name}</span>
                          </div>
                        ))}
                        {members.length > 4 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            +{members.length - 4} more
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="members">
            <Card>
              <CardHeader
                icon={<Server className="h-4 w-4" />}
                title="Member Allocations"
                subtitle="Quarter totals across all categories"
              />
              <div className="px-5 pb-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                      <th className="py-3 px-4 font-medium">Member</th>
                      <th className="py-3 px-3 font-medium">Team</th>
                      <th className="py-3 px-3 font-medium text-right">Support</th>
                      <th className="py-3 px-3 font-medium text-right">Pillars</th>
                      <th className="py-3 px-3 font-medium text-right">Init.</th>
                      <th className="py-3 px-3 font-medium text-right">Tools</th>
                      <th className="py-3 px-3 font-medium text-right">EKS</th>
                      <th className="py-3 px-3 font-medium text-right">Adhoc</th>
                      <th className="py-3 px-3 font-medium text-right">Total</th>
                      <th className="py-3 px-4 font-medium w-36">Utilization</th>
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
                      const barColor = pct > 100 ? "var(--destructive)" : pct > 90 ? "var(--chart-3)" : "var(--chart-2)";
                      return (
                        <tr key={m.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-xl bg-[var(--chart-1)]/10 flex items-center justify-center text-xs font-bold text-[var(--chart-1)]">
                                {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-medium">{m.name}</div>
                                <div className="text-[11px] text-muted-foreground">{m.role}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground text-xs">{m.primaryTeam}</td>
                          <td className="py-3 px-3 text-right">{support}</td>
                          <td className="py-3 px-3 text-right">{pillars}</td>
                          <td className="py-3 px-3 text-right">{init}</td>
                          <td className="py-3 px-3 text-right">{tools}</td>
                          <td className="py-3 px-3 text-right">{eks}</td>
                          <td className="py-3 px-3 text-right">{adhoc}</td>
                          <td className="py-3 px-3 text-right font-semibold">{total}</td>
                          <td className="py-3 px-4 w-36">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                              </div>
                              <span className="text-xs font-medium w-10 text-right tabular-nums">{pct}%</span>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardHeader
                  icon={<Wrench className="h-4 w-4" />}
                  title="Tools Ownership"
                  subtitle="10 tools managed by the SRE team"
                />
                <div className="px-5 pb-5">
                  <div className="grid grid-cols-2 gap-2">
                    {TOOLS.map((t, i) => (
                      <div
                        key={t}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/40 border border-border/60 hover:border-[var(--chart-1)]/30 hover:bg-[var(--chart-1)]/5 transition-all"
                      >
                        <div className="h-8 w-8 rounded-lg bg-[var(--chart-1)]/10 flex items-center justify-center shrink-0">
                          <Zap className="h-4 w-4 text-[var(--chart-1)]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{t}</div>
                          <div className="text-[11px] text-muted-foreground">Tool {i + 1}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader
                  icon={<Server className="h-4 w-4" />}
                  title="Operations Summary"
                  subtitle="EKS admin, tools support & adhoc effort"
                />
                <div className="px-5 pb-5 space-y-4">
                  <SummaryRow
                    icon={<Box className="h-4 w-4" />}
                    label="EKS Administration"
                    value={data.reduce((s, a) => s + a.eksAdmin, 0)}
                    color="var(--chart-5)"
                  />
                  <SummaryRow
                    icon={<Wrench className="h-4 w-4" />}
                    label="Tools Support"
                    value={data.reduce((s, a) => s + a.toolsSupport, 0)}
                    color="var(--chart-4)"
                  />
                  <SummaryRow
                    icon={<AlertTriangle className="h-4 w-4" />}
                    label="Adhoc / Unplanned"
                    value={data.reduce((s, a) => s + a.adhoc, 0)}
                    color="var(--destructive)"
                  />
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Ops Effort</span>
                      <span className="text-2xl font-bold">
                        {data.reduce((s, a) => s + a.eksAdmin + a.toolsSupport + a.adhoc, 0)}
                        <span className="text-sm text-muted-foreground ml-1 font-normal">SP</span>
                      </span>
                    </div>
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

/* ─── components ─── */

function Header({
  quarter, onQuarter, jiraConnected, onConnect,
}: {
  quarter: string; onQuarter: (q: string) => void;
  jiraConnected: boolean; onConnect: () => void;
}) {
  const [token, setToken] = useState("");
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-card/80 backdrop-blur-xl border-b border-border sticky top-0 z-20">
      <div className="mx-auto max-w-[1400px] px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">SRE Capacity Tracker</h1>
            <p className="text-xs text-muted-foreground">Resource allocation & sprint planning</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quarter selector */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors text-sm font-medium"
            >
              {quarter}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-40 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-30">
                {QUARTERS.map((q) => (
                  <button
                    key={q}
                    onClick={() => { onQuarter(q); setMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-muted ${q === quarter ? "bg-primary/10 text-primary font-medium" : ""}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button variant="outline" size="sm" className="rounded-xl font-medium">
            <RefreshCw className="h-4 w-4 mr-2" /> Sync
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className={`rounded-xl font-medium ${
                  jiraConnected
                    ? "bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/25"
                    : ""
                }`}
              >
                <KeyRound className="h-4 w-4 mr-2" />
                {jiraConnected ? "Jira Linked" : "Connect Jira"}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Connect Jira</DialogTitle>
                <DialogDescription>
                  Link your Atlassian account to pull sprint data, story points and labels automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="jira-url">Jira base URL</Label>
                  <Input id="jira-url" className="rounded-xl" placeholder="https://yourorg.atlassian.net" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jira-email">Email</Label>
                  <Input id="jira-email" className="rounded-xl" type="email" placeholder="you@company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jira-token">Personal Access Token</Label>
                  <Input id="jira-token" className="rounded-xl" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ATATT3xFfGF0..." />
                </div>
                <Button className="w-full rounded-xl" onClick={() => { onConnect(); setOpen(false); }}>
                  Save & sync
                </Button>
                <p className="text-xs text-muted-foreground">
                  Token stored locally. Enable Lovable Cloud for secure persistence.
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
  const color =
    tone === "danger" ? "var(--destructive)" :
    tone === "warn" ? "var(--chart-3)" :
    tone === "ok" ? "var(--chart-2)" :
    "var(--foreground)";

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
      </div>
      <div className="mt-3">
        <div className="text-3xl font-bold tracking-tight" style={{ color }}>
          {value}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="px-5 pt-5 pb-3 flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-base">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function SummaryRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/40 border border-border/60">
      <div className="flex items-center gap-3">
        <span style={{ color }}>{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-xl font-bold tabular-nums" style={{ color }}>
        {value}<span className="text-xs text-muted-foreground ml-1 font-normal">SP</span>
      </span>
    </div>
  );
}

function Legend2({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 mb-4">
      {items.map(([label, color]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

function pillarIcon(p: Pillar) {
  const map: Record<Pillar, React.ReactNode> = {
    Cost: <TrendingUp className="h-3.5 w-3.5" />,
    Monitoring: <Activity className="h-3.5 w-3.5" />,
    Security: <Shield className="h-3.5 w-3.5" />,
    AI: <Database className="h-3.5 w-3.5" />,
    Observability: <AlertTriangle className="h-3.5 w-3.5" />,
  };
  return map[p] ?? <Cpu className="h-3.5 w-3.5" />;
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  color: "var(--foreground)",
  fontSize: "12px",
  padding: "8px 12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};
