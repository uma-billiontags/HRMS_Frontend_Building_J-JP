import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    ClipboardList,
    // ClipboardCheck,
    History,
    BarChart3,
    LogOut,
    UsersRound,
    CalendarCheck,
    // FolderOpen,
    FolderKanban,
    // AlarmClock,
    Mail,
    Inbox,
    // Send,
    RefreshCw,
    Menu,
    // Award,
    type LucideIcon,
} from "lucide-react";
import { useAuth } from "./AuthContext";

// ── Nav config ──────────────────────────────────────────────────────────────

interface NavItem {
    label: string;
    icon: LucideIcon;
    to: string;
}

interface NavGroup {
    section?: string;
    items: NavItem[];
}

const ADMIN_NAV: NavGroup[] = [
    {
        section: "OVERVIEW",
        items: [
            { label: "Dashboard", icon: LayoutDashboard, to: "/admin/dashboard" },
            { label: "Departments", icon: FolderKanban, to: "/admin/departments" },
        ],
    },
    {
        section: "MANAGEMENT",
        items: [
            { label: "Team Access", icon: UsersRound, to: "/admin/team_access" },
            { label: "Attendance", icon: CalendarCheck, to: "/admin/attendance" },
            { label: "Team Requests", icon: Inbox, to: "/admin/requests" },
        ],
    },
    {
        section: "INSIGHTS",
        items: [
            { label: "Reports", icon: BarChart3, to: "/admin/reports" },
            { label: "Audit History", icon: History, to: "/admin/audit_history" },
        ],
    },
];

// Preserved Previous Task Navs (kept for reference per user request):
// const PRESERVED_ADMIN_TASKS_NAV: NavGroup[] = [
//     {
//         section: "TASKS",
//         items: [
//             { label: "Assigned Tasks", icon: LayoutDashboard, to: "/admin/my_tasks" },
//             { label: "Upcoming Tasks", icon: CalendarDays, to: "/admin/my_upcoming_tasks" },
//             { label: "Submitted Tasks", icon: Send, to: "/admin/my_submitted_tasks" },
//             { label: "Completed Tasks", icon: CheckCircle2, to: "/admin/my_completed_tasks" },
//         ],
//     },
//     {
//         section: "TEAM TASKS",
//         items: [
//             { label: "All Tasks", icon: ClipboardList, to: "/admin/all_tasks" },
//             { label: "Open Tasks", icon: FolderOpen, to: "/admin/open_tasks" },
//             { label: "Overdue Tasks", icon: AlarmClock, to: "/admin/overdue_tasks" },
//             { label: "Rework Tasks", icon: ClipboardList, to: "/admin/rework_tasks" },
//             { label: "Review Tasks", icon: ClipboardCheck, to: "/admin/review_tasks" },
//             { label: "Upcoming Scheduled", icon: CalendarDays, to: "/admin/upcoming_scheduled_tasks" },
//             { label: "Completed Tasks", icon: CheckCircle2, to: "/admin/completed_tasks" },
//             { label: "Cancel Tasks", icon: XCircle, to: "/admin/cancel_tasks" },
//         ],
//     },
// ];

const EMPLOYEE_NAV: NavGroup[] = [
    {
        section: "OVERVIEW",
        items: [{ label: "Dashboard", icon: LayoutDashboard, to: "/employee/dashboard" }],
    },
    {
        section: "TASKS",
        items: [
            { label: "Normal Tasks", icon: ClipboardList, to: "/employee/normal_tasks" },
            { label: "Recurring Tasks", icon: RefreshCw, to: "/employee/recurring_tasks" },
        ],
    },
    {
        section: "ATTENDANCE",
        items: [{ label: "Attendance", icon: CalendarCheck, to: "/employee/attendance" }],
    },
    {
        section: "REQUESTS",
        items: [{ label: "Requests", icon: Mail, to: "/employee/requests" }],
    },
    {
        section: "INSIGHTS",
        items: [
            { label: "Reports", icon: BarChart3, to: "/employee/reports" },
            { label: "Audit History", icon: History, to: "/employee/audit_history" },
        ],
    },
];

// ── Props ───────────────────────────────────────────────────────────────────

interface SidebarProps {
    role: "admin" | "employee";
    userName: string;
    collapsed?: boolean;
    onToggle?: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function Sidebar({ role, userName, onToggle }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const nav = role === "admin" ? ADMIN_NAV : EMPLOYEE_NAV;

    function handleLogout() {
        logout();
        navigate("/login", { replace: true });
    }

    return (
        <aside className="db-sidebar">
            {/* Brand Header */}
            <div className="db-logo" style={{ padding: "16px 16px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--sb-text-bright)", letterSpacing: "0.03em" }}>
                        HRMS
                    </div>
                    <div style={{ fontSize: 11, color: "var(--sb-text-dim)", marginTop: 2 }}>
                        Workspace
                    </div>
                </div>
                {onToggle && (
                    <button
                        type="button"
                        onClick={onToggle}
                        title="Collapse sidebar"
                        aria-label="Collapse sidebar"
                        style={{
                            background: "transparent",
                            border: "1px solid var(--sb-border, #f3e8ee)",
                            borderRadius: 6,
                            padding: "5px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--sb-text, #4B5563)",
                            transition: "all 0.15s ease",
                        }}
                    >
                        <Menu size={18} />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="db-nav">
                {nav.map((group, gi) => (
                    <div key={gi}>
                        {group.section && <div className="db-nav-section">{group.section}</div>}

                        {group.items.map((item) => {
                            const active =
                                location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    className={`db-nav-item${active ? " active" : ""}`}
                                    style={{ textDecoration: "none" }}
                                >
                                    <span className="db-nav-icon">
                                        <Icon size={16} strokeWidth={1.8} />
                                    </span>
                                    <span className="db-nav-label">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="db-sidebar-footer">
                <div className="db-sidebar-user">
                    <div className="db-sidebar-avatar">{userName.charAt(0).toUpperCase()}</div>
                    <div>
                        <div className="db-sidebar-uname">{userName}</div>
                        <div className="db-sidebar-urole">
                            {role === "admin" ? "ADMINISTRATOR" : "EMPLOYEE"}
                        </div>
                    </div>
                </div>


                <div
                    onClick={handleLogout}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 10px",
                        borderRadius: 8,
                        color: "var(--red)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    <LogOut size={14} /> Sign Out
                </div>
            </div>
        </aside>
    );
}


