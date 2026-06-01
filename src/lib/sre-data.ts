// Mock SRE team data — replace with Jira API integration later.

export const TEAM_CONFIG = {
  totalMembers: 15,
  leads: 4,
  supportedTeams: 8,
  pointsPerSprintPerMember: 6, // team support
  initiativePointsPerQuarter: 3, // per member
  sprintsPerQuarter: 6,
  pillarPointsRange: [1, 2] as const,
};

export const PILLARS = ["Cost", "Monitoring", "Security", "AI", "Observability"] as const;
export type Pillar = (typeof PILLARS)[number];

export const TOOLS = [
  "Datadog", "PagerDuty", "Grafana", "Prometheus", "Jenkins",
  "ArgoCD", "Terraform Cloud", "Vault", "Splunk", "New Relic",
];

export type Lead = { id: string; name: string; teams: string[] };
export const LEADS: Lead[] = [
  { id: "L1", name: "Priya Raman", teams: ["Payments", "Checkout"] },
  { id: "L2", name: "Marcus Chen", teams: ["Identity", "Notifications"] },
  { id: "L3", name: "Aisha Okafor", teams: ["Search", "Catalog"] },
  { id: "L4", name: "Diego Alvarez", teams: ["Risk", "Fulfillment"] },
];

export type Member = {
  id: string;
  name: string;
  leadId: string;
  primaryTeam: string;
  role: "Lead" | "SRE";
};

const firstNames = ["Alex","Sam","Jordan","Riya","Kai","Noor","Wei","Lina","Ravi","Mei","Theo","Yuki","Zara","Omar","Ines"];
export const MEMBERS: Member[] = Array.from({ length: 15 }, (_, i) => {
  const lead = LEADS[i % 4];
  return {
    id: `M${i + 1}`,
    name: i < 4 ? lead.name : `${firstNames[i]} ${["K.","R.","M.","T.","S."][i % 5]}`,
    leadId: lead.id,
    primaryTeam: lead.teams[i % 2],
    role: i < 4 ? "Lead" : "SRE",
  };
});

export type SprintAllocation = {
  memberId: string;
  sprint: number; // 1..6
  teamSupport: number;
  pillars: Record<Pillar, number>;
  initiatives: number;
  toolsSupport: number;
  eksAdmin: number;
  adhoc: number;
};

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateQuarterData(quarter: string): SprintAllocation[] {
  const rand = seededRand(quarter.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
  const out: SprintAllocation[] = [];
  for (const m of MEMBERS) {
    for (let s = 1; s <= 6; s++) {
      const pillars = {} as Record<Pillar, number>;
      PILLARS.forEach((p) => (pillars[p] = rand() > 0.5 ? 2 : 1));
      out.push({
        memberId: m.id,
        sprint: s,
        teamSupport: 5 + Math.round(rand() * 3), // ~6 target
        pillars,
        initiatives: Math.round(rand() * 1.5),
        toolsSupport: Math.round(rand() * 2),
        eksAdmin: Math.round(rand() * 2),
        adhoc: Math.round(rand() * 1.5),
      });
    }
  }
  return out;
}

export function totalForAllocation(a: SprintAllocation): number {
  return (
    a.teamSupport +
    Object.values(a.pillars).reduce((x, y) => x + y, 0) +
    a.initiatives +
    a.toolsSupport +
    a.eksAdmin +
    a.adhoc
  );
}

export const SPRINT_CAPACITY_PER_MEMBER = 13; // realistic SP per sprint
export const QUARTERS = ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"];
