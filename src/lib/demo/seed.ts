/**
 * Seed data for demo mode.
 *
 * Everything here lives in the browser only. It is intentionally rich so the
 * demo looks and behaves like a real workspace: people, teams, chats, tasks,
 * meetings, drive files, notifications, reports, audit logs, ...
 */

export const DEMO_USER_ID = "u1";
export const DEMO_ORG_ID = "org1";

const DAY = 24 * 60 * 60 * 1000;

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** date at `dayOffset` days from today, at hh:mm */
const at = (dayOffset: number, hours = 9, minutes = 0) => {
  const d = startOfToday();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

const ago = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

const makeAvatar = (label: string, from: string, to: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#g)"/><text x="64" y="80" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="46" font-weight="700" fill="#ffffff" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const dataUrl = (mime: string, content: string) =>
  `data:${mime};charset=utf-8,${encodeURIComponent(content)}`;

type SeedUser = {
  id: string;
  email: string;
  name: string;
  displayName: string;
  role: string;
  status: string;
  activity: string;
  avatar: string;
  isActive: boolean;
  department: string;
  position: string;
  lastActiveAt: string;
  createdAt: string;
  organizationId: string;
  managerId?: string | null;
};

const user = (
  id: string,
  name: string,
  email: string,
  role: string,
  department: string,
  position: string,
  status: string,
  activity: string,
  colors: [string, string],
  managerId?: string,
): SeedUser => ({
  id,
  email,
  name,
  displayName: name.split(" ")[0],
  role,
  status,
  activity,
  avatar: makeAvatar(
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    colors[0],
    colors[1],
  ),
  isActive: true,
  department,
  position,
  lastActiveAt: status === "offline" ? ago(140) : ago(2),
  createdAt: "2024-02-12T03:00:00.000Z",
  organizationId: DEMO_ORG_ID,
  managerId: managerId ?? null,
});

export function createDemoDb() {
  /* ─────────────────────────── People ─────────────────────────── */
  const users: SeedUser[] = [
    user("u1", "ธีรภัทร์ วัฒนกุล", "demo@siamdigital.co.th", "org_owner", "Engineering", "CTO", "online", "Available", ["#2563eb", "#7c3aed"]),
    user("u2", "กัญญา ศรีสุข", "kanya@siamdigital.co.th", "admin", "Project Management", "Project Manager", "online", "In a meeting", ["#db2777", "#f97316"], "u1"),
    user("u3", "ภูวดล จิรากุล", "phuwadon@siamdigital.co.th", "manager", "Engineering", "Technical Lead", "busy", "Deep work", ["#0891b2", "#2563eb"], "u1"),
    user("u4", "อริษา เทควงศ์", "arisa@siamdigital.co.th", "manager", "Design & UX", "Design Director", "away", "On break", ["#7c3aed", "#ec4899"], "u1"),
    user("u5", "ณัฐพงษ์ ประภาษ", "nattapong@siamdigital.co.th", "employee", "Engineering", "Senior Frontend Developer", "online", "Available", ["#0d9488", "#22c55e"], "u3"),
    user("u6", "พัชรา ลิ้มวงศ์", "patchara@siamdigital.co.th", "employee", "Engineering", "Backend Developer", "online", "Available", ["#4f46e5", "#06b6d4"], "u3"),
    user("u7", "ธนกฤต มั่นคง", "thanakrit@siamdigital.co.th", "employee", "Product", "Business Analyst", "offline", "Offline", ["#b45309", "#f59e0b"], "u2"),
    user("u8", "พิมพ์ชนก รัตน์", "pimchanok@siamdigital.co.th", "employee", "QA", "QA Engineer", "online", "Available", ["#be123c", "#fb7185"], "u3"),
    user("u9", "วิภา สุขสันต์", "wipa@siamdigital.co.th", "employee", "Design & UX", "UI Designer", "online", "Available", ["#9333ea", "#6366f1"], "u4"),
    user("u10", "ธีรพงษ์ แก้วใส", "teerapong@siamdigital.co.th", "employee", "Engineering", "Frontend Developer", "away", "Lunch", ["#1d4ed8", "#0ea5e9"], "u3"),
    user("u11", "สุดาวรรณ พงษ์ไพบูลย์", "sudawan@siamdigital.co.th", "employee", "Product", "Product Owner", "busy", "In a meeting", ["#c026d3", "#f43f5e"], "u2"),
    user("u12", "อนันต์ ชัยมงคล", "anan@siamdigital.co.th", "employee", "DevOps & Infrastructure", "DevOps Engineer", "online", "Available", ["#047857", "#14b8a6"], "u3"),
  ];

  const byId = Object.fromEntries(users.map((u) => [u.id, u]));

  /* ─────────────────────────── Teams ─────────────────────────── */
  const teamMembers = (teamId: string, rows: Array<[string, string]>) =>
    rows.map(([userId, role], i) => ({
      id: `tm-${teamId}-${userId}`,
      teamId,
      userId,
      role,
      createdAt: "2024-03-01T02:00:00.000Z",
      user: byId[userId],
      index: i,
    }));

  const teams = [
    {
      id: "team-platform",
      name: "Platform Team",
      description: "Backend, infrastructure, and developer experience",
      organizationId: DEMO_ORG_ID,
      createdAt: "2024-03-01T02:00:00.000Z",
      updatedAt: "2026-01-12T08:30:00.000Z",
      members: teamMembers("team-platform", [
        ["u3", "admin"],
        ["u6", "lead"],
        ["u5", "member"],
        ["u12", "member"],
        ["u8", "member"],
        ["u1", "member"],
      ]),
    },
    {
      id: "team-product",
      name: "Product Team",
      description: "Web app, mobile app, and product discovery",
      organizationId: DEMO_ORG_ID,
      createdAt: "2024-03-04T02:00:00.000Z",
      updatedAt: "2026-02-02T04:20:00.000Z",
      members: teamMembers("team-product", [
        ["u2", "admin"],
        ["u11", "lead"],
        ["u10", "member"],
        ["u7", "member"],
        ["u1", "member"],
      ]),
    },
    {
      id: "team-design",
      name: "Design Team",
      description: "UX research, design system, and brand",
      organizationId: DEMO_ORG_ID,
      createdAt: "2024-03-08T02:00:00.000Z",
      updatedAt: "2026-02-18T10:10:00.000Z",
      members: teamMembers("team-design", [
        ["u4", "admin"],
        ["u9", "lead"],
        ["u11", "member"],
        ["u2", "member"],
        ["u1", "member"],
      ]),
    },
  ];

  /* ─────────────────────────── Project metadata ─────────────────────────── */
  const projects = [
    { id: "proj-plat", key: "PLAT", name: "Platform Core", color: "#3B82F6", teamId: "team-platform" },
    { id: "proj-prod", key: "PROD", name: "Product Portal", color: "#10B981", teamId: "team-product" },
    { id: "proj-dsgn", key: "DSGN", name: "Design System", color: "#8B5CF6", teamId: "team-design" },
  ];
  const epics = [
    { id: "epic-plat", name: "Platform MVP", color: "#3B82F6", status: "active", teamId: "team-platform" },
    { id: "epic-prod", name: "Customer Portal v2", color: "#10B981", status: "active", teamId: "team-product" },
    { id: "epic-dsgn", name: "Design System 2026", color: "#8B5CF6", status: "active", teamId: "team-design" },
  ];
  const sprints = [
    { id: "sprint-plat", name: "Platform Sprint 12", status: "active", teamId: "team-platform", startDate: at(-4, 9), endDate: at(6, 18), goal: "Ship the new API gateway" },
    { id: "sprint-prod", name: "Product Sprint 12", status: "active", teamId: "team-product", startDate: at(-4, 9), endDate: at(6, 18), goal: "Finish onboarding revamp" },
    { id: "sprint-dsgn", name: "Design Sprint 12", status: "active", teamId: "team-design", startDate: at(-4, 9), endDate: at(6, 18), goal: "Publish v2 tokens" },
  ];
  const components = [
    { id: "comp-plat", name: "API Gateway", teamId: "team-platform" },
    { id: "comp-prod", name: "Web App", teamId: "team-product" },
    { id: "comp-dsgn", name: "Design Tokens", teamId: "team-design" },
  ];
  const versions = [
    { id: "ver-plat", name: "v2.4.0", released: false, teamId: "team-platform" },
    { id: "ver-prod", name: "v3.0.0", released: false, teamId: "team-product" },
    { id: "ver-dsgn", name: "v1.8.0", released: true, teamId: "team-design" },
  ];

  /* ─────────────────────────── Channels ─────────────────────────── */
  const channelDefs = [
    ["ch-general", "general", "general", "Company-wide announcements and watercooler chat", "team-product"],
    ["ch-platform", "platform", "general", "Platform engineering discussion", "team-platform"],
    ["ch-product", "product", "general", "Product discovery and delivery", "team-product"],
    ["ch-design", "design", "general", "Design critiques and design system updates", "team-design"],
    ["ch-announce", "announcements", "announcement", "Official company announcements", "team-product"],
  ] as const;

  const channels = channelDefs.map(([id, name, type, description, teamId]) => ({
    id,
    name,
    type,
    description,
    teamId,
    createdAt: "2024-03-10T02:00:00.000Z",
    updatedAt: "2026-02-20T07:00:00.000Z",
    team: { id: teamId, name: teams.find((t) => t.id === teamId)!.name },
  }));

  /* ─────────────────────────── Messages ─────────────────────────── */
  let msgSeq = 0;
  const message = (
    channelId: string,
    senderId: string,
    text: string,
    minutesAgo: number,
    extra: Record<string, any> = {},
  ) => {
    msgSeq += 1;
    return {
      id: `msg-${msgSeq}`,
      channelId,
      senderId,
      text,
      isPinned: false,
      isSystem: false,
      createdAt: ago(minutesAgo),
      updatedAt: ago(minutesAgo),
      reactions: [] as Array<{ emoji: string; userId: string }>,
      ...extra,
    };
  };

  const messages = [
    message("ch-general", "u2", "อรุณสวัสดิ์ทุกคน ☀️ วันนี้มี all-hands ตอน 16:00 นะคะ", 320, {
      reactions: [
        { emoji: "👍", userId: "u5" },
        { emoji: "👍", userId: "u9" },
        { emoji: "🎉", userId: "u3" },
      ],
    }),
    message("ch-general", "u4", "รับทราบค่ะ! เดี๋ยว design team สรุป progress ก่อนประชุมนะคะ", 300),
    message("ch-general", "u1", "ขอบคุณครับ ฝากทุกทีมอัปเดต sprint status ใน Board ก่อน 15:30 ด้วยนะ", 280, { isPinned: true }),
    message("ch-general", "u12", "Deploy รอบล่าสุดเสร็จแล้วครับ uptime 100% 🚀", 120),
    message("ch-platform", "u6", "API gateway migration is ready for review — PR #482", 260),
    message("ch-platform", "u3", "Nice. Let's check the rate-limit edge cases before we merge.", 250, {
      reactions: [{ emoji: "👀", userId: "u5" }],
    }),
    message("ch-platform", "u5", "Frontend already points at the new gateway in staging, works fine on my side.", 200),
    message("ch-platform", "u8", "QA passed 42/44 cases. Two failures are the known timezone flakes.", 95),
    message("ch-product", "u11", "Onboarding flow v2 is live in staging! Please try it and leave notes 🧪", 210, {
      reactions: [
        { emoji: "🎉", userId: "u2" },
        { emoji: "❤️", userId: "u9" },
      ],
    }),
    message("ch-product", "u2", "Loving the new empty states. The invite step is much clearer now.", 180),
    message("ch-product", "u10", "Fixed the mobile keyboard overlap issue, pushing a build shortly.", 60),
    message("ch-design", "u9", "Uploaded the v2 tokens to the shared drive. Colors + spacing are final.", 240),
    message("ch-design", "u4", "Beautiful work. Let's present the component audit at Friday's critique.", 220),
    message("ch-design", "u11", "Can we get one more pass on the date picker? It still feels a bit heavy.", 45),
    message("ch-announce", "u1", "📢 Team Connect 3.0 rollout starts next Monday. Training sessions are on the calendar.", 1440, { isPinned: true }),
    message("ch-announce", "u2", "Songkran holiday: office closed April 13–15. Enjoy the long weekend! 🌸", 2880),
  ];

  const dm = [
    { id: "dm1", senderId: "u2", receiverId: "u1", text: "พี่ครับ พรุ่งนี้ขอเลื่อน sync เป็น 11:00 ได้ไหมคะ?", createdAt: ago(180) },
    { id: "dm2", senderId: "u1", receiverId: "u2", text: "ได้เลยครับ เดี๋ยวผมแก้ invite ให้", createdAt: ago(176) },
    { id: "dm3", senderId: "u2", receiverId: "u1", text: "ขอบคุณค่ะ 🙏", createdAt: ago(175) },
    { id: "dm4", senderId: "u5", receiverId: "u1", text: "พี่ครับ ผม push fix ให้แล้วนะครับ รบกวน review ด้วยครับ", createdAt: ago(70), attachments: [] },
    { id: "dm5", senderId: "u1", receiverId: "u5", text: "รับทราบ เดี๋ยวเข้าไปดูให้ครับ", createdAt: ago(64) },
    { id: "dm6", senderId: "u9", receiverId: "u1", text: "Sent you the final icon set for the sidebar ✨", createdAt: ago(35) },
  ];

  /* ─────────────────────────── Tasks ─────────────────────────── */
  const taskRows: Array<Record<string, any>> = [
    ["Implement SSO with Google Workspace", "Add OAuth2 / OIDC login for Google Workspace accounts, including domain restriction.", "high", "in_progress", "story", "team-platform", "u6", "u3", -2, ["auth", "backend"]],
    ["Rate limit the public API", "Add per-token rate limiting and useful 429 responses with Retry-After.", "urgent", "in_progress", "task", "team-platform", "u12", "u3", 1, ["api", "security"]],
    ["Fix timezone flake in meeting reminders", "Reminders occasionally fire 1 hour early for Asia/Bangkok users.", "high", "review", "bug", "team-platform", "u8", "u3", 2, ["bug", "timezone"]],
    ["Upgrade Prisma to latest minor", "Bump Prisma client + CLI and verify migrations on staging.", "low", "todo", "task", "team-platform", "u6", "u3", 9, ["chore"]],
    ["Add observability dashboards", "Create Grafana dashboards for p95 latency, error rate, and queue depth.", "medium", "todo", "task", "team-platform", "u12", "u3", 12, ["infra"]],
    ["Onboarding checklist empty state", "Design a friendly empty state with a sample checklist for new workspaces.", "medium", "review", "story", "team-product", "u9", "u11", -1, ["design", "onboarding"]],
    ["Mobile keyboard hides composer", "The message composer is covered by the keyboard on iOS Safari.", "urgent", "in_progress", "bug", "team-product", "u10", "u11", 1, ["mobile", "bug"]],
    ["Export tasks to CSV", "Let project managers export the current task board to CSV with filters applied.", "medium", "todo", "story", "team-product", "u10", "u11", 7, ["feature"]],
    ["Improve invite acceptance flow", "Reduce the invite flow from four screens to two and add resend.", "high", "todo", "story", "team-product", "u11", "u2", 5, ["ux"]],
    ["Add command palette shortcuts", "Support ⌘K, ⌘⇧M and ⌘⇧T for quick navigation.", "low", "done", "task", "team-product", "u5", "u11", -6, ["frontend"]],
    ["Design system: color tokens v2", "Publish semantic color tokens with light/dark variants and migration notes.", "high", "in_progress", "story", "team-design", "u9", "u4", 3, ["design-system"]],
    ["Component audit for accessibility", "Audit 24 core components against WCAG 2.2 AA and log gaps.", "medium", "review", "task", "team-design", "u4", "u4", 4, ["a11y"]],
    ["Refresh date picker visuals", "Lighter borders, calmer hover states, better keyboard focus.", "low", "todo", "task", "team-design", "u9", "u4", 8, ["design"]],
    ["Brand illustration pack", "Create 8 spot illustrations for empty states and onboarding.", "medium", "done", "task", "team-design", "u4", "u4", -10, ["brand"]],
    ["Document incident response runbook", "Write the on-call runbook and link it from the wiki.", "high", "done", "task", "team-platform", "u12", "u3", -8, ["docs"]],
    ["Set up staging seed script", "One command to reset staging with realistic demo data.", "medium", "done", "task", "team-platform", "u6", "u3", -12, ["tooling"]],
    ["Sprint retro notes", "Collect retro notes and action items from the last sprint.", "low", "todo", "task", "team-product", "u2", "u2", 6, ["process"]],
    ["Meeting minutes automation", "Generate a first draft of minutes from the meeting chat transcript.", "high", "todo", "story", "team-platform", "u6", "u1", 14, ["ai", "meetings"]],
  ];

  const taskIdByTitle = new Map<string, string>();
  const tasks = taskRows.map((row, i) => {
    const [title, description, priority, status, issueType, teamId, assigneeId, reporterId, dueOffset, tags] = row as [
      string, string, string, string, string, string, string, string, number, string[],
    ];
    const team = teams.find((t) => t.id === teamId)!;
    const id = `task-${i + 1}`;
    taskIdByTitle.set(title, id);
    const project = projects.find((p) => p.teamId === teamId)!;
    const epic = epics.find((e) => e.teamId === teamId)!;
    const sprint = sprints.find((s) => s.teamId === teamId)!;
    const component = components.find((c) => c.teamId === teamId)!;
    const version = versions.find((v) => v.teamId === teamId)!;
    const createdOffset = Math.min(-1, dueOffset - 10);
    const subtasks =
      i % 3 === 0
        ? [
            { id: `sub-${id}-1`, taskId: id, title: "Write the technical spec", isCompleted: true, position: 0 },
            { id: `sub-${id}-2`, taskId: id, title: "Implement the happy path", isCompleted: status === "done", position: 1 },
            { id: `sub-${id}-3`, taskId: id, title: "Add tests and docs", isCompleted: false, position: 2 },
          ]
        : [];
    const comments =
      i % 4 === 0
        ? [
            {
              id: `comment-${id}-1`,
              taskId: id,
              userId: "u3",
              text: "Left a few notes in the PR — mostly naming and one edge case.",
              createdAt: ago(200 + i * 3),
              updatedAt: ago(200 + i * 3),
            },
            {
              id: `comment-${id}-2`,
              taskId: id,
              userId: assigneeId,
              text: "Thanks! Addressed both, ready for another look.",
              createdAt: ago(120 + i * 2),
              updatedAt: ago(120 + i * 2),
            },
          ]
        : [];
    return {
      id,
      title,
      description,
      priority,
      status,
      issueType,
      resolution: status === "done" ? "done" : null,
      dueDate: at(dueOffset, 18),
      tags,
      storyPoints: [2, 3, 5, 8][i % 4],
      estimate: [2, 4, 6, 8][i % 4],
      position: i,
      createdAt: at(createdOffset, 10),
      updatedAt: ago(30 + i * 7),
      assigneeId,
      reporterId,
      teamId,
      meetingId: null,
      sprintId: sprint.id,
      epicId: epic.id,
      projectId: project.id,
      componentId: component.id,
      versionId: version.id,
      parentTaskId: null,
      isRecurring: false,
      recurringPattern: null,
      recurringInterval: 1,
      recurringEndDate: null,
      subtasks,
      comments,
      activityLog: [
        { id: `act-${id}-1`, taskId: id, action: "created", oldValue: null, newValue: null, userId: reporterId, createdAt: at(createdOffset, 10) },
        ...(status !== "todo"
          ? [{ id: `act-${id}-2`, taskId: id, action: "status_changed", oldValue: "todo", newValue: status, userId: assigneeId, createdAt: ago(500 + i * 10) }]
          : []),
        ...(status === "done"
          ? [{ id: `act-${id}-3`, taskId: id, action: "status_changed", oldValue: "review", newValue: "done", userId: assigneeId, createdAt: ago(80 + i * 3) }]
          : []),
      ],
      attachments:
        i % 5 === 0
          ? [
              {
                id: `att-${id}-1`,
                taskId: id,
                userId: assigneeId,
                name: "requirements.md",
                url: dataUrl("text/markdown", `# ${title}\n\nAcceptance criteria and notes for this task.\n`),
                mimeType: "text/markdown",
                size: 1840,
                createdAt: ago(300),
              },
            ]
          : [],
      watchers:
        i % 2 === 0
          ? [
              { id: `watch-${id}-1`, taskId: id, userId: "u1", createdAt: ago(400) },
              { id: `watch-${id}-2`, taskId: id, userId: reporterId, createdAt: ago(400) },
            ]
          : [],
      links: [],
      teamName: team.name,
    };
  });

  // A couple of issue links between tasks
  tasks[0].links = [
    { id: "link-1", type: "blocks", sourceId: tasks[0].id, targetId: tasks[1].id, createdAt: ago(600) },
  ];
  tasks[1].links = [
    { id: "link-1", type: "blocks", sourceId: tasks[0].id, targetId: tasks[1].id, createdAt: ago(600) },
  ];

  const taskTemplates = [
    {
      id: "tpl-bug",
      name: "Bug report",
      title: "Bug: ",
      description: "Steps to reproduce, expected behaviour, actual behaviour",
      content: "## Steps to reproduce\n1. \n\n## Expected\n\n## Actual\n",
      priority: "high",
      issueType: "bug",
      tags: ["bug"],
      storyPoints: 3,
      estimate: 4,
      teamId: "team-platform",
      createdById: "u3",
      createdAt: "2025-10-02T04:00:00.000Z",
      updatedAt: "2025-10-02T04:00:00.000Z",
    },
    {
      id: "tpl-story",
      name: "User story",
      title: "As a user, I want to ",
      description: "So that",
      content: "## Context\n\n## Acceptance criteria\n- [ ] \n",
      priority: "medium",
      issueType: "story",
      tags: ["story"],
      storyPoints: 5,
      estimate: 8,
      teamId: "team-product",
      createdById: "u11",
      createdAt: "2025-10-02T04:00:00.000Z",
      updatedAt: "2025-10-02T04:00:00.000Z",
    },
    {
      id: "tpl-design",
      name: "Design task",
      title: "Design: ",
      description: "Figma link, states, and edge cases",
      content: "## Deliverables\n- [ ] Desktop\n- [ ] Mobile\n- [ ] Empty state\n",
      priority: "medium",
      issueType: "task",
      tags: ["design"],
      storyPoints: 3,
      estimate: 6,
      teamId: "team-design",
      createdById: "u4",
      createdAt: "2025-10-02T04:00:00.000Z",
      updatedAt: "2025-10-02T04:00:00.000Z",
    },
  ];

  /* ─────────────────────────── Meetings ─────────────────────────── */
  const participant = (meetingId: string, userId: string, role = "participant") => ({
    id: `mp-${meetingId}-${userId}`,
    meetingId,
    userId,
    role,
    joinedAt: ago(40),
    leftAt: null,
    duration: null,
    handRaised: false,
    isMuted: true,
    isVideoOn: false,
    isSharing: false,
    user: byId[userId],
  });

  const meetings = [
    {
      id: "meet-standup",
      title: "Daily Standup",
      description: "Quick sync across the platform squad",
      startTime: at(0, 9, 30),
      endTime: at(0, 9, 45),
      meetingCode: "standup-001",
      isInstant: false,
      allowScreenShare: true,
      status: "ended",
      actualStartTime: at(0, 9, 30),
      actualEndTime: at(0, 9, 46),
      createdAt: at(-3, 9),
      updatedAt: at(0, 9, 46),
      teamId: "team-platform",
      hostId: "u3",
      isRecurring: true,
      recurringPattern: "daily",
      participants: [participant("meet-standup", "u3", "host"), participant("meet-standup", "u6"), participant("meet-standup", "u5"), participant("meet-standup", "u8")],
    },
    {
      id: "meet-allhands",
      title: "Company All-Hands",
      description: "Quarterly update, roadmap, and Q&A",
      startTime: at(0, 16, 0),
      endTime: at(0, 17, 0),
      meetingCode: "allhands-03",
      isInstant: false,
      allowScreenShare: true,
      status: "scheduled",
      createdAt: at(-5, 11),
      updatedAt: at(-1, 15),
      teamId: "team-product",
      hostId: "u1",
      isRecurring: false,
      participants: [
        participant("meet-allhands", "u1", "host"),
        participant("meet-allhands", "u2"),
        participant("meet-allhands", "u3"),
        participant("meet-allhands", "u4"),
        participant("meet-allhands", "u5"),
        participant("meet-allhands", "u6"),
        participant("meet-allhands", "u9"),
        participant("meet-allhands", "u11"),
      ],
    },
    {
      id: "meet-design",
      title: "Design Critique",
      description: "Review the new onboarding illustrations and date picker",
      startTime: at(1, 10, 0),
      endTime: at(1, 11, 0),
      meetingCode: "design-001",
      isInstant: false,
      allowScreenShare: true,
      status: "scheduled",
      createdAt: at(-2, 10),
      updatedAt: at(-1, 8),
      teamId: "team-design",
      hostId: "u4",
      isRecurring: true,
      recurringPattern: "weekly",
      participants: [participant("meet-design", "u4", "host"), participant("meet-design", "u9"), participant("meet-design", "u11"), participant("meet-design", "u1")],
    },
    {
      id: "meet-sprint",
      title: "Sprint Planning",
      description: "Plan Sprint 13 and confirm capacity",
      startTime: at(2, 14, 0),
      endTime: at(2, 15, 30),
      meetingCode: "plan-013",
      isInstant: false,
      allowScreenShare: true,
      status: "scheduled",
      createdAt: at(-1, 12),
      updatedAt: at(-1, 12),
      teamId: "team-platform",
      hostId: "u3",
      isRecurring: false,
      participants: [participant("meet-sprint", "u3", "host"), participant("meet-sprint", "u6"), participant("meet-sprint", "u8"), participant("meet-sprint", "u12")],
    },
    {
      id: "meet-onboarding",
      title: "Onboarding Walkthrough",
      description: "Walk the team through the new invite flow",
      startTime: at(3, 11, 0),
      endTime: at(3, 11, 45),
      meetingCode: "onboard-77",
      isInstant: false,
      allowScreenShare: true,
      status: "scheduled",
      createdAt: at(-1, 16),
      updatedAt: at(-1, 16),
      teamId: "team-product",
      hostId: "u11",
      isRecurring: false,
      participants: [participant("meet-onboarding", "u11", "host"), participant("meet-onboarding", "u10"), participant("meet-onboarding", "u2")],
    },
    {
      id: "meet-retro",
      title: "Sprint Retro",
      description: "What went well, what to improve",
      startTime: at(-2, 15, 0),
      endTime: at(-2, 16, 0),
      meetingCode: "retro-11",
      isInstant: false,
      allowScreenShare: true,
      status: "ended",
      createdAt: at(-8, 9),
      updatedAt: at(-2, 16),
      teamId: "team-product",
      hostId: "u2",
      isRecurring: true,
      recurringPattern: "weekly",
      participants: [participant("meet-retro", "u2", "host"), participant("meet-retro", "u11"), participant("meet-retro", "u10"), participant("meet-retro", "u9")],
    },
    {
      id: "meet-live",
      title: "Quick Huddle — Release check",
      description: "Final release readiness check",
      startTime: at(0, new Date().getHours(), 0),
      endTime: at(0, 23, 59),
      meetingCode: "huddle-live",
      isInstant: true,
      allowScreenShare: true,
      status: "live",
      createdAt: ago(55),
      updatedAt: ago(55),
      teamId: "team-platform",
      hostId: "u12",
      isRecurring: false,
      participants: [participant("meet-live", "u12", "host"), participant("meet-live", "u6"), participant("meet-live", "u8")],
    },
  ].map((m) => ({
    ...m,
    team: m.teamId ? { id: m.teamId, name: teams.find((t) => t.id === m.teamId)!.name } : null,
    host: byId[m.hostId],
  }));

  const meetingMinutes = [
    {
      id: "minutes-1",
      meetingId: "meet-retro",
      title: "Minutes: Sprint Retro",
      content:
        "## What went well\n- Release train stayed on schedule\n- QA caught two regressions early\n\n## What to improve\n- Ticket hand-offs between design and frontend\n- Add a checklist to PRs\n",
      actionItems: [
        { id: "ai-1", task: "Add a PR checklist to the repo template", assigneeId: "u6", assigneeName: "พัชรา ลิ้มวงศ์", dueDate: at(3, 18), completed: false },
        { id: "ai-2", task: "Schedule a design/frontend hand-off workshop", assigneeId: "u4", assigneeName: "อริษา เทควงศ์", dueDate: at(5, 12), completed: false },
      ],
      decisions: [
        "Move code freeze to Wednesday 18:00",
        "Rotate release captain each sprint",
      ],
      attendees: ["u2", "u11", "u10", "u9"],
      createdBy: "u2",
      createdAt: at(-2, 16, 20),
      updatedAt: at(-2, 16, 20),
    },
  ];

  /* ─────────────────────────── Notifications ─────────────────────────── */
  const notifications = [
    {
      id: "notif-1",
      userId: DEMO_USER_ID,
      type: "mention",
      title: "Nattapong mentioned you",
      message: "พี่ครับ ผม push fix ให้แล้วนะครับ รบกวน review ด้วยครับ",
      link: "/chat",
      read: false,
      priority: "high",
      groupedId: null,
      relatedId: "msg-7",
      relatedType: "message",
      createdAt: ago(12),
      updatedAt: ago(12),
    },
    {
      id: "notif-2",
      userId: DEMO_USER_ID,
      type: "task_assigned",
      title: "New task assigned to you",
      message: "Meeting minutes automation — due in 14 days",
      link: "/tasks",
      read: false,
      priority: "normal",
      groupedId: "task-digest",
      relatedId: "task-18",
      relatedType: "task",
      createdAt: ago(48),
      updatedAt: ago(48),
    },
    {
      id: "notif-3",
      userId: DEMO_USER_ID,
      type: "meeting_starting",
      title: "Company All-Hands starts at 16:00",
      message: "Hosted by ธีรภัทร์ วัฒนกุล · 8 participants",
      link: "/meetings",
      read: false,
      priority: "high",
      groupedId: null,
      relatedId: "meet-allhands",
      relatedType: "meeting",
      createdAt: ago(60),
      updatedAt: ago(60),
    },
    {
      id: "notif-4",
      userId: DEMO_USER_ID,
      type: "message",
      title: "3 new messages in #platform",
      message: "QA passed 42/44 cases. Two failures are the known timezone flakes.",
      link: "/chat",
      read: true,
      priority: "normal",
      groupedId: "platform-digest",
      relatedId: null,
      relatedType: "channel",
      createdAt: ago(95),
      updatedAt: ago(95),
    },
    {
      id: "notif-5",
      userId: DEMO_USER_ID,
      type: "announcement",
      title: "New announcement: Team Connect 3.0 rollout",
      message: "Rollout starts next Monday. Training sessions are on the calendar.",
      link: "/announcements",
      read: true,
      priority: "normal",
      groupedId: null,
      relatedId: "ann-1",
      relatedType: "announcement",
      createdAt: ago(1440),
      updatedAt: ago(1440),
    },
    {
      id: "notif-6",
      userId: DEMO_USER_ID,
      type: "task_update",
      title: "Arisa moved a task to review",
      message: "Onboarding checklist empty state is ready for review",
      link: "/tasks",
      read: true,
      priority: "low",
      groupedId: null,
      relatedId: "task-6",
      relatedType: "task",
      createdAt: ago(300),
      updatedAt: ago(300),
    },
  ];

  const notificationPreferences = {
    userId: DEMO_USER_ID,
    mentionDelivery: "realtime",
    taskAssignedDelivery: "realtime",
    meetingStartingDelivery: "realtime",
    pullRequestReviewDelivery: "realtime",
    taskUpdateDelivery: "digest_hourly",
    meetingCreatedDelivery: "digest_hourly",
    messageDelivery: "digest_hourly",
    announcementDelivery: "digest_daily",
    teamUpdateDelivery: "digest_daily",
    digestTime: "18:00",
    digestTimezone: "Asia/Bangkok",
    digestIncludeRead: false,
    soundEnabled: true,
    desktopEnabled: true,
    badgeEnabled: true,
  };

  const notificationDigests = [
    {
      id: "digest-1",
      userId: DEMO_USER_ID,
      digestType: "daily",
      periodStart: at(-1, 0),
      periodEnd: at(0, 0),
      totalCount: 7,
      unreadCount: 3,
      byType: { mention: 2, task_assigned: 2, meeting_starting: 1, announcement: 1, message: 1 },
      highlights: [
        { title: "Nattapong mentioned you", message: "PR review requested", link: "/chat" },
        { title: "Company All-Hands at 16:00", message: "Quarterly update and Q&A", link: "/meetings" },
      ],
      notificationIds: ["notif-1", "notif-2", "notif-3"],
      sentAt: at(0, 8),
      readAt: null,
      isRead: false,
      createdAt: at(0, 8),
      updatedAt: at(0, 8),
    },
  ];

  /* ─────────────────────────── Reminders ─────────────────────────── */
  const reminders = [
    {
      id: "rem-1",
      title: "Review PR #482 — API gateway migration",
      description: "Check rate-limit edge cases before approving",
      type: "task",
      remindAt: at(0, 15, 0),
      isSent: false,
      createdBy: DEMO_USER_ID,
      createdAt: at(-1, 10),
      recipients: [{ id: "rr-1", userId: DEMO_USER_ID, isRead: false, readAt: null, user: byId[DEMO_USER_ID] }],
    },
    {
      id: "rem-2",
      title: "Prepare all-hands slides",
      description: "Roadmap slide + Q3 highlights",
      type: "meeting",
      remindAt: at(0, 14, 30),
      isSent: false,
      createdBy: DEMO_USER_ID,
      createdAt: at(-1, 9),
      recipients: [
        { id: "rr-2", userId: DEMO_USER_ID, isRead: false, readAt: null, user: byId[DEMO_USER_ID] },
        { id: "rr-3", userId: "u2", isRead: true, readAt: ago(30), user: byId.u2 },
      ],
    },
    {
      id: "rem-3",
      title: "Send design tokens to frontend",
      description: "Link the v2 token JSON in #design",
      type: "custom",
      remindAt: at(1, 10, 0),
      isSent: false,
      createdBy: "u4",
      createdAt: at(-2, 16),
      recipients: [{ id: "rr-4", userId: DEMO_USER_ID, isRead: false, readAt: null, user: byId[DEMO_USER_ID] }],
    },
    {
      id: "rem-4",
      title: "Weekly review",
      description: "Review progress and plan the next week",
      type: "general",
      remindAt: at(2, 17, 0),
      isSent: false,
      createdBy: DEMO_USER_ID,
      createdAt: at(-4, 11),
      recipients: [{ id: "rr-5", userId: DEMO_USER_ID, isRead: false, readAt: null, user: byId[DEMO_USER_ID] }],
    },
    {
      id: "rem-5",
      title: "Renew staging SSL certificate",
      description: "Expires in 3 days",
      type: "custom",
      remindAt: at(-1, 9, 0),
      isSent: true,
      createdBy: DEMO_USER_ID,
      createdAt: at(-9, 9),
      recipients: [{ id: "rr-6", userId: DEMO_USER_ID, isRead: true, readAt: at(-1, 9, 10), user: byId[DEMO_USER_ID] }],
    },
  ];

  /* ─────────────────────────── Shared drive ─────────────────────────── */
  const driveFile = (
    id: string,
    name: string,
    teamId: string,
    path: string,
    mime: string,
    content: string,
    updatedOffset: number,
  ) => ({
    id,
    name,
    path,
    isFolder: false,
    teamId,
    createdById: DEMO_USER_ID,
    createdAt: at(updatedOffset - 12, 10),
    updatedAt: at(updatedOffset, 12),
    versions: [
      {
        id: `${id}-v2`,
        entryId: id,
        version: 2,
        storageKey: `${id}-v2`,
        mimeType: mime,
        size: content.length,
        url: dataUrl(mime, content),
        createdAt: at(updatedOffset, 12),
        createdBy: byId[DEMO_USER_ID],
      },
      {
        id: `${id}-v1`,
        entryId: id,
        version: 1,
        storageKey: `${id}-v1`,
        mimeType: mime,
        size: content.length + 40,
        url: dataUrl(mime, content),
        createdAt: at(updatedOffset - 12, 10),
        createdBy: byId[DEMO_USER_ID],
      },
    ],
    permissions: [],
  });

  const driveEntries = [
    ...["team-platform", "team-product", "team-design"].map((teamId, i) => ({
      id: `folder-docs-${i}`,
      name: "Documents",
      path: "/",
      isFolder: true,
      teamId,
      createdById: DEMO_USER_ID,
      createdAt: at(-40, 9),
      updatedAt: at(-5, 9),
      versions: [],
      permissions: [],
    })),
    ...["team-platform", "team-product", "team-design"].map((teamId, i) => ({
      id: `folder-design-${i}`,
      name: "Design Assets",
      path: "/",
      isFolder: true,
      teamId,
      createdById: "u4",
      createdAt: at(-30, 9),
      updatedAt: at(-3, 9),
      versions: [],
      permissions: [],
    })),
    driveFile(
      "file-roadmap",
      "2026-roadmap.md",
      "team-product",
      "/Documents",
      "text/markdown",
      `# 2026 Roadmap\n\n## Q1\n- Team Connect 3.0\n- Design tokens v2\n\n## Q2\n- AI meeting minutes\n- Public API beta\n\n## Q3\n- Mobile app GA\n`,
      -2,
    ),
    driveFile(
      "file-tokens",
      "design-tokens-v2.json",
      "team-design",
      "/Design Assets",
      "application/json",
      JSON.stringify({ color: { brand: "#2563eb", success: "#10b981", danger: "#ef4444" }, radius: { sm: 6, md: 10, lg: 16 } }, null, 2),
      -1,
    ),
    driveFile(
      "file-release-notes",
      "release-notes-3.0.md",
      "team-platform",
      "/Documents",
      "text/markdown",
      `# Team Connect 3.0\n\n- New onboarding flow\n- Faster chat history\n- Meeting minutes automation\n- 42 bug fixes\n`,
      -1,
    ),
    driveFile(
      "file-budget",
      "q3-budget.csv",
      "team-product",
      "/Documents",
      "text/csv",
      "category,planned,actual\nInfrastructure,12000,11480\nDesign tools,3200,2980\nContractors,9000,9000\n",
      -6,
    ),
  ];

  /* ─────────────────────────── Wiki ─────────────────────────── */
  const wikiArticles = [
    {
      id: "wiki-1",
      title: "Engineering onboarding guide",
      content: `# Engineering onboarding\n\nWelcome aboard! This guide gets you from zero to your first merged PR.\n\n## Day 1\n1. Get access to GitHub and staging\n2. Clone the repo and run \`npm install\`\n3. Join #platform in chat\n\n## Week 1\n- Pair with your buddy on a starter task\n- Read the architecture overview in /wiki\n- Ship one small fix\n\n> Tip: use the command palette (⌘K) to move around the app quickly.\n`,
      category: "Engineering",
      tags: ["onboarding", "engineering"],
      isPublic: true,
      teamId: "team-platform",
      createdBy: "u3",
      version: 3,
      viewCount: 184,
      createdAt: at(-90, 10),
      updatedAt: at(-12, 10),
    },
    {
      id: "wiki-2",
      title: "Design system v2 — migration notes",
      content: `# Design System v2\n\n## What changed\n- Semantic color tokens (surface, muted, accent)\n- 4px spacing scale\n- New focus ring with 3:1 contrast\n\n## Migration\nReplace \`bg-gray-*\` with \`bg-surface-*\` and \`text-gray-*\` with \`text-muted-foreground\`.\n\n## Deprecated\n- \`border-light\`\n- \`shadow-sm-soft\`\n`,
      category: "Design",
      tags: ["design-system", "tokens"],
      isPublic: true,
      teamId: "team-design",
      createdBy: "u9",
      version: 5,
      viewCount: 96,
      createdAt: at(-60, 11),
      updatedAt: at(-4, 11),
    },
    {
      id: "wiki-3",
      title: "Meeting notes — Q3 kickoff",
      content: `# Q3 Kickoff\n\n**Attendees:** 12\n\n## Decisions\n- Focus on retention over new acquisition\n- Ship onboarding v2 by end of month\n- Freeze scope for mobile GA\n\n## Action items\n- [ ] Finalize pricing experiment (Kanya)\n- [ ] Prepare migration plan (Phuwadon)\n- [ ] Draft comms plan (Arisa)\n`,
      category: "Meetings",
      tags: ["q3", "strategy"],
      isPublic: true,
      teamId: null,
      createdBy: "u2",
      version: 1,
      viewCount: 57,
      createdAt: at(-20, 16),
      updatedAt: at(-20, 16),
    },
    {
      id: "wiki-4",
      title: "On-call runbook",
      content: `# On-call runbook\n\n## First 5 minutes\n1. Acknowledge the page\n2. Check status page and dashboards\n3. Post in #incidents\n\n## Severity levels\n| Sev | Impact | Response |\n| --- | --- | --- |\n| SEV1 | All users down | Page everyone |\n| SEV2 | Major feature broken | On-call + lead |\n| SEV3 | Minor issue | Next business day |\n\n## Rollback\n\`\`\`bash\n./scripts/rollback.sh <release-tag>\n\`\`\`\n`,
      category: "Engineering",
      tags: ["incident", "on-call"],
      isPublic: true,
      teamId: "team-platform",
      createdBy: "u12",
      version: 2,
      viewCount: 73,
      createdAt: at(-40, 9),
      updatedAt: at(-8, 9),
    },
    {
      id: "wiki-5",
      title: "Brand voice & tone",
      content: `# Brand voice\n\nWe are **clear, warm, and confident**. We explain rather than impress.\n\n## Do\n- Use short sentences\n- Say "you" and "we"\n- Lead with the benefit\n\n## Don't\n- Use jargon or buzzwords\n- Shout in ALL CAPS\n- Overpromise\n`,
      category: "Design",
      tags: ["brand", "writing"],
      isPublic: true,
      teamId: "team-design",
      createdBy: "u4",
      version: 1,
      viewCount: 41,
      createdAt: at(-15, 13),
      updatedAt: at(-15, 13),
    },
  ].map((a) => ({ ...a, creator: byId[a.createdBy], team: a.teamId ? { id: a.teamId, name: teams.find((t) => t.id === a.teamId)!.name } : null }));

  /* ─────────────────────────── Announcements ─────────────────────────── */
  const announcements = [
    {
      id: "ann-1",
      title: "🚀 Team Connect 3.0 rollout starts Monday",
      content:
        "We're rolling out Team Connect 3.0 to everyone next Monday. Expect a refreshed onboarding flow, faster chat, and meeting minutes automation.\n\n**Training sessions** are on the calendar — please attend one session per team.\n\nQuestions? Ask in #general.",
      priority: "high",
      targetType: "all",
      targetIds: [],
      attachments: [],
      createdBy: "u1",
      expiresAt: null,
      status: "active",
      createdAt: at(-1, 9, 10),
      updatedAt: at(-1, 9, 10),
      isRead: false,
    },
    {
      id: "ann-2",
      title: "🌸 Songkran holiday — office closed April 13–15",
      content:
        "The office will be closed for Songkran from April 13 to 15. Support coverage will be handled by the on-call rotation.\n\nStay safe and enjoy the long weekend!",
      priority: "normal",
      targetType: "all",
      targetIds: [],
      attachments: [],
      createdBy: "u2",
      expiresAt: null,
      status: "active",
      createdAt: at(-3, 11),
      updatedAt: at(-3, 11),
      isRead: true,
    },
    {
      id: "ann-3",
      title: "🏆 Sprint 11 results: 94% of committed work shipped",
      content:
        "Fantastic sprint, everyone. We shipped 31 of 33 committed items and closed 18 bugs.\n\nDesign and platform teams both hit their stretch goals. Let's keep the momentum going into Sprint 12.",
      priority: "low",
      targetType: "all",
      targetIds: [],
      attachments: [],
      createdBy: "u3",
      expiresAt: null,
      status: "active",
      createdAt: at(-6, 17),
      updatedAt: at(-6, 17),
      isRead: true,
    },
    {
      id: "ann-4",
      title: "🔐 Security reminder: enable 2FA",
      content:
        "All accounts must have two-factor authentication enabled by the end of the month. Head to Settings → Security to set it up.\n\nIf you need a hardware key, contact IT.",
      priority: "urgent",
      targetType: "all",
      targetIds: [],
      attachments: [],
      createdBy: "u12",
      expiresAt: null,
      status: "active",
      createdAt: at(-2, 8),
      updatedAt: at(-2, 8),
      isRead: false,
    },
  ].map((a) => ({ ...a, creator: byId[a.createdBy] }));

  /* ─────────────────────────── Holidays ─────────────────────────── */
  const year = new Date().getFullYear();
  const holidays = [
    { id: "hol-1", name: "วันขึ้นปีใหม่", nameEn: "New Year's Day", date: `${year}-01-01T00:00:00.000Z`, type: "public", country: "TH", isRecurring: true },
    { id: "hol-2", name: "วันมาฆบูชา", nameEn: "Makha Bucha", date: `${year}-03-03T00:00:00.000Z`, type: "public", country: "TH", isRecurring: true },
    { id: "hol-3", name: "วันจักรี", nameEn: "Chakri Day", date: `${year}-04-06T00:00:00.000Z`, type: "public", country: "TH", isRecurring: true },
    { id: "hol-4", name: "วันสงกรานต์", nameEn: "Songkran", date: `${year}-04-13T00:00:00.000Z`, type: "public", country: "TH", isRecurring: true },
    { id: "hol-5", name: "วันแรงงาน", nameEn: "Labour Day", date: `${year}-05-01T00:00:00.000Z`, type: "public", country: "TH", isRecurring: true },
    { id: "hol-6", name: "วันฉัตรมงคล", nameEn: "Coronation Day", date: `${year}-05-04T00:00:00.000Z`, type: "public", country: "TH", isRecurring: true },
    { id: "hol-7", name: "วันวิสาขบูชา", nameEn: "Visakha Bucha", date: `${year}-05-31T00:00:00.000Z`, type: "public", country: "TH", isRecurring: true },
    { id: "hol-8", name: "วันเฉลิมพระชนมพรรษา", nameEn: "King's Birthday", date: `${year}-07-28T00:00:00.000Z`, type: "public", country: "TH", isRecurring: true },
    { id: "hol-9", name: "วันแม่แห่งชาติ", nameEn: "Mother's Day", date: `${year}-08-12T00:00:00.000Z`, type: "public", country: "TH", isRecurring: true },
    { id: "hol-10", name: "วันพ่อแห่งชาติ", nameEn: "Father's Day", date: `${year}-12-05T00:00:00.000Z`, type: "public", country: "TH", isRecurring: true },
    { id: "hol-11", name: "วันสิ้นปี", nameEn: "New Year's Eve", date: `${year}-12-31T00:00:00.000Z`, type: "public", country: "TH", isRecurring: true },
    { id: "hol-12", name: "วันคริสต์มาส", nameEn: "Christmas Day", date: `${year}-12-25T00:00:00.000Z`, type: "public", country: "TH", isRecurring: true },
  ];

  /* ─────────────────────────── Directory / admin ─────────────────────────── */
  const invites = [
    { id: "inv-1", email: "newuser1@siamdigital.co.th", token: "demo-invite-1", role: "employee", teamId: "team-product", teamRole: "member", invitedBy: "u1", organizationId: DEMO_ORG_ID, expiresAt: at(6, 18), usedAt: null, createdAt: at(-1, 10) },
    { id: "inv-2", email: "newuser2@siamdigital.co.th", token: "demo-invite-2", role: "manager", teamId: "team-platform", teamRole: "lead", invitedBy: "u2", organizationId: DEMO_ORG_ID, expiresAt: at(4, 18), usedAt: null, createdAt: at(-2, 14) },
  ];

  const resources: Array<[string, string[]]> = [
    ["users", ["view", "create", "edit", "delete"]],
    ["teams", ["view", "create", "edit", "delete"]],
    ["meetings", ["view", "create", "edit", "delete"]],
    ["tasks", ["view", "create", "edit", "delete"]],
    ["channels", ["view", "create", "edit", "delete"]],
    ["reports", ["view"]],
    ["drive", ["view", "manage"]],
    ["settings", ["view", "manage"]],
    ["audit", ["view"]],
    ["invites", ["manage"]],
    ["announcements", ["manage"]],
  ];

  const roleDefaults: Record<string, Record<string, string[]>> = {
    admin: {
      users: ["view", "create", "edit"],
      teams: ["view", "create", "edit", "delete"],
      meetings: ["view", "create", "edit", "delete"],
      tasks: ["view", "create", "edit", "delete"],
      channels: ["view", "create", "edit", "delete"],
      reports: ["view"],
      drive: ["view", "manage"],
      settings: ["view", "manage"],
      audit: ["view"],
      invites: ["manage"],
      announcements: ["manage"],
    },
    manager: {
      users: ["view"],
      teams: ["view", "edit"],
      meetings: ["view", "create", "edit", "delete"],
      tasks: ["view", "create", "edit", "delete"],
      channels: ["view", "create", "edit"],
      reports: ["view"],
      drive: ["view", "manage"],
      settings: ["view"],
      audit: ["view"],
      invites: ["manage"],
      announcements: ["manage"],
    },
    employee: {
      users: ["view"],
      teams: ["view"],
      meetings: ["view", "create"],
      tasks: ["view", "create", "edit"],
      channels: ["view"],
      reports: ["view"],
      drive: ["view"],
      settings: ["view"],
    },
  };

  const permissions: Array<{ role: string; resource: string; action: string; allowed: boolean }> = [];
  for (const [role, map] of Object.entries(roleDefaults)) {
    for (const [resource, actions] of resources) {
      for (const action of actions) {
        permissions.push({ role, resource, action, allowed: (map[resource] || []).includes(action) });
      }
    }
  }

  const auditLogs = [
    ["login", "user", "u1", "ธีรภัทร์ วัฒนกุล", 15],
    ["create", "task", "u6", "พัชรา ลิ้มวงศ์", 48],
    ["update", "task", "u8", "พิมพ์ชนก รัตน์", 60],
    ["create", "meeting", "u2", "กัญญา ศรีสุข", 120],
    ["update", "user", "u1", "ธีรภัทร์ วัฒนกุล", 180],
    ["create", "channel", "u11", "สุดาวรรณ พงษ์ไพบูลย์", 240],
    ["delete", "message", "u3", "ภูวดล จิรากุล", 300],
    ["create", "invite", "u2", "กัญญา ศรีสุข", 360],
    ["update", "organization", "u1", "ธีรภัทร์ วัฒนกุล", 420],
    ["create", "drive_entry", "u4", "อริษา เทควงศ์", 500],
    ["update", "permission", "u1", "ธีรภัทร์ วัฒนกุล", 620],
    ["create", "announcement", "u1", "ธีรภัทร์ วัฒนกุล", 900],
  ].map(([action, entity, userId, userName, minutesAgo], i) => ({
    id: `audit-${i + 1}`,
    action: action as string,
    entity: entity as string,
    entityId: `${entity}-${i + 1}`,
    userId: userId as string,
    userName: userName as string,
    details: { description: `${action} ${entity}` },
    ipAddress: `10.0.${i % 6}.${20 + i}`,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
    createdAt: ago(minutesAgo as number),
    user: byId[userId as string],
  }));

  const organization = {
    id: DEMO_ORG_ID,
    name: "Siam Digital Solutions",
    domain: "siamdigital.co.th",
    allowedDomains: ["siamdigital.co.th", "siamdigital.com"],
    logo: makeAvatar("SDS", "#0d8abc", "#2563eb"),
    settings: {
      departments: [
        { name: "Engineering", positions: ["CTO", "Technical Lead", "Senior Frontend Developer", "Senior Backend Developer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "Mobile Developer"] },
        { name: "Design & UX", positions: ["Design Director", "UX Lead", "UI Designer", "UX Designer", "Graphic Designer"] },
        { name: "Product", positions: ["Product Director", "Product Manager", "Product Owner", "Business Analyst"] },
        { name: "QA", positions: ["QA Lead", "QA Engineer", "Test Engineer"] },
        { name: "DevOps & Infrastructure", positions: ["DevOps Lead", "DevOps Engineer", "Site Reliability Engineer", "Cloud Engineer"] },
        { name: "Project Management", positions: ["PM Director", "Project Manager", "Scrum Master"] },
        { name: "Marketing", positions: ["Marketing Manager", "Content Writer", "SEO Specialist"] },
        { name: "Human Resources", positions: ["HR Manager", "Recruiter", "HR Specialist"] },
      ],
      defaultTeamId: "team-product",
      securityPolicy: {
        minPasswordLength: 10,
        sessionTimeout: 480,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecial: true,
      },
    },
    createdAt: "2024-01-08T03:00:00.000Z",
    updatedAt: "2026-02-17T04:00:00.000Z",
  };

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    organization,
    users: users as any[],
    teams: teams as any[],
    projects: projects as any[],
    epics: epics as any[],
    sprints: sprints as any[],
    components: components as any[],
    versions: versions as any[],
    channels: channels as any[],
    messages: messages as any[],
    dm: dm as any[],
    tasks: tasks as any[],
    taskTemplates: taskTemplates as any[],
    meetings: meetings as any[],
    meetingMinutes: meetingMinutes as any[],
    notifications: notifications as any[],
    notificationPreferences,
    notificationDigests: notificationDigests as any[],
    reminders: reminders as any[],
    driveEntries: driveEntries as any[],
    wikiArticles: wikiArticles as any[],
    announcements: announcements as any[],
    holidays: holidays as any[],
    invites: invites as any[],
    permissions: permissions as any[],
    auditLogs: auditLogs as any[],
  };
}

export type DemoDb = ReturnType<typeof createDemoDb>;
