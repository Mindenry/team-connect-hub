/**
 * In-browser mock backend for demo mode.
 *
 * `handleDemoRequest` implements the REST surface used by the frontend on top
 * of a localStorage-persisted seed database. It also publishes fake socket
 * events so chat, presence, tasks and meetings update in real time.
 */
import { DEMO_MODE, DEMO_ACCOUNT } from "./config";
import { getDemoDb, saveDemoDb, uid } from "./db";
import { DEMO_ORG_ID, DEMO_USER_ID, type DemoDb } from "./seed";

/* ───────────────────────────── result / response ───────────────────────────── */

type Result = { status: number; body: any; raw?: boolean };

const ok = (data: any): Result => ({ status: 200, body: data });
const raw = (data: any): Result => ({ status: 200, body: data, raw: true });
const created = (data: any): Result => ({ status: 201, body: data });
const fail = (status: number, message: string): Result => ({ status, body: { message }, raw: true });

/* ───────────────────────────── socket bridge ───────────────────────────── */

type DemoEvent = { event: string; payload: any };
const socketListeners = new Set<(e: DemoEvent) => void>();

export function subscribeDemoSocket(listener: (e: DemoEvent) => void): () => void {
  socketListeners.add(listener);
  return () => socketListeners.delete(listener);
}

function broadcast(event: string, payload: any) {
  for (const l of Array.from(socketListeners)) {
    try {
      l({ event, payload });
    } catch {
      /* ignore listener errors */
    }
  }
}

/* ───────────────────────────── helpers ───────────────────────────── */

const now = () => new Date().toISOString();

function userLite(u: any) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    status: u.status,
    activity: u.activity,
    role: u.role,
    department: u.department,
    position: u.position,
    organizationId: u.organizationId,
  };
}

const findUser = (db: DemoDb, id?: string | null) => db.users.find((u: any) => u.id === id);

function teamView(db: DemoDb, team: any) {
  return {
    ...team,
    members: (team.members || []).map((m: any) => ({ ...m, user: userLite(findUser(db, m.userId)) })),
    _count: {
      members: (team.members || []).length,
      tasks: db.tasks.filter((t: any) => t.teamId === team.id).length,
      channels: db.channels.filter((c: any) => c.teamId === team.id).length,
    },
  };
}

function channelView(db: DemoDb, channel: any) {
  const team = db.teams.find((t: any) => t.id === channel.teamId);
  return {
    ...channel,
    team: team ? { id: team.id, name: team.name } : channel.team,
    _count: { messages: db.messages.filter((m: any) => m.channelId === channel.id).length },
  };
}

function resolveMessage(db: DemoDb, m: any) {
  const sender = findUser(db, m.senderId);
  const replyTo = m.replyToId ? db.messages.find((x: any) => x.id === m.replyToId) : null;
  return {
    ...m,
    sender: userLite(sender) || { id: m.senderId, name: "Unknown", email: "" },
    replyTo: replyTo
      ? {
          id: replyTo.id,
          text: replyTo.text,
          sender: { name: findUser(db, replyTo.senderId)?.name || "Unknown" },
        }
      : undefined,
    reactions: (m.reactions || []).map((r: any) => ({
      ...r,
      user: userLite(findUser(db, r.userId)),
    })),
  };
}

function resolveDm(db: DemoDb, m: any) {
  return {
    ...m,
    sender: userLite(findUser(db, m.senderId)),
    receiver: userLite(findUser(db, m.receiverId)),
  };
}

function taskLinks(db: DemoDb, taskId: string) {
  const all: any[] = [];
  for (const t of db.tasks) {
    for (const l of (t as any).links || []) {
      if (!all.some((x) => x.id === l.id)) all.push(l);
    }
  }
  return all
    .filter((l) => l.sourceId === taskId || l.targetId === taskId)
    .map((l) => {
      const direction = l.sourceId === taskId ? "outgoing" : "incoming";
      const source = db.tasks.find((t: any) => t.id === l.sourceId);
      const target = db.tasks.find((t: any) => t.id === l.targetId);
      return {
        ...l,
        direction,
        source: source ? { id: source.id, title: source.title, issueType: source.issueType, status: source.status } : undefined,
        target: target ? { id: target.id, title: target.title, issueType: target.issueType, status: target.status } : undefined,
      };
    });
}

function resolveTask(db: DemoDb, t: any) {
  const project = db.projects.find((p: any) => p.id === t.projectId);
  const epic = db.epics.find((e: any) => e.id === t.epicId);
  const sprint = db.sprints.find((s: any) => s.id === t.sprintId);
  const component = db.components.find((c: any) => c.id === t.componentId);
  const version = db.versions.find((v: any) => v.id === t.versionId);
  const team = db.teams.find((x: any) => x.id === t.teamId);

  return {
    ...t,
    assignee: userLite(findUser(db, t.assigneeId)),
    reporter: userLite(findUser(db, t.reporterId)),
    team: team ? { id: team.id, name: team.name } : null,
    project: project ? { id: project.id, key: project.key, name: project.name, color: project.color } : null,
    epic: epic ? { id: epic.id, name: epic.name, color: epic.color, status: epic.status } : null,
    sprint: sprint ? { id: sprint.id, name: sprint.name, status: sprint.status } : null,
    component: component ? { id: component.id, name: component.name } : null,
    version: version ? { id: version.id, name: version.name, released: version.released } : null,
    subtasks: (t.subtasks || []).map((s: any) => ({ ...s })),
    comments: (t.comments || []).map((c: any) => ({ ...c, user: userLite(findUser(db, c.userId)) })),
    activityLog: (t.activityLog || []).map((a: any) => ({ ...a, user: userLite(findUser(db, a.userId)) })),
    attachments: (t.attachments || []).map((a: any) => ({ ...a, user: userLite(findUser(db, a.userId)) })),
    watchers: (t.watchers || []).map((w: any) => ({ ...w, user: userLite(findUser(db, w.userId)) })),
    _count: {
      subtasks: (t.subtasks || []).length,
      comments: (t.comments || []).length,
      attachments: (t.attachments || []).length,
      watchers: (t.watchers || []).length,
      linkedIssues: taskLinks(db, t.id).length,
    },
  };
}

function resolveMeeting(db: DemoDb, m: any) {
  return {
    ...m,
    host: userLite(findUser(db, m.hostId)),
    team: m.teamId ? { id: m.teamId, name: db.teams.find((t: any) => t.id === m.teamId)?.name } : null,
    participants: (m.participants || []).map((p: any) => ({
      ...p,
      user: userLite(findUser(db, p.userId)),
    })),
  };
}

function resolveReminder(db: DemoDb, r: any) {
  return {
    ...r,
    creator: userLite(findUser(db, r.createdBy)),
    recipients: (r.recipients || []).map((x: any) => ({ ...x, user: userLite(findUser(db, x.userId)) })),
  };
}

function resolveDriveEntry(db: DemoDb, e: any) {
  const versions = (e.versions || []) as any[];
  const latest = versions[versions.length - 1];
  return {
    id: e.id,
    name: e.name,
    path: e.path,
    isFolder: e.isFolder,
    teamId: e.teamId,
    createdById: e.createdById,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    latestVersion: latest
      ? {
          id: latest.id,
          version: latest.version,
          size: latest.size,
          mimeType: latest.mimeType,
          storageKey: latest.storageKey,
          url: latest.url,
          createdAt: latest.createdAt,
        }
      : null,
    createdBy: userLite(findUser(db, e.createdById)),
  };
}

async function fileToUrl(file: File): Promise<string> {
  if (file.size > 1.2 * 1024 * 1024) {
    // Keep big files in memory only (they would blow the localStorage quota).
    return URL.createObjectURL(file);
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => resolve(URL.createObjectURL(file));
    reader.readAsDataURL(file);
  });
}

type ParsedBody = { json: any; form: FormData | null };

async function parseBody(init?: RequestInit): Promise<ParsedBody> {
  const body: any = init?.body;
  if (!body) return { json: null, form: null };
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return { json: null, form: body };
  }
  if (typeof body === "string") {
    try {
      return { json: JSON.parse(body), form: null };
    } catch {
      return { json: null, form: null };
    }
  }
  if (body instanceof URLSearchParams) {
    return { json: Object.fromEntries(body.entries()), form: null };
  }
  return { json: body, form: null };
}

function nextTaskPosition(db: DemoDb, status: string, teamId?: string | null) {
  const rows = db.tasks.filter((t: any) => t.status === status && (teamId ? t.teamId === teamId : true));
  return rows.length;
}

function addNotification(db: DemoDb, partial: Record<string, any>) {
  const n = {
    id: uid("notif"),
    userId: DEMO_USER_ID,
    type: "message",
    title: "Notification",
    message: "",
    link: null,
    read: false,
    priority: "normal",
    groupedId: null,
    relatedId: null,
    relatedType: null,
    createdAt: now(),
    updatedAt: now(),
    ...partial,
  };
  db.notifications.unshift(n);
  return n;
}

/* ───────────────────────────── reports ───────────────────────────── */

function buildReports(db: DemoDb, range = "month") {
  const me = findUser(db, DEMO_USER_ID)!;
  const myTasks = db.tasks.filter((t: any) => t.assigneeId === me.id);
  const done = myTasks.filter((t: any) => t.status === "done").length;
  const total = myTasks.length;
  const completion = total ? Math.round((done / total) * 100) : 0;
  const myMessages = db.messages.filter((m: any) => m.senderId === me.id).length + 24;
  const myMeetings = db.meetings.filter((m: any) => (m.participants || []).some((p: any) => p.userId === me.id)).length + 3;

  return {
    tasksCompleted: done + 18,
    tasksTotal: total + 22,
    meetingsAttended: myMeetings,
    messagesSent: myMessages,
    productivityScore: 82,
    taskCompletionRate: Math.max(completion, 64),
    avgTaskCompletionTime: 2.4,
    activeDays: 18,
    productivityBreakdown: {
      adjustedTaskPerformance: 86,
      meaningfulEngagement: 74,
      communicationEffectiveness: 81,
      workConsistency: 88,
      difficultyFactor: 1.2,
      activeDays: 18,
      periodDays: 22,
      weights: {
        adjustedTaskPerformance: 45,
        meaningfulEngagement: 20,
        communicationEffectiveness: 20,
        workConsistency: 15,
      },
      antiGamingApplied: false,
      methodology:
        "Balanced Scorecard (Kaplan & Norton, 1996) with task difficulty adjustment and anti-gaming rules",
    },
    teamMetrics: [
      { teamId: "team-platform", teamName: "Platform Team", tasksCompleted: 9, meetingsAttended: 6, messagesSent: 21 },
      { teamId: "team-product", teamName: "Product Team", tasksCompleted: 7, meetingsAttended: 5, messagesSent: 17 },
      { teamId: "team-design", teamName: "Design Team", tasksCompleted: 4, meetingsAttended: 3, messagesSent: 9 },
    ],
    weeklyTrend: [
      { week: "W-3", tasks: 4, meetings: 3, messages: 12 },
      { week: "W-2", tasks: 6, meetings: 5, messages: 18 },
      { week: "W-1", tasks: 5, meetings: 4, messages: 15 },
      { week: "This week", tasks: 8, meetings: 6, messages: 22 },
    ],
    range,
  };
}

function buildTeamProductivity(db: DemoDb, teamId: string) {
  const team = db.teams.find((t: any) => t.id === teamId) || db.teams[0];
  const tasks = db.tasks.filter((t: any) => t.teamId === team.id);
  const meetings = db.meetings.filter((m: any) => m.teamId === team.id);
  const channels = db.channels.filter((c: any) => c.teamId === team.id);
  const messages = db.messages.filter((m: any) => channels.some((c: any) => c.id === m.channelId));
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  for (const t of tasks) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
  }

  const members = (team.members || []).map((m: any) => {
    const u = findUser(db, m.userId);
    const mine = tasks.filter((t: any) => t.assigneeId === m.userId);
    const completed = mine.filter((t: any) => t.status === "done").length;
    const inProgress = mine.filter((t: any) => t.status === "in_progress").length;
    const todo = mine.filter((t: any) => t.status === "todo").length;
    const msgs = messages.filter((x: any) => x.senderId === m.userId).length;
    const attended = meetings.filter((x: any) => (x.participants || []).some((p: any) => p.userId === m.userId)).length;
    const score = Math.round(
      (mine.length ? (completed / mine.length) * 55 : 40) + Math.min(25, attended * 6) + Math.min(20, msgs * 2),
    );
    return {
      user: userLite(u),
      tasks: { total: mine.length, completed, inProgress, todo },
      messagesSent: msgs,
      meetingsAttended: attended,
      productivityScore: score,
    };
  });

  return {
    period: { start: new Date(Date.now() - 30 * 864e5).toISOString(), end: now() },
    team: { id: team.id, name: team.name },
    summary: {
      members: (team.members || []).length,
      tasks: {
        total: tasks.length,
        completed: tasks.filter((t: any) => t.status === "done").length,
        inProgress: tasks.filter((t: any) => t.status === "in_progress").length,
        todo: tasks.filter((t: any) => t.status === "todo").length,
        overdue: tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length,
        byStatus,
        byPriority,
      },
      meetings: {
        total: meetings.length,
        completed: meetings.filter((m: any) => m.status === "ended").length,
        scheduled: meetings.filter((m: any) => m.status === "scheduled").length,
        totalDuration: meetings.reduce((sum: number, m: any) => {
          const end = m.endTime ? new Date(m.endTime).getTime() : new Date(m.startTime).getTime();
          return sum + Math.max(0, Math.round((end - new Date(m.startTime).getTime()) / 60000));
        }, 0),
        avgDuration: meetings.length
          ? Math.round(
              meetings.reduce((sum: number, m: any) => {
                const end = m.endTime ? new Date(m.endTime).getTime() : new Date(m.startTime).getTime();
                return sum + Math.max(0, Math.round((end - new Date(m.startTime).getTime()) / 60000));
              }, 0) / meetings.length,
            )
          : 0,
      },
      messages: { total: messages.length, channels: channels.length },
    },
    members,
    taskTrend: Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toISOString().slice(0, 10),
        completed: 1 + ((i * 3) % 4),
        created: 1 + ((i * 2) % 3),
      };
    }),
  };
}

function buildWorkload(db: DemoDb, teamId: string) {
  const report = buildTeamProductivity(db, teamId);
  const workload = report.members.map((m: any) => {
    const own = db.tasks.filter((t: any) => t.assigneeId === m.user.id);
    return {
      userId: m.user.id,
      userName: m.user.name,
      userEmail: m.user.email,
      userAvatar: m.user.avatar,
      totalTasks: own.length,
      completed: own.filter((t: any) => t.status === "done").length,
      inProgress: own.filter((t: any) => t.status === "in_progress").length,
      todo: own.filter((t: any) => t.status === "todo").length,
      overdue: own.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length,
      workloadPercentage: Math.min(100, own.filter((t: any) => t.status !== "done").length * 16),
    };
  });
  const values = workload.map((w: any) => w.workloadPercentage);
  return {
    team: report.team,
    workload,
    summary: {
      avgWorkload: values.length ? Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length) : 0,
      maxWorkload: values.length ? Math.max(...values) : 0,
      minWorkload: values.length ? Math.min(...values) : 0,
      totalOverdue: workload.reduce((sum: number, w: any) => sum + w.overdue, 0),
    },
  };
}

function buildPerformance(db: DemoDb) {
  const rows = db.users
    .filter((u: any) => u.isActive !== false)
    .slice(0, 8)
    .map((u: any, i: number) => {
      const mine = db.tasks.filter((t: any) => t.assigneeId === u.id);
      const completed = mine.filter((t: any) => t.status === "done").length;
      const attended = db.meetings.filter((m: any) => (m.participants || []).some((p: any) => p.userId === u.id)).length;
      const sent = db.messages.filter((m: any) => m.senderId === u.id).length + 4 + i;
      const rate = mine.length ? Math.round((completed / mine.length) * 100) : 60 + i * 3;
      return {
        userId: u.id,
        userName: u.name,
        userAvatar: u.avatar,
        totalTasks: mine.length,
        completedTasks: completed,
        completionRate: Math.min(100, rate),
        trend: (i % 3 === 0 ? "up" : i % 3 === 1 ? "stable" : "down") as "up" | "stable" | "down",
        totalMeetings: attended + 2,
        attendedMeetings: attended,
        attendanceRate: Math.min(100, 70 + ((i * 7) % 30)),
        messagesSent: sent,
        totalInteractions: completed * 3 + attended * 4 + sent,
        activityScore: Math.min(100, 58 + ((i * 9) % 38)),
      };
    });

  const avg = (key: string) => (rows.length ? Math.round(rows.reduce((s: number, r: any) => s + (r[key] || 0), 0) / rows.length) : 0);
  const sorted = [...rows].sort((a, b) => b.activityScore - a.activityScore);
  return {
    period: { startDate: new Date(Date.now() - 30 * 864e5).toISOString(), endDate: now() },
    summary: {
      avgTaskCompletionRate: avg("completionRate"),
      avgMeetingAttendanceRate: avg("attendanceRate"),
      totalInteractions: rows.reduce((s: number, r: any) => s + r.totalInteractions, 0),
      topPerformer: sorted[0] ? { userId: sorted[0].userId, userName: sorted[0].userName, score: sorted[0].activityScore } : undefined,
    },
    taskCompletionRates: rows.map((r: any) => ({
      userId: r.userId,
      userName: r.userName,
      userAvatar: r.userAvatar,
      totalTasks: r.totalTasks || 0,
      completedTasks: r.completedTasks,
      completionRate: r.completionRate,
      trend: r.trend,
    })),
    meetingAttendanceRates: rows.map((r: any) => ({
      userId: r.userId,
      userName: r.userName,
      userAvatar: r.userAvatar,
      totalMeetings: r.totalMeetings,
      attendedMeetings: r.attendedMeetings,
      attendanceRate: r.attendanceRate,
      trend: r.trend,
    })),
    collaborationActivity: rows.map((r: any) => ({
      userId: r.userId,
      userName: r.userName,
      userAvatar: r.userAvatar,
      completedTasks: r.completedTasks,
      attendedMeetings: r.attendedMeetings,
      messagesSent: r.messagesSent,
      totalInteractions: r.totalInteractions,
      activityScore: r.activityScore,
    })),
    trend: Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toISOString().slice(0, 10),
        completionRate: 58 + ((i * 5) % 22),
        attendanceRate: 72 + ((i * 3) % 16),
        activityScore: 64 + ((i * 6) % 24),
      };
    }),
  };
}

/* ───────────────────────────── main router ───────────────────────────── */

export interface DemoRequest {
  method: string;
  path: string;
  url: URL;
  json: any;
  form: FormData | null;
}

export async function handleDemoRequest(req: DemoRequest): Promise<Result | null> {
  if (!DEMO_MODE) return null;
  const db = getDemoDb();
  const { method, path, url, json, form } = req;
  const q = url.searchParams;
  const body = json || {};

  let m: RegExpMatchArray | null;

  /* ── auth ── */
  if (path === "/api/auth/login" && method === "POST") {
    const email = String(body.email || DEMO_ACCOUNT.email).toLowerCase();
    const found = db.users.find((u: any) => u.email.toLowerCase() === email) || findUser(db, DEMO_USER_ID)!;
    return raw({
      user: { ...found, id: found.id },
      accessToken: "demo-access-token",
      refreshToken: "demo-refresh-token",
      expiresIn: 7 * 24 * 3600,
    });
  }
  if (path === "/api/auth/refresh" && method === "POST") {
    return raw({ accessToken: "demo-access-token", refreshToken: "demo-refresh-token" });
  }
  if (path === "/api/auth/forgot-password" && method === "POST") {
    return raw({ emailSent: false, token: "demo-reset-token", message: "Demo mode: use the demo account to sign in." });
  }
  if (path === "/api/auth/reset-password-token" && method === "POST") {
    return raw({ success: true });
  }
  if ((m = path.match(/^\/api\/auth\/invite\/([^/]+)$/)) && method === "GET") {
    const invite = db.invites.find((i: any) => i.token === m![1]) || db.invites[0];
    return raw(invite ? { ...invite, team: db.teams.find((t: any) => t.id === invite.teamId) } : {});
  }
  if (path === "/api/auth/invite/lookup" && method === "POST") {
    const invite = db.invites.find((i: any) => i.email.toLowerCase() === String(body.email || "").toLowerCase()) || db.invites[0];
    return raw(invite || {});
  }
  if (path === "/api/auth/invite/accept" && method === "POST") {
    const invite = db.invites.find((i: any) => i.token === body.token);
    const newUser = {
      id: uid("user"),
      email: invite?.email || "invited@siamdigital.co.th",
      name: body.name || "New Teammate",
      displayName: (body.firstName || "New") as string,
      role: invite?.role || "employee",
      status: "online",
      activity: "Available",
      avatar: "",
      isActive: true,
      department: "",
      position: "",
      lastActiveAt: now(),
      createdAt: now(),
      organizationId: DEMO_ORG_ID,
    };
    db.users.push(newUser);
    if (invite) {
      invite.usedAt = now();
      const team = db.teams.find((t: any) => t.id === invite.teamId);
      if (team) {
        team.members.push({ id: uid("tm"), teamId: team.id, userId: newUser.id, role: invite.teamRole || "member", createdAt: now(), user: newUser });
      }
    }
    saveDemoDb();
    broadcast("user:created", newUser);
    return raw({ user: newUser, accessToken: "demo-access-token", refreshToken: "demo-refresh-token" });
  }

  /* ── users ── */
  if (path === "/api/users" && method === "GET") {
    return ok(db.users.map((u: any) => ({ ...u })));
  }
  if ((m = path.match(/^\/api\/users\/([^/]+)\/status$/)) && method === "PATCH") {
    const u = findUser(db, m[1]);
    if (!u) return fail(404, "User not found");
    u.status = body.status ?? u.status;
    u.activity = body.activity ?? u.activity;
    u.lastActiveAt = now();
    saveDemoDb();
    broadcast("user:updated", u);
    return ok(u);
  }
  if ((m = path.match(/^\/api\/users\/([^/]+)\/password$/)) && method === "PATCH") {
    return ok({ success: true });
  }
  if ((m = path.match(/^\/api\/users\/([^/]+)$/)) && method === "GET") {
    const u = findUser(db, m[1]);
    return u ? ok(u) : fail(404, "User not found");
  }
  if ((m = path.match(/^\/api\/users\/([^/]+)$/)) && method === "PATCH") {
    const u = findUser(db, m[1]);
    if (!u) return fail(404, "User not found");
    Object.assign(u, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.avatar !== undefined ? { avatar: body.avatar } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.activity !== undefined ? { activity: body.activity } : {}),
      ...(body.role !== undefined ? { role: body.role } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.department !== undefined ? { department: body.department } : {}),
      ...(body.position !== undefined ? { position: body.position } : {}),
    });
    saveDemoDb();
    broadcast("user:updated", u);
    return ok(u);
  }
  if ((m = path.match(/^\/api\/users\/([^/]+)$/)) && method === "DELETE") {
    const idx = db.users.findIndex((u: any) => u.id === m![1]);
    if (idx >= 0) db.users.splice(idx, 1);
    saveDemoDb();
    broadcast("user:deleted", m[1]);
    return ok({ success: true });
  }

  /* ── organizations ── */
  if ((m = path.match(/^\/api\/organizations\/([^/]+)$/)) && method === "GET") {
    return ok(db.organization);
  }
  if ((m = path.match(/^\/api\/organizations\/([^/]+)$/)) && method === "PATCH") {
    Object.assign(db.organization, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.logo !== undefined ? { logo: body.logo } : {}),
      ...(body.allowedDomains !== undefined ? { allowedDomains: body.allowedDomains } : {}),
      ...(body.settings !== undefined ? { settings: { ...db.organization.settings, ...body.settings } } : {}),
    });
    saveDemoDb();
    return ok(db.organization);
  }

  /* ── teams ── */
  if (path === "/api/teams" && method === "GET") {
    return ok(db.teams.map((t: any) => teamView(db, t)));
  }
  if (path === "/api/teams" && method === "POST") {
    const team = {
      id: uid("team"),
      name: body.name || "New Team",
      description: body.description || "",
      organizationId: DEMO_ORG_ID,
      createdAt: now(),
      updatedAt: now(),
      members: [],
    };
    db.teams.push(team);
    saveDemoDb();
    broadcast("team:created", team);
    return created(teamView(db, team));
  }
  if ((m = path.match(/^\/api\/teams\/([^/]+)\/members$/)) && method === "GET") {
    const team = db.teams.find((t: any) => t.id === m![1]);
    if (!team) return fail(404, "Team not found");
    return ok(team.members.map((x: any) => ({ ...x, user: userLite(findUser(db, x.userId)) })));
  }
  if ((m = path.match(/^\/api\/teams\/([^/]+)\/members$/)) && method === "POST") {
    const team = db.teams.find((t: any) => t.id === m![1]);
    if (!team) return fail(404, "Team not found");
    const u = findUser(db, body.userId);
    if (!u) return fail(404, "User not found");
    if (team.members.some((x: any) => x.userId === u.id)) return fail(400, "User already in team");
    const member = { id: uid("tm"), teamId: team.id, userId: u.id, role: body.role || "member", createdAt: now(), user: u };
    team.members.push(member);
    saveDemoDb();
    broadcast("team:member:added", { teamId: team.id, member });
    return ok({ ...member, user: userLite(u) });
  }
  if ((m = path.match(/^\/api\/teams\/([^/]+)\/members$/)) && method === "DELETE") {
    const team = db.teams.find((t: any) => t.id === m![1]);
    if (team) {
      team.members = team.members.filter((x: any) => x.userId !== q.get("userId"));
      saveDemoDb();
      broadcast("team:updated", team);
    }
    return ok({ success: true });
  }
  if ((m = path.match(/^\/api\/teams\/([^/]+)\/members\/([^/]+)\/role$/)) && method === "PATCH") {
    const team = db.teams.find((t: any) => t.id === m![1]);
    const member = team?.members.find((x: any) => x.userId === m![2]);
    if (!member) return fail(404, "Member not found");
    member.role = q.get("role") || body.role || "member";
    saveDemoDb();
    broadcast("team:updated", team);
    return ok({ ...member, user: userLite(findUser(db, member.userId)) });
  }
  if ((m = path.match(/^\/api\/teams\/([^/]+)$/)) && method === "GET") {
    const team = db.teams.find((t: any) => t.id === m![1]);
    return team ? ok(teamView(db, team)) : fail(404, "Team not found");
  }
  if ((m = path.match(/^\/api\/teams\/([^/]+)$/)) && method === "PATCH") {
    const team = db.teams.find((t: any) => t.id === m![1]);
    if (!team) return fail(404, "Team not found");
    Object.assign(team, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      updatedAt: now(),
    });
    saveDemoDb();
    broadcast("team:updated", team);
    return ok(teamView(db, team));
  }
  if ((m = path.match(/^\/api\/teams\/([^/]+)$/)) && method === "DELETE") {
    const idx = db.teams.findIndex((t: any) => t.id === m![1]);
    if (idx >= 0) db.teams.splice(idx, 1);
    saveDemoDb();
    broadcast("team:deleted", m[1]);
    return ok({ success: true });
  }

  /* ── channels ── */
  if ((path === "/api/channels" || path === "/api/channels/mine") && method === "GET") {
    return ok(db.channels.map((c: any) => channelView(db, c)));
  }
  if (path === "/api/channels" && method === "POST") {
    const team = db.teams.find((t: any) => t.id === body.teamId) || db.teams[0];
    const channel = {
      id: uid("ch"),
      name: String(body.name || "new-channel").toLowerCase().replace(/\s+/g, "-"),
      type: body.type || "general",
      description: body.description || "",
      teamId: team.id,
      createdAt: now(),
      updatedAt: now(),
      team: { id: team.id, name: team.name },
    };
    db.channels.push(channel);
    saveDemoDb();
    const view = channelView(db, channel);
    broadcast("channel:created", view);
    return created(view);
  }
  if ((m = path.match(/^\/api\/channels\/([^/]+)\/messages$/)) && method === "GET") {
    const rows = db.messages
      .filter((x: any) => x.channelId === m![1])
      .sort((a: any, b: any) => +new Date(a.createdAt) - +new Date(b.createdAt))
      .map((x: any) => resolveMessage(db, x));
    return ok(rows);
  }
  if ((m = path.match(/^\/api\/channels\/([^/]+)\/messages$/)) && method === "POST") {
    const senderId = body.senderId || DEMO_USER_ID;
    const msg = {
      id: uid("msg"),
      channelId: m[1],
      senderId,
      text: body.text ?? "",
      isPinned: false,
      isSystem: false,
      replyToId: body.replyToId || null,
      attachments: body.attachments || null,
      mentions: body.mentions || [],
      reactions: [],
      createdAt: now(),
      updatedAt: now(),
    };
    db.messages.push(msg);
    saveDemoDb();
    const resolved = resolveMessage(db, msg);
    broadcast("message:created", resolved);
    return created(resolved);
  }
  if ((m = path.match(/^\/api\/channels\/([^/]+)$/)) && method === "GET") {
    const channel = db.channels.find((c: any) => c.id === m![1]);
    if (!channel) return fail(404, "Channel not found");
    return ok({
      ...channelView(db, channel),
      messages: db.messages
        .filter((x: any) => x.channelId === channel.id)
        .sort((a: any, b: any) => +new Date(a.createdAt) - +new Date(b.createdAt))
        .map((x: any) => resolveMessage(db, x)),
    });
  }
  if ((m = path.match(/^\/api\/channels\/([^/]+)$/)) && method === "PATCH") {
    const channel = db.channels.find((c: any) => c.id === m![1]);
    if (!channel) return fail(404, "Channel not found");
    Object.assign(channel, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      updatedAt: now(),
    });
    saveDemoDb();
    const view = channelView(db, channel);
    broadcast("channel:updated", view);
    // EditChannelDialog reads the response directly (no wrapper).
    return raw(view);
  }
  if ((m = path.match(/^\/api\/channels\/([^/]+)$/)) && method === "DELETE") {
    db.channels = db.channels.filter((c: any) => c.id !== m![1]);
    db.messages = db.messages.filter((x: any) => x.channelId !== m![1]);
    saveDemoDb();
    broadcast("channel:deleted", m[1]);
    return ok({ success: true });
  }

  /* ── messages ── */
  if (path === "/api/messages/search" && method === "GET") {
    const query = (q.get("query") || "").toLowerCase();
    const channelId = q.get("channelId");
    const rows = db.messages
      .filter((x: any) => x.text.toLowerCase().includes(query) && (!channelId || x.channelId === channelId))
      .slice(0, 30)
      .map((x: any) => ({
        ...resolveMessage(db, x),
        channel: db.channels.find((c: any) => c.id === x.channelId),
      }));
    return ok(rows);
  }
  if ((m = path.match(/^\/api\/messages\/([^/]+)\/reactions$/)) && method === "GET") {
    const msg = db.messages.find((x: any) => x.id === m![1]);
    const reactions = (msg?.reactions || []) as any[];
    const grouped: Record<string, { emoji: string; count: number; users: Array<{ id: string; name: string }> }> = {};
    for (const r of reactions) {
      const u = findUser(db, r.userId);
      grouped[r.emoji] ||= { emoji: r.emoji, count: 0, users: [] };
      grouped[r.emoji].count += 1;
      if (u) grouped[r.emoji].users.push({ id: u.id, name: u.name });
    }
    return ok(Object.values(grouped));
  }
  if ((m = path.match(/^\/api\/messages\/([^/]+)\/reactions$/)) && method === "POST") {
    const msg = db.messages.find((x: any) => x.id === m![1]);
    if (!msg) return fail(404, "Message not found");
    msg.reactions ||= [];
    const userId = body.userId || DEMO_USER_ID;
    const emoji = body.emoji || "👍";
    const exists = msg.reactions.findIndex((r: any) => r.userId === userId && r.emoji === emoji);
    if (exists >= 0) msg.reactions.splice(exists, 1);
    else msg.reactions.push({ emoji, userId });
    saveDemoDb();
    broadcast(exists >= 0 ? "reaction:removed" : "reaction:added", { messageId: msg.id });
    return ok({ success: true });
  }
  if ((m = path.match(/^\/api\/messages\/([^/]+)\/read$/)) && method === "POST") {
    return ok({ success: true });
  }
  if ((m = path.match(/^\/api\/messages\/([^/]+)$/)) && method === "PATCH") {
    const msg = db.messages.find((x: any) => x.id === m![1]);
    if (!msg) return fail(404, "Message not found");
    Object.assign(msg, { ...body, updatedAt: now() });
    saveDemoDb();
    const resolved = resolveMessage(db, msg);
    broadcast("message:updated", resolved);
    return ok(resolved);
  }
  if ((m = path.match(/^\/api\/messages\/([^/]+)$/)) && method === "DELETE") {
    db.messages = db.messages.filter((x: any) => x.id !== m![1]);
    saveDemoDb();
    return ok({ success: true });
  }

  /* ── threads ── */
  if (path === "/api/threads" && method === "POST") {
    const threads: any[] = (db as any).threads || ((db as any).threads = []);
    let thread = threads.find((t: any) => t.messageId === body.messageId);
    if (!thread) {
      thread = { id: uid("thread"), messageId: body.messageId, channelId: body.channelId, createdAt: now(), updatedAt: now(), replies: [] };
      threads.push(thread);
    }
    saveDemoDb();
    return created({ id: thread.id, channelId: thread.channelId, messageId: thread.messageId, createdAt: thread.createdAt });
  }
  if ((m = path.match(/^\/api\/threads\/([^/]+)$/)) && method === "GET") {
    const threads: any[] = (db as any).threads || [];
    const thread = threads.find((t: any) => t.id === m![1]);
    if (!thread) return fail(404, "Thread not found");
    return ok({ ...thread, replies: (thread.replies || []).map((x: any) => resolveMessage(db, x)) });
  }

  /* ── direct messages ── */
  if ((m = path.match(/^\/api\/dm\/([^/]+)\/messages$/)) && method === "GET") {
    const other = m[1];
    const limit = Number(q.get("limit") || 200);
    const rows = db.dm
      .filter(
        (x: any) =>
          (x.senderId === DEMO_USER_ID && x.receiverId === other) ||
          (x.senderId === other && x.receiverId === DEMO_USER_ID),
      )
      .sort((a: any, b: any) => +new Date(a.createdAt) - +new Date(b.createdAt))
      .slice(-limit)
      .map((x: any) => resolveDm(db, x));
    return ok(rows);
  }

  /* ── tasks ── */
  if (path === "/api/tasks/templates" && method === "GET") {
    return ok(db.taskTemplates);
  }
  if (path === "/api/tasks/templates" && method === "POST") {
    const tpl = { id: uid("tpl"), createdById: DEMO_USER_ID, createdAt: now(), updatedAt: now(), tags: [], ...body };
    db.taskTemplates.push(tpl);
    saveDemoDb();
    return created(tpl);
  }
  if ((m = path.match(/^\/api\/tasks\/templates\/([^/]+)$/)) && method === "PATCH") {
    const tpl = db.taskTemplates.find((t: any) => t.id === m![1]);
    if (!tpl) return fail(404, "Template not found");
    Object.assign(tpl, body, { updatedAt: now() });
    saveDemoDb();
    return ok(tpl);
  }
  if ((m = path.match(/^\/api\/tasks\/templates\/([^/]+)$/)) && method === "DELETE") {
    db.taskTemplates = db.taskTemplates.filter((t: any) => t.id !== m![1]);
    saveDemoDb();
    return ok({ success: true });
  }
  if ((m = path.match(/^\/api\/tasks\/subtasks\/([^/]+)$/)) && method === "PATCH") {
    for (const t of db.tasks) {
      const sub = (t.subtasks || []).find((s: any) => s.id === m![1]);
      if (sub) {
        Object.assign(sub, body, { updatedAt: now() });
        saveDemoDb();
        return ok(sub);
      }
    }
    return fail(404, "Subtask not found");
  }
  if ((m = path.match(/^\/api\/tasks\/subtasks\/([^/]+)$/)) && method === "DELETE") {
    for (const t of db.tasks) {
      t.subtasks = (t.subtasks || []).filter((s: any) => s.id !== m![1]);
    }
    saveDemoDb();
    return ok({ success: true });
  }
  if ((m = path.match(/^\/api\/tasks\/attachments\/([^/]+)$/)) && method === "DELETE") {
    for (const t of db.tasks) {
      t.attachments = (t.attachments || []).filter((a: any) => a.id !== m![1]);
    }
    saveDemoDb();
    return ok({ success: true });
  }
  if ((m = path.match(/^\/api\/tasks\/links\/([^/]+)$/)) && method === "DELETE") {
    for (const t of db.tasks) {
      t.links = (t.links || []).filter((l: any) => l.id !== m![1]);
    }
    saveDemoDb();
    return ok({ success: true });
  }
  if ((m = path.match(/^\/api\/tasks\/([^/]+)\/position$/)) && method === "PATCH") {
    const task = db.tasks.find((t: any) => t.id === m![1]);
    if (!task) return fail(404, "Task not found");
    task.status = body.status ?? task.status;
    task.position = body.position ?? task.position;
    task.updatedAt = now();
    saveDemoDb();
    const resolved = resolveTask(db, task);
    broadcast("task:updated", resolved);
    return ok(resolved);
  }
  if ((m = path.match(/^\/api\/tasks\/([^/]+)\/subtasks$/)) && method === "POST") {
    const task = db.tasks.find((t: any) => t.id === m![1]);
    if (!task) return fail(404, "Task not found");
    task.subtasks ||= [];
    const sub = { id: uid("sub"), taskId: task.id, title: body.title || "Subtask", isCompleted: false, position: task.subtasks.length, createdAt: now(), updatedAt: now() };
    task.subtasks.push(sub);
    saveDemoDb();
    broadcast("task:updated", resolveTask(db, task));
    return created(sub);
  }
  if ((m = path.match(/^\/api\/tasks\/([^/]+)\/attachments$/)) && method === "POST") {
    const task = db.tasks.find((t: any) => t.id === m![1]);
    if (!task) return fail(404, "Task not found");
    task.attachments ||= [];
    const att = { id: uid("att"), taskId: task.id, createdAt: now(), ...body };
    task.attachments.push(att);
    saveDemoDb();
    broadcast("task:updated", resolveTask(db, task));
    return created({ ...att, user: userLite(findUser(db, att.userId)) });
  }
  if ((m = path.match(/^\/api\/tasks\/([^/]+)\/comments$/)) && method === "POST") {
    const task = db.tasks.find((t: any) => t.id === m![1]);
    if (!task) return fail(404, "Task not found");
    task.comments ||= [];
    const comment = {
      id: uid("comment"),
      taskId: task.id,
      userId: body.userId || DEMO_USER_ID,
      text: body.text || "",
      createdAt: now(),
      updatedAt: now(),
    };
    task.comments.push(comment);
    saveDemoDb();
    broadcast("task:updated", resolveTask(db, task));
    return created({ ...comment, user: userLite(findUser(db, comment.userId)) });
  }
  if ((m = path.match(/^\/api\/tasks\/([^/]+)\/comments\/([^/]+)$/)) && method === "DELETE") {
    const task = db.tasks.find((t: any) => t.id === m![1]);
    if (task) {
      task.comments = (task.comments || []).filter((c: any) => c.id !== m![2]);
      saveDemoDb();
      broadcast("task:updated", resolveTask(db, task));
    }
    return ok({ success: true });
  }
  if ((m = path.match(/^\/api\/tasks\/([^/]+)\/links$/)) && method === "GET") {
    return ok(taskLinks(db, m[1]));
  }
  if ((m = path.match(/^\/api\/tasks\/([^/]+)\/links$/)) && method === "POST") {
    const source = db.tasks.find((t: any) => t.id === m![1]);
    const target = db.tasks.find((t: any) => t.id === body.targetId);
    if (!source || !target) return fail(404, "Task not found");
    const link = { id: uid("link"), type: body.type || "relates", sourceId: source.id, targetId: target.id, createdAt: now() };
    source.links ||= [];
    source.links.push(link);
    saveDemoDb();
    return created({
      ...link,
      direction: "outgoing",
      source: { id: source.id, title: source.title, issueType: source.issueType, status: source.status },
      target: { id: target.id, title: target.title, issueType: target.issueType, status: target.status },
    });
  }
  if (path === "/api/task-watchers" && method === "POST") {
    const task = db.tasks.find((t: any) => t.id === body.taskId);
    if (!task) return fail(404, "Task not found");
    task.watchers ||= [];
    let watcher = task.watchers.find((w: any) => w.userId === body.userId);
    if (!watcher) {
      watcher = { id: uid("watch"), taskId: task.id, userId: body.userId, createdAt: now() };
      task.watchers.push(watcher);
      saveDemoDb();
    }
    return created({ ...watcher, user: userLite(findUser(db, watcher.userId)) });
  }
  if (path === "/api/task-watchers" && method === "DELETE") {
    const task = db.tasks.find((t: any) => t.id === q.get("taskId"));
    if (task) {
      task.watchers = (task.watchers || []).filter((w: any) => w.userId !== q.get("userId"));
      saveDemoDb();
    }
    return ok({ success: true });
  }
  if (path === "/api/tasks" && method === "GET") {
    const teamId = q.get("teamId");
    const assigneeId = q.get("assigneeId");
    const limit = Number(q.get("limit") || 500);
    const rows = db.tasks
      .filter((t: any) => (!teamId || t.teamId === teamId) && (!assigneeId || t.assigneeId === assigneeId))
      .sort((a: any, b: any) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
      .slice(0, limit)
      .map((t: any) => resolveTask(db, t));
    return ok(rows);
  }
  if (path === "/api/tasks" && method === "POST") {
    const status = body.status || "todo";
    const assigneeId = body.assigneeId || null;
    const task = {
      id: uid("task"),
      title: body.title || "Untitled task",
      description: body.description || "",
      priority: body.priority || "medium",
      status,
      issueType: body.issueType || "task",
      resolution: null,
      dueDate: body.dueDate || null,
      tags: body.tags || [],
      storyPoints: body.storyPoints ?? null,
      estimate: body.estimate ?? null,
      isRecurring: !!body.isRecurring,
      recurringPattern: body.recurringPattern || null,
      recurringInterval: body.recurringInterval || 1,
      recurringEndDate: body.recurringEndDate || null,
      position: nextTaskPosition(db, status, body.teamId),
      createdAt: now(),
      updatedAt: now(),
      assigneeId,
      reporterId: body.createdBy || DEMO_USER_ID,
      teamId: body.teamId || null,
      meetingId: body.meetingId || null,
      sprintId: db.sprints.find((s: any) => s.teamId === body.teamId)?.id || null,
      epicId: db.epics.find((e: any) => e.teamId === body.teamId)?.id || null,
      projectId: db.projects.find((p: any) => p.teamId === body.teamId)?.id || null,
      componentId: null,
      versionId: null,
      parentTaskId: null,
      subtasks: [],
      comments: [],
      activityLog: [{ id: uid("act"), taskId: "", action: "created", oldValue: null, newValue: null, userId: body.createdBy || DEMO_USER_ID, createdAt: now() }],
      attachments: [],
      watchers: [] as any[],
      links: [],
    };
    task.activityLog[0].taskId = task.id;
    for (const watcherId of body.watcherIds || []) {
      task.watchers.push({ id: uid("watch"), taskId: task.id, userId: watcherId, createdAt: now() });
    }
    db.tasks.unshift(task);
    saveDemoDb();
    const resolved = resolveTask(db, task);
    broadcast("task:created", resolved);
    return created(resolved);
  }
  if ((m = path.match(/^\/api\/tasks\/([^/]+)$/)) && method === "GET") {
    const task = db.tasks.find((t: any) => t.id === m![1]);
    return task ? ok(resolveTask(db, task)) : fail(404, "Task not found");
  }
  if ((m = path.match(/^\/api\/tasks\/([^/]+)$/)) && method === "PATCH") {
    const task = db.tasks.find((t: any) => t.id === m![1]);
    if (!task) return fail(404, "Task not found");
    const oldStatus = task.status;
    const patch = { ...body };
    delete patch.userId;
    delete patch.watcherIds;
    Object.assign(task, patch, { updatedAt: now() });
    if (patch.status && patch.status !== oldStatus) {
      task.activityLog ||= [];
      task.activityLog.push({
        id: uid("act"),
        taskId: task.id,
        action: "status_changed",
        oldValue: oldStatus,
        newValue: patch.status,
        userId: body.userId || DEMO_USER_ID,
        createdAt: now(),
      });
    }
    saveDemoDb();
    const resolved = resolveTask(db, task);
    broadcast("task:updated", resolved);
    return ok(resolved);
  }
  if ((m = path.match(/^\/api\/tasks\/([^/]+)$/)) && method === "DELETE") {
    db.tasks = db.tasks.filter((t: any) => t.id !== m![1]);
    saveDemoDb();
    broadcast("task:deleted", m[1]);
    return ok({ success: true });
  }

  /* ── meetings ── */
  if (path === "/api/meetings/quick-huddle" && method === "POST") {
    const code = `quick-huddle-${Math.random().toString(36).slice(2, 6)}`;
    const start = new Date();
    const meeting = {
      id: uid("meet"),
      title: "Quick Huddle",
      description: "Instant huddle",
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
      meetingCode: code,
      isInstant: true,
      allowScreenShare: true,
      status: "live",
      actualStartTime: start.toISOString(),
      actualEndTime: null,
      createdAt: now(),
      updatedAt: now(),
      teamId: null,
      hostId: DEMO_USER_ID,
      isRecurring: false,
      // Participants are added when someone actually joins the lobby, which
      // keeps the lobby from treating the creator as "already in the meeting".
      participants: [],
    };
    db.meetings.unshift(meeting);
    saveDemoDb();
    broadcast("meeting:created", resolveMeeting(db, meeting));
    return created({ ...resolveMeeting(db, meeting), meetingCode: code });
  }
  if ((m = path.match(/^\/api\/meetings\/code\/([^/]+)$/)) && method === "GET") {
    const meeting = db.meetings.find((x: any) => x.meetingCode === m![1] || x.id === m![1]);
    return meeting ? ok(resolveMeeting(db, meeting)) : fail(404, "Meeting not found");
  }
  if ((m = path.match(/^\/api\/meetings\/([^/]+)\/livekit-token$/)) && method === "GET") {
    return ok({ token: "demo-livekit-token", serverUrl: "wss://demo.invalid" });
  }
  if ((m = path.match(/^\/api\/meetings\/([^/]+)\/participants$/)) && method === "POST") {
    const meeting = db.meetings.find((x: any) => x.id === m![1] || x.meetingCode === m![1]);
    if (!meeting) return fail(404, "Meeting not found");
    const userId = body.userId || DEMO_USER_ID;
    if (!meeting.participants.some((p: any) => p.userId === userId)) {
      meeting.participants.push({ id: uid("mp"), meetingId: meeting.id, userId, role: "participant", joinedAt: now(), leftAt: null, duration: null, handRaised: false, isMuted: true, isVideoOn: false, isSharing: false });
      saveDemoDb();
    }
    return ok(resolveMeeting(db, meeting));
  }
  if ((m = path.match(/^\/api\/meetings\/([^/]+)\/end$/)) && method === "POST") {
    const meeting = db.meetings.find((x: any) => x.id === m![1] || x.meetingCode === m![1]);
    if (meeting) {
      meeting.status = "ended";
      meeting.actualEndTime = now();
      saveDemoDb();
      broadcast("meeting:updated", resolveMeeting(db, meeting));
    }
    return ok({ success: true });
  }
  if (path === "/api/meetings" && method === "GET") {
    const status = q.get("status");
    const teamId = q.get("teamId");
    const rows = db.meetings
      .filter((x: any) => {
        if (teamId && x.teamId !== teamId) return false;
        if (status === "upcoming") return x.status !== "ended";
        if (status && status !== "all") return x.status === status;
        return true;
      })
      .sort((a: any, b: any) => +new Date(a.startTime) - +new Date(b.startTime))
      .map((x: any) => resolveMeeting(db, x));
    return ok(rows);
  }
  if (path === "/api/meetings" && method === "POST") {
    const meeting = {
      id: uid("meet"),
      title: body.title || "New meeting",
      description: body.description || "",
      startTime: body.startTime || now(),
      endTime: body.endTime || new Date(Date.now() + 3600e3).toISOString(),
      meetingCode: `meet-${Math.random().toString(36).slice(2, 7)}`,
      isInstant: !!body.isInstant,
      allowScreenShare: body.allowScreenShare !== false,
      status: body.status === "live" ? "live" : "scheduled",
      actualStartTime: null,
      actualEndTime: null,
      createdAt: now(),
      updatedAt: now(),
      teamId: body.teamId || null,
      hostId: body.hostId || DEMO_USER_ID,
      isRecurring: !!body.isRecurring,
      recurringPattern: body.recurringPattern || null,
      participants: [],
    };
    db.meetings.push(meeting);
    saveDemoDb();
    const resolved = resolveMeeting(db, meeting);
    broadcast("meeting:created", resolved);
    return created(resolved);
  }
  if ((m = path.match(/^\/api\/meetings\/([^/]+)$/)) && method === "GET") {
    const meeting = db.meetings.find((x: any) => x.id === m![1] || x.meetingCode === m![1]);
    return meeting ? ok(resolveMeeting(db, meeting)) : fail(404, "Meeting not found");
  }
  if ((m = path.match(/^\/api\/meetings\/([^/]+)$/)) && method === "PATCH") {
    const meeting = db.meetings.find((x: any) => x.id === m![1] || x.meetingCode === m![1]);
    if (!meeting) return fail(404, "Meeting not found");
    Object.assign(meeting, body, { updatedAt: now() });
    saveDemoDb();
    const resolved = resolveMeeting(db, meeting);
    broadcast("meeting:updated", resolved);
    return ok(resolved);
  }
  if ((m = path.match(/^\/api\/meetings\/([^/]+)$/)) && method === "DELETE") {
    db.meetings = db.meetings.filter((x: any) => x.id !== m![1] && x.meetingCode !== m![1]);
    saveDemoDb();
    broadcast("meeting:deleted", m[1]);
    return ok({ success: true });
  }

  /* ── meeting minutes ── */
  if ((m = path.match(/^\/api\/meeting-minutes\/meeting\/([^/]+)$/)) && method === "GET") {
    return ok(db.meetingMinutes.filter((x: any) => x.meetingId === m![1]));
  }
  if (path === "/api/meeting-minutes" && method === "POST") {
    const minutes = {
      id: uid("minutes"),
      meetingId: body.meetingId,
      title: body.title || "Meeting minutes",
      content: body.content || "",
      actionItems: body.actionItems || [],
      decisions: body.decisions || [],
      attendees: body.attendees || [],
      createdBy: DEMO_USER_ID,
      createdAt: now(),
      updatedAt: now(),
    };
    db.meetingMinutes.push(minutes);
    saveDemoDb();
    return created(minutes);
  }
  if ((m = path.match(/^\/api\/meeting-minutes\/([^/]+)$/)) && method === "PATCH") {
    const minutes = db.meetingMinutes.find((x: any) => x.id === m![1]);
    if (!minutes) return fail(404, "Minutes not found");
    Object.assign(minutes, body, { updatedAt: now() });
    saveDemoDb();
    return ok(minutes);
  }
  if ((m = path.match(/^\/api\/meeting-minutes\/([^/]+)$/)) && method === "DELETE") {
    db.meetingMinutes = db.meetingMinutes.filter((x: any) => x.id !== m![1]);
    saveDemoDb();
    return ok({ success: true });
  }

  /* ── notifications ── */
  if (path === "/api/notifications/unread-count" && method === "GET") {
    return ok(db.notifications.filter((n: any) => n.userId === DEMO_USER_ID && !n.read).length);
  }
  if (path === "/api/notifications/preferences" && method === "GET") {
    return ok(db.notificationPreferences);
  }
  if (path === "/api/notifications/preferences" && method === "PATCH") {
    Object.assign(db.notificationPreferences, body);
    saveDemoDb();
    return ok(db.notificationPreferences);
  }
  if (path === "/api/notifications/read-all" && method === "PATCH") {
    db.notifications.forEach((n: any) => (n.read = true));
    saveDemoDb();
    return ok({ success: true });
  }
  if (path === "/api/notifications/digests" && method === "GET") {
    const limit = Number(q.get("limit") || 10);
    const type = q.get("digestType");
    return ok(db.notificationDigests.filter((d: any) => !type || d.digestType === type).slice(0, limit));
  }
  if ((m = path.match(/^\/api\/notifications\/digests\/([^/]+)\/read$/)) && method === "PATCH") {
    const digest = db.notificationDigests.find((d: any) => d.id === m![1]);
    if (digest) {
      digest.isRead = true;
      digest.readAt = now();
      saveDemoDb();
    }
    return ok({ success: true });
  }
  if (path === "/api/notifications" && method === "GET") {
    const read = q.get("read");
    const rows = db.notifications
      .filter((n: any) => n.userId === DEMO_USER_ID)
      .filter((n: any) => (read === null ? true : read === "true" ? n.read : !n.read))
      .sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return ok(rows);
  }
  if ((m = path.match(/^\/api\/notifications\/([^/]+)\/read$/)) && method === "PATCH") {
    const n = db.notifications.find((x: any) => x.id === m![1]);
    if (n) {
      n.read = true;
      saveDemoDb();
    }
    return ok({ success: true });
  }
  if ((m = path.match(/^\/api\/notifications\/([^/]+)$/)) && method === "DELETE") {
    db.notifications = db.notifications.filter((x: any) => x.id !== m![1]);
    saveDemoDb();
    return ok({ success: true });
  }

  /* ── reminders ── */
  if (path === "/api/reminders" && method === "GET") {
    const isSent = q.get("isSent");
    const rows = db.reminders
      .filter((r: any) => (isSent === null ? true : isSent === "true" ? r.isSent : !r.isSent))
      .sort((a: any, b: any) => +new Date(a.remindAt) - +new Date(b.remindAt))
      .map((r: any) => resolveReminder(db, r));
    return ok(rows);
  }
  if (path === "/api/reminders" && method === "POST") {
    const ids: string[] = body.userIds || [DEMO_USER_ID];
    const reminder = {
      id: uid("rem"),
      title: body.title || "Reminder",
      description: body.description || "",
      type: body.type || "general",
      relatedId: null,
      relatedType: null,
      remindAt: body.remindAt || now(),
      isSent: false,
      createdBy: body.createdBy || DEMO_USER_ID,
      createdAt: now(),
      recipients: ids.map((userId) => ({
        id: uid("rr"),
        userId,
        isRead: false,
        readAt: null,
        user: userLite(findUser(db, userId)),
      })),
    };
    db.reminders.push(reminder);
    saveDemoDb();
    const resolved = resolveReminder(db, reminder);
    broadcast("reminder:created", resolved);
    return created(resolved);
  }
  if ((m = path.match(/^\/api\/reminders\/([^/]+)\/read$/)) && method === "PATCH") {
    const reminder = db.reminders.find((r: any) => r.id === m![1]);
    if (reminder) {
      const recipient = reminder.recipients.find((x: any) => x.userId === (body.userId || DEMO_USER_ID));
      if (recipient) {
        recipient.isRead = true;
        recipient.readAt = now();
      }
      saveDemoDb();
    }
    return ok({ success: true });
  }
  if ((m = path.match(/^\/api\/reminders\/([^/]+)$/)) && method === "PATCH") {
    const reminder = db.reminders.find((r: any) => r.id === m![1]);
    if (!reminder) return fail(404, "Reminder not found");
    const patch = { ...body };
    delete patch.userId;
    Object.assign(reminder, patch, { updatedAt: now() });
    saveDemoDb();
    const resolved = resolveReminder(db, reminder);
    broadcast("reminder:updated", resolved);
    return ok(resolved);
  }
  if ((m = path.match(/^\/api\/reminders\/([^/]+)$/)) && method === "DELETE") {
    db.reminders = db.reminders.filter((r: any) => r.id !== m![1]);
    saveDemoDb();
    broadcast("reminder:deleted", m[1]);
    return ok({ success: true });
  }

  /* ── drive ── */
  if ((m = path.match(/^\/api\/drive\/teams\/([^/]+)\/folders$/)) && method === "POST") {
    const folder = {
      id: uid("folder"),
      name: body.name || "New folder",
      path: body.path || "/",
      isFolder: true,
      teamId: m[1],
      createdById: body.createdById || DEMO_USER_ID,
      createdAt: now(),
      updatedAt: now(),
      versions: [],
      permissions: [],
    };
    db.driveEntries.push(folder);
    saveDemoDb();
    return created(resolveDriveEntry(db, folder));
  }
  if ((m = path.match(/^\/api\/drive\/teams\/([^/]+)\/upload$/)) && method === "POST") {
    const teamId = m[1];
    const file = form?.get("file");
    const pathValue = String(form?.get("path") || "/");
    const createdById = String(form?.get("createdById") || DEMO_USER_ID);
    if (!(file instanceof File)) return fail(400, "No file provided");
    const url = await fileToUrl(file);
    const entryId = uid("file");
    const entry = {
      id: entryId,
      name: file.name,
      path: pathValue,
      isFolder: false,
      teamId,
      createdById,
      createdAt: now(),
      updatedAt: now(),
      versions: [
        {
          id: uid("ver"),
          entryId,
          version: 1,
          storageKey: entryId,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          url,
          createdAt: now(),
          createdBy: userLite(findUser(db, createdById)),
        },
      ],
      permissions: [],
    };
    db.driveEntries.push(entry);
    saveDemoDb();
    return created(resolveDriveEntry(db, entry));
  }
  if ((m = path.match(/^\/api\/drive\/teams\/([^/]+)$/)) && method === "GET") {
    const teamId = m[1];
    const pathValue = q.get("path") || "/";
    const rows = db.driveEntries
      .filter((e: any) => e.teamId === teamId && (q.get("search") ? true : e.path === pathValue))
      .sort((a: any, b: any) => (a.isFolder === b.isFolder ? a.name.localeCompare(b.name) : a.isFolder ? -1 : 1))
      .map((e: any) => resolveDriveEntry(db, e));
    return ok(rows);
  }
  if ((m = path.match(/^\/api\/drive\/entries\/([^/]+)\/versions$/)) && method === "GET") {
    const entry = db.driveEntries.find((e: any) => e.id === m![1]);
    if (!entry) return fail(404, "Entry not found");
    return ok({
      id: entry.id,
      name: entry.name,
      path: entry.path,
      isFolder: entry.isFolder,
      versions: (entry.versions || []).map((v: any) => ({ ...v })).reverse(),
    });
  }
  if ((m = path.match(/^\/api\/drive\/entries\/([^/]+)\/permissions$/)) && method === "GET") {
    const entry = db.driveEntries.find((e: any) => e.id === m![1]);
    return ok((entry?.permissions || []).map((p: any) => ({ ...p, user: userLite(findUser(db, p.userId)) })));
  }
  if ((m = path.match(/^\/api\/drive\/entries\/([^/]+)\/permissions$/)) && method === "POST") {
    const entry = db.driveEntries.find((e: any) => e.id === m![1]);
    if (!entry) return fail(404, "Entry not found");
    entry.permissions ||= [];
    const existing = entry.permissions.find((p: any) => p.userId === body.userId);
    if (existing) existing.permission = body.permission || "view";
    else entry.permissions.push({ id: uid("perm"), entryId: entry.id, userId: body.userId, permission: body.permission || "view", createdAt: now(), updatedAt: now() });
    saveDemoDb();
    return ok((entry.permissions || []).map((p: any) => ({ ...p, user: userLite(findUser(db, p.userId)) })));
  }
  if ((m = path.match(/^\/api\/drive\/entries\/([^/]+)\/permissions\/([^/]+)$/)) && method === "DELETE") {
    const entry = db.driveEntries.find((e: any) => e.id === m![1]);
    if (entry) {
      entry.permissions = (entry.permissions || []).filter((p: any) => p.userId !== m![2]);
      saveDemoDb();
    }
    return ok({ success: true });
  }
  if ((m = path.match(/^\/api\/drive\/entries\/([^/]+)$/)) && method === "DELETE") {
    db.driveEntries = db.driveEntries.filter((e: any) => e.id !== m![1]);
    saveDemoDb();
    return ok({ success: true });
  }

  /* ── wiki ── */
  if (path === "/api/wiki/articles" && method === "GET") {
    return ok(
      db.wikiArticles.map((a: any) => ({
        ...a,
        creator: userLite(findUser(db, a.createdBy)),
        team: a.teamId ? { id: a.teamId, name: db.teams.find((t: any) => t.id === a.teamId)?.name } : null,
      })),
    );
  }
  if (path === "/api/wiki/articles" && method === "POST") {
    const article = {
      id: uid("wiki"),
      title: body.title || "Untitled",
      content: body.content || "",
      category: body.category || null,
      tags: body.tags || [],
      isPublic: body.isPublic !== false,
      teamId: body.teamId || null,
      createdBy: DEMO_USER_ID,
      version: 1,
      viewCount: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    db.wikiArticles.unshift(article);
    saveDemoDb();
    return created({
      ...article,
      creator: userLite(findUser(db, article.createdBy)),
      team: article.teamId ? { id: article.teamId, name: db.teams.find((t: any) => t.id === article.teamId)?.name } : null,
    });
  }
  if ((m = path.match(/^\/api\/wiki\/articles\/([^/]+)\/view$/)) && method === "PATCH") {
    const article = db.wikiArticles.find((a: any) => a.id === m![1]);
    if (article) {
      article.viewCount = (article.viewCount || 0) + 1;
      saveDemoDb();
    }
    return ok({ success: true });
  }
  if ((m = path.match(/^\/api\/wiki\/articles\/([^/]+)$/)) && method === "PATCH") {
    const article = db.wikiArticles.find((a: any) => a.id === m![1]);
    if (!article) return fail(404, "Article not found");
    Object.assign(article, body, { updatedAt: now(), version: (article.version || 1) + 1 });
    saveDemoDb();
    return ok(article);
  }
  if ((m = path.match(/^\/api\/wiki\/articles\/([^/]+)$/)) && method === "DELETE") {
    db.wikiArticles = db.wikiArticles.filter((a: any) => a.id !== m![1]);
    saveDemoDb();
    return ok({ success: true });
  }

  /* ── announcements ── */
  if (path === "/api/announcements" && method === "GET") {
    return ok(
      db.announcements
        .slice()
        .sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .map((a: any) => ({ ...a, creator: userLite(findUser(db, a.createdBy)) })),
    );
  }
  if (path === "/api/announcements" && method === "POST") {
    const ann = {
      id: uid("ann"),
      title: body.title || "Announcement",
      content: body.content || "",
      priority: body.priority || "normal",
      targetType: body.targetType || "all",
      targetIds: body.targetIds || [],
      attachments: [],
      createdBy: DEMO_USER_ID,
      expiresAt: body.expiresAt || null,
      status: "active",
      createdAt: now(),
      updatedAt: now(),
      isRead: false,
    };
    db.announcements.unshift(ann);
    saveDemoDb();
    const resolved = { ...ann, creator: userLite(findUser(db, ann.createdBy)) };
    broadcast("announcement:created", resolved);
    return created(resolved);
  }
  if ((m = path.match(/^\/api\/announcements\/([^/]+)$/)) && method === "PATCH") {
    const ann = db.announcements.find((a: any) => a.id === m![1]);
    if (!ann) return fail(404, "Announcement not found");
    Object.assign(ann, body, { updatedAt: now() });
    saveDemoDb();
    broadcast("announcement:updated", ann);
    return ok(ann);
  }
  if ((m = path.match(/^\/api\/announcements\/([^/]+)$/)) && method === "DELETE") {
    db.announcements = db.announcements.filter((a: any) => a.id !== m![1]);
    saveDemoDb();
    broadcast("announcement:deleted", m[1]);
    return ok({ success: true });
  }

  /* ── holidays ── */
  if (path === "/api/holidays/range" && method === "GET") {
    const start = new Date(q.get("startDate") || Date.now() - 365 * 864e5);
    const end = new Date(q.get("endDate") || Date.now() + 365 * 864e5);
    return ok(
      db.holidays.filter((h: any) => {
        const d = new Date(h.date);
        return d >= start && d <= end;
      }),
    );
  }
  if (path === "/api/holidays" && method === "GET") {
    return ok(db.holidays);
  }

  /* ── directory / admin ── */
  if (path === "/api/audit-logs" && method === "GET") {
    const entity = q.get("entity");
    const userId = q.get("userId");
    const action = q.get("action");
    const limit = Number(q.get("limit") || 200);
    return ok(
      db.auditLogs
        .filter((l: any) => (!entity || l.entity === entity) && (!userId || l.userId === userId) && (!action || l.action === action))
        .slice(0, limit),
    );
  }
  if ((m = path.match(/^\/api\/permissions\/([^/]+)\/seed$/)) && method === "POST") {
    const db2 = getDemoDb();
    // Rebuild defaults from the bundled seed.
    const { createDemoDb } = await import("./seed");
    const fresh = createDemoDb();
    db2.permissions = fresh.permissions;
    saveDemoDb();
    return ok(db2.permissions);
  }
  if ((m = path.match(/^\/api\/permissions\/([^/]+)$/)) && method === "GET") {
    return ok(db.permissions);
  }
  if ((m = path.match(/^\/api\/permissions\/([^/]+)$/)) && method === "PUT") {
    if (Array.isArray(body.permissions)) db.permissions = body.permissions;
    saveDemoDb();
    return ok(db.permissions);
  }
  if ((m = path.match(/^\/api\/invites\/organization\/([^/]+)$/)) && method === "GET") {
    return ok(db.invites);
  }
  if (path === "/api/invites" && method === "POST") {
    const invite = {
      id: uid("inv"),
      email: body.email,
      token: uid("token"),
      role: body.role || "employee",
      teamId: body.teamId || null,
      teamRole: body.teamRole || null,
      invitedBy: body.invitedBy || DEMO_USER_ID,
      organizationId: DEMO_ORG_ID,
      expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(),
      usedAt: null,
      createdAt: now(),
    };
    db.invites.push(invite);
    saveDemoDb();
    return created(invite);
  }
  if ((m = path.match(/^\/api\/invites\/([^/]+)$/)) && method === "DELETE") {
    db.invites = db.invites.filter((i: any) => i.id !== m![1] && i.token !== m![1]);
    saveDemoDb();
    return ok({ success: true });
  }

  /* ── reports ── */
  if (path === "/api/reports/performance" && method === "GET") {
    return ok(buildPerformance(db));
  }
  if (path === "/api/reports/team-productivity" && method === "GET") {
    return ok(buildTeamProductivity(db, q.get("teamId") || db.teams[0].id));
  }
  if ((m = path.match(/^\/api\/reports\/teams\/([^/]+)\/workload$/)) && method === "GET") {
    return ok(buildWorkload(db, m[1]));
  }
  if (path === "/api/reports/export" && method === "GET") {
    // Deliberately unavailable — the Reports page falls back to client-side export.
    return fail(404, "Export is generated in the browser in demo mode");
  }
  if (path === "/api/reports" && method === "GET") {
    return ok(buildReports(db, q.get("range") || "month"));
  }
  if (path.startsWith("/api/reports/")) {
    return ok({});
  }

  /* ── uploads ── */
  if ((path === "/api/upload" || path === "/api/storage/upload") && method === "POST") {
    const file = form?.get("file");
    if (!(file instanceof File)) return fail(400, "No file provided");
    const url = await fileToUrl(file);
    return raw({
      url,
      name: file.name,
      mimetype: file.type || "application/octet-stream",
      size: file.size,
    });
  }

  /* ── fallback ── */
  if (path.startsWith("/api/")) {
    // Known-but-not-implemented endpoint: return a harmless empty payload.
    if (method === "GET") return ok([]);
    return ok({ success: true });
  }

  return null;
}
