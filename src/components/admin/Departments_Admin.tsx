import { useEffect, useState, useMemo } from "react";
import { Input, Button, Spin, Progress, Empty, Tooltip, Modal, message } from "antd";
import {
    SearchOutlined,
    ReloadOutlined,
    ArrowLeftOutlined,
    FolderOutlined,
    TeamOutlined,
    RightOutlined,
    AppstoreOutlined,
    CheckCircleOutlined,
    PlusOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import JiraProjectView from "./JiraProjectView";

const BASE_URL = import.meta.env.VITE_BASE_URL;

function authHeaders(): HeadersInit {
    try {
        const raw = localStorage.getItem("task_tracker_auth");
        if (!raw) return {};
        const { token } = JSON.parse(raw);
        return token ? { Authorization: `Token ${token}` } : {};
    } catch {
        return {};
    }
}

// ── Elegant Palettes (rooted in #D14E9A raspberry orchid & joyful pastels) ──
const CARD_PALETTES = [
    {
        name: "tech",
        // Radiant Raspberry Orchid (matches #D14E9A)
        gradient: "linear-gradient(135deg, #DE5EA8 0%, #D14E9A 60%, #B83681 100%)",
        accent: "#D14E9A",
        lightBg: "rgba(209, 78, 154, 0.08)",
        border: "#FBCFE8",
        chipBg: "#FDF2F8",
        chipText: "#B83681",
    },
    {
        name: "campaign",
        // Soft Lavender & Lilac
        gradient: "linear-gradient(135deg, #9370DB 0%, #A488E4 60%, #BAA2EB 100%)",
        accent: "#9370DB",
        lightBg: "rgba(147, 112, 219, 0.08)",
        border: "#DDD6FE",
        chipBg: "#F5F3FF",
        chipText: "#6D28D9",
    },
    {
        name: "design",
        // Muted Sky & Powder Blue
        gradient: "linear-gradient(135deg, #4A90E2 0%, #68A4E9 60%, #8CB9F0 100%)",
        accent: "#4A90E2",
        lightBg: "rgba(74, 144, 226, 0.08)",
        border: "#BAE6FD",
        chipBg: "#F0F9FF",
        chipText: "#0369A1",
    },
    {
        name: "marketing",
        // Soft Sage & Mint
        gradient: "linear-gradient(135deg, #38A169 0%, #48BB78 60%, #68D391 100%)",
        accent: "#38A169",
        lightBg: "rgba(56, 161, 105, 0.08)",
        border: "#A7F3D0",
        chipBg: "#F0FDF4",
        chipText: "#047857",
    },
    {
        name: "sales",
        // Warm Terracotta & Peach
        gradient: "linear-gradient(135deg, #DD6B20 0%, #ED8936 60%, #F6AD55 100%)",
        accent: "#ED8936",
        lightBg: "rgba(237, 137, 54, 0.08)",
        border: "#FED7AA",
        chipBg: "#FFF7ED",
        chipText: "#C2410C",
    },
    {
        name: "operations",
        // Deep Crimson & Peony Wine
        gradient: "linear-gradient(135deg, #9B1C38 0%, #B82548 60%, #CF3D60 100%)",
        accent: "#B82548",
        lightBg: "rgba(184, 37, 72, 0.08)",
        border: "#FECDD3",
        chipBg: "#FFF1F2",
        chipText: "#9F1239",
    },
    {
        name: "finance",
        // Soft Ocean Teal
        gradient: "linear-gradient(135deg, #319795 0%, #38B2AC 60%, #4FD1C5 100%)",
        accent: "#319795",
        lightBg: "rgba(49, 151, 149, 0.08)",
        border: "#99F6E4",
        chipBg: "#F0FDFA",
        chipText: "#0F766E",
    },
    {
        name: "product",
        // Sweet Candy Rose (matching hoodie heart)
        gradient: "linear-gradient(135deg, #D53F8C 0%, #ED64A6 60%, #F687B3 100%)",
        accent: "#D53F8C",
        lightBg: "rgba(213, 63, 140, 0.08)",
        border: "#FBCFE8",
        chipBg: "#FDF2F8",
        chipText: "#BE185D",
    },
];

interface DepartmentData {
    name: string;
    prefix: string;
    members_count: number;
    team_leads: string[];
    projects_count: number;
    projects: string[];
    total_tasks: number;
    open_tasks: number;
    completed_tasks: number;
    review_tasks: number;
    rework_tasks: number;
    completion_rate: number;
    normal_tasks_count?: number;
    normal_projects_count?: number;
    normal_projects?: string[];
    normal_completion_rate?: number;
    recurring_tasks_count?: number;
    recurring_projects_count?: number;
    recurring_projects?: string[];
    recurring_completion_rate?: number;
}

interface ProjectData {
    project_name: string;
    department: string;
    total_tasks: number;
    open_tasks: number;
    completed_tasks: number;
    review_tasks: number;
    rework_tasks: number;
    completion_rate: number;
    assignees: string[];
}

export default function Departments_Admin() {
    const navigate = useNavigate();
    const [departments, setDepartments] = useState<DepartmentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Selected department view for drill-down into its projects
    const [selectedDept, setSelectedDept] = useState<DepartmentData | null>(null);
    const [selectedMode, setSelectedMode] = useState<"normal" | "recurring" | null>(null);
    const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
    const [projects, setProjects] = useState<ProjectData[]>([]);
    const [projectsLoading, setProjectsLoading] = useState(false);
    const [addDeptModalOpen, setAddDeptModalOpen] = useState(false);
    const [newDeptName, setNewDeptName] = useState("");
    const [savingDept, setSavingDept] = useState(false);

    const handleSaveDepartment = async () => {
        const name = newDeptName.trim();
        if (!name) {
            message.error("Department name is required");
            return;
        }
        setSavingDept(true);
        try {
            const res = await fetch(`${BASE_URL}/api/auth/employees/departments/create/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ name }),
            });
            if (res.ok) {
                message.success(`Department "${name}" created successfully`);
                setAddDeptModalOpen(false);
                setNewDeptName("");
                fetchDepartments();
            } else {
                const err = await res.json().catch(() => ({}));
                message.error(err.detail || "Failed to create department");
            }
        } catch {
            message.error("Failed to create department");
        } finally {
            setSavingDept(false);
        }
    };

    // Fetch Departments Overview
    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BASE_URL}/api/tasks/departments/overview/`, {
                headers: authHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                setDepartments(data);
            } else {
                const fallbackRes = await fetch(`${BASE_URL}/api/tasks/get_all_departments/`, {
                    headers: authHeaders(),
                });
                if (fallbackRes.ok) {
                    const fallbackData = await fallbackRes.json();
                    setDepartments(
                        fallbackData.map((d: { name: string }) => ({
                            name: d.name,
                            prefix: d.name.substring(0, 3).toUpperCase(),
                            members_count: 0,
                            team_leads: [],
                            projects_count: 0,
                            projects: [],
                            total_tasks: 0,
                            open_tasks: 0,
                            completed_tasks: 0,
                            review_tasks: 0,
                            rework_tasks: 0,
                            completion_rate: 0,
                        }))
                    );
                }
            }
        } catch (err) {
            console.error("Failed to fetch departments overview:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    // When a department is selected, open the Mode Selection (Two Separate Boxes)
    const handleSelectDepartment = (dept: DepartmentData) => {
        setSelectedDept(dept);
        setSelectedMode(null);
        setSelectedProject(null);
        setSearchQuery("");
    };

    // When Normal or Recurring Tasks box is clicked, load the belonging projects
    const handleSelectMode = async (mode: "normal" | "recurring") => {
        if (!selectedDept) return;
        setSelectedMode(mode);
        setSelectedProject(null);
        setProjectsLoading(true);
        try {
            const res = await fetch(
                `${BASE_URL}/api/tasks/departments/projects/?department=${encodeURIComponent(selectedDept.name)}&mode=${mode}`,
                { headers: authHeaders() }
            );
            if (res.ok) {
                const data = await res.json();
                setProjects(data);
            } else {
                setProjects([]);
            }
        } catch (err) {
            console.error("Failed to fetch projects for mode:", err);
            setProjects([]);
        } finally {
            setProjectsLoading(false);
        }
    };

    // Filter departments
    const filteredDepartments = useMemo(() => {
        if (!searchQuery.trim()) return departments;
        const q = searchQuery.toLowerCase();
        return departments.filter(
            (d) =>
                d.name.toLowerCase().includes(q) ||
                d.prefix.toLowerCase().includes(q)
        );
    }, [departments, searchQuery]);

    // Filter projects inside selected department
    const filteredProjects = useMemo(() => {
        if (!searchQuery.trim()) return projects;
        const q = searchQuery.toLowerCase();
        return projects.filter((p) => p.project_name.toLowerCase().includes(q));
    }, [projects, searchQuery]);

    // High level summary totals
    const totalDepartmentsCount = departments.length;
    const totalProjectsCount = departments.reduce((acc, d) => acc + (d.projects_count || 0), 0);
    const totalMembersCount = departments.reduce((acc, d) => acc + (d.members_count || 0), 0);
    const totalTasksCount = departments.reduce((acc, d) => acc + (d.total_tasks || 0), 0);

    // If a project or mode is selected, render the Jira Project Workspace (Screenshot Clone)
    if (selectedDept && selectedMode) {
        return (
            <JiraProjectView
                project={selectedProject || { project_name: "", department: selectedDept.name }}
                department={selectedDept}
                mode={selectedMode}
                initialTab={selectedMode === "normal" ? "trello" : "list"}
                onBack={() => {
                    setSelectedMode(null);
                    setSelectedProject(null);
                }}
            />
        );
    }

    return (
        <div style={{ padding: "26px 32px", maxWidth: 1440, margin: "0 auto" }}>
            <style>{`
                .trello-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 24px;
                }
                @media (max-width: 1100px) {
                    .trello-cards-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }
                @media (max-width: 700px) {
                    .trello-cards-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .dept-card {
                    background: #ffffff;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
                    overflow: hidden;
                    cursor: pointer;
                    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
                    display: flex;
                    flex-direction: column;
                }
                .dept-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 16px 32px -6px rgba(20, 40, 79, 0.16);
                    border-color: rgba(20, 40, 79, 0.25);
                }
                .metric-tile {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 16px 20px;
                    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
                    position: relative;
                    overflow: hidden;
                    transition: transform 0.18s ease;
                }
                .metric-tile:hover {
                    transform: translateY(-2px);
                }
                .status-chip {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 8px 4px;
                    border-radius: 8px;
                    transition: all 0.15s ease;
                }
            `}</style>

            {/* Header Bar */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 16,
                    marginBottom: 24,
                }}
            >
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {selectedDept && (
                            <Button
                                icon={<ArrowLeftOutlined />}
                                onClick={() => {
                                    if (selectedMode) {
                                        setSelectedMode(null);
                                    } else {
                                        setSelectedDept(null);
                                    }
                                    setSearchQuery("");
                                }}
                                style={{
                                    borderRadius: 8,
                                    border: "1px solid #cbd5e1",
                                    fontWeight: 600,
                                }}
                            >
                                Back
                            </Button>
                        )}
                        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#0f172a", letterSpacing: "-0.02em" }}>
                            {selectedDept
                                ? selectedMode
                                    ? `${selectedDept.name} - ${selectedMode === "normal" ? "Normal Projects" : "Recurring Projects"}`
                                    : `${selectedDept.name} Department`
                                : "Departments"}
                        </h1>
                        <span
                            style={{
                                padding: "3px 10px",
                                background: "rgba(209, 78, 154, 0.08)",
                                color: "#D14E9A",
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                            }}
                        >
                            {selectedDept
                                ? selectedMode
                                    ? `${filteredProjects.length} Projects`
                                    : "2 Modes"
                                : `${totalDepartmentsCount} Boards`}
                        </span>
                    </div>
                    <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 13 }}>
                        {selectedDept
                            ? selectedMode
                                ? `Showing belonging projects for ${selectedMode === "normal" ? "Normal Tasks" : "Recurring Tasks"} in ${selectedDept.name}.`
                                : `Select whether to view Normal Tasks or Recurring Tasks under ${selectedDept.name}.`
                            : "Select a department board to explore its projects and task workflows."}
                    </p>
                </div>

                {/* Search & Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                        placeholder={selectedDept ? "Search projects..." : "Search departments..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        allowClear
                        style={{
                            width: 260,
                            borderRadius: 10,
                            height: 38,
                            borderColor: "#cbd5e1",
                        }}
                    />
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={selectedDept ? () => handleSelectDepartment(selectedDept) : fetchDepartments}
                        style={{ height: 38, borderRadius: 10, borderColor: "#cbd5e1", fontWeight: 600 }}
                    >
                        Refresh
                    </Button>
                    {!selectedDept && (
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => { setNewDeptName(""); setAddDeptModalOpen(true); }}
                            style={{
                                height: 38,
                                borderRadius: 10,
                                background: "#D14E9A",
                                borderColor: "#D14E9A",
                                fontWeight: 600,
                            }}
                        >
                            Add Department
                        </Button>
                    )}
                </div>
            </div>

            {/* Quick Metrics Ribbon (Main departments view) */}
            {!selectedDept && (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                        gap: 16,
                        marginBottom: 28,
                    }}
                >
                    <div className="metric-tile" style={{ borderTop: "3px solid #D14E9A" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Total Departments</span>
                            <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(209, 78, 154, 0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <AppstoreOutlined style={{ color: "#D14E9A", fontSize: 14 }} />
                            </div>
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", marginTop: 6 }}>
                            {totalDepartmentsCount}
                        </div>
                    </div>

                    <div className="metric-tile" style={{ borderTop: "3px solid #2563eb" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Total Active Projects</span>
                            <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(37, 99, 235, 0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <FolderOutlined style={{ color: "#2563eb", fontSize: 14 }} />
                            </div>
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: "#2563eb", marginTop: 6 }}>
                            {totalProjectsCount}
                        </div>
                    </div>

                    <div className="metric-tile" style={{ borderTop: "3px solid #059669" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Total Team Members</span>
                            <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(5, 150, 105, 0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <TeamOutlined style={{ color: "#059669", fontSize: 14 }} />
                            </div>
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: "#059669", marginTop: 6 }}>
                            {totalMembersCount}
                        </div>
                    </div>

                    <div className="metric-tile" style={{ borderTop: "3px solid #7c3aed" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Total Tracked Tasks</span>
                            <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(124, 58, 237, 0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <CheckCircleOutlined style={{ color: "#7c3aed", fontSize: 14 }} />
                            </div>
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: "#7c3aed", marginTop: 6 }}>
                            {totalTasksCount}
                        </div>
                    </div>
                </div>
            )}

            {/* Loading state */}
            {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
                    <Spin size="large" tip="Loading department boards..." />
                </div>
            ) : selectedDept && !selectedMode ? (
                /* ── STEP 1 DRILL-DOWN: TWO SEPARATE BOXES (Normal vs Recurring) ── */
                <div>
                    <div style={{ marginBottom: 16 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", margin: 0 }}>
                            Select Workflow Type for {selectedDept.name}
                        </h2>
                        <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
                            Choose whether to enter standard milestone project workflows or automated recurring routines.
                        </p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 370px))", gap: 18, maxWidth: 800 }}>
                        {/* Box 1: Normal Tasks & Projects (Compact) */}
                        <div
                            className="dept-card"
                            onClick={() => handleSelectMode("normal")}
                            style={{ cursor: "pointer", border: "1px solid #FBCFE8", borderRadius: 12 }}
                        >
                            <div
                                style={{
                                    background: "linear-gradient(135deg, #DE5EA8 0%, #D14E9A 60%, #B83681 100%)",
                                    padding: "14px 18px",
                                    color: "#fff",
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <span
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            letterSpacing: "0.06em",
                                            textTransform: "uppercase",
                                            background: "rgba(255, 255, 255, 0.2)",
                                            padding: "2px 8px",
                                            borderRadius: 10,
                                        }}
                                    >
                                        STANDARD PIPELINE
                                    </span>
                                    <span style={{ fontSize: 11.5, background: "rgba(255, 255, 255, 0.16)", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
                                        {selectedDept.normal_projects_count !== undefined ? selectedDept.normal_projects_count : selectedDept.projects_count} Projects
                                    </span>
                                </div>
                                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 18 }}>📁</span> Normal Tasks
                                </h2>
                                <p style={{ margin: "4px 0 0", color: "rgba(255, 255, 255, 0.85)", fontSize: 11.5, lineHeight: 1.35 }}>
                                    Standard milestone deliverables, client features, and ad-hoc task workflows.
                                </p>
                            </div>

                            <div style={{ padding: "14px 18px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                                    <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Total Normal Tasks</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: "#D14E9A", marginTop: 2 }}>
                                            {selectedDept.normal_tasks_count !== undefined ? selectedDept.normal_tasks_count : selectedDept.total_tasks}
                                        </div>
                                    </div>
                                    <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Overall Completion</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: "#16a34a", marginTop: 2 }}>
                                            {selectedDept.normal_completion_rate !== undefined ? selectedDept.normal_completion_rate : selectedDept.completion_rate}%
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: 10 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#64748b", marginBottom: 4 }}>
                                        <span>Progress</span>
                                        <span style={{ fontWeight: 700, color: "#D14E9A" }}>
                                            {selectedDept.normal_completion_rate !== undefined ? selectedDept.normal_completion_rate : selectedDept.completion_rate}%
                                        </span>
                                    </div>
                                    <Progress
                                        percent={selectedDept.normal_completion_rate !== undefined ? selectedDept.normal_completion_rate : selectedDept.completion_rate}
                                        strokeColor="#D14E9A"
                                        showInfo={false}
                                        size="small"
                                    />
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        paddingTop: 10,
                                        borderTop: "1px solid #f1f5f9",
                                    }}
                                >
                                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                                        Belonging Normal Projects
                                    </span>
                                    <span style={{ color: "#D14E9A", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                                        Enter Normal Projects <RightOutlined style={{ fontSize: 10 }} />
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Box 2: Recurring Tasks & Schedules (Compact) */}
                        <div
                            className="dept-card"
                            onClick={() => handleSelectMode("recurring")}
                            style={{ cursor: "pointer", border: "1px solid #a7f3d0", borderRadius: 12 }}
                        >
                            <div
                                style={{
                                    background: "linear-gradient(135deg, #38A169 0%, #48BB78 60%, #68D391 100%)",
                                    padding: "14px 18px",
                                    color: "#fff",
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <span
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            letterSpacing: "0.06em",
                                            textTransform: "uppercase",
                                            background: "rgba(255, 255, 255, 0.2)",
                                            padding: "2px 8px",
                                            borderRadius: 10,
                                        }}
                                    >
                                        AUTOMATED ROUTINES
                                    </span>
                                    <span style={{ fontSize: 11.5, background: "rgba(255, 255, 255, 0.16)", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
                                        {selectedDept.recurring_projects_count || 0} Projects
                                    </span>
                                </div>
                                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 18 }}>🔁</span> Recurring Tasks
                                </h2>
                                <p style={{ margin: "4px 0 0", color: "rgba(255, 255, 255, 0.85)", fontSize: 11.5, lineHeight: 1.35 }}>
                                    Automated recurring routines, daily code standups, periodic audits, and maintenance jobs.
                                </p>
                            </div>

                            <div style={{ padding: "14px 18px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                                    <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Total Recurring Tasks</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: "#059669", marginTop: 2 }}>
                                            {selectedDept.recurring_tasks_count || 0}
                                        </div>
                                    </div>
                                    <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Active Routine Schedules</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: "#0d9488", marginTop: 2 }}>
                                            {selectedDept.recurring_projects_count || 0} Active
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: 10 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#64748b", marginBottom: 4 }}>
                                        <span>Progress</span>
                                        <span style={{ fontWeight: 700, color: "#059669" }}>
                                            {selectedDept.recurring_completion_rate || 0}%
                                        </span>
                                    </div>
                                    <Progress
                                        percent={selectedDept.recurring_completion_rate || 0}
                                        strokeColor="#059669"
                                        showInfo={false}
                                        size="small"
                                    />
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        paddingTop: 10,
                                        borderTop: "1px solid #f1f5f9",
                                    }}
                                >
                                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                                        Belonging Recurring Projects
                                    </span>
                                    <span style={{ color: "#059669", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                                        Enter Recurring Projects <RightOutlined style={{ fontSize: 10 }} />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : selectedDept && selectedMode ? (
                /* ── STEP 2 DRILL-DOWN: Projects under Selected Mode ── */
                <div>
                    {projectsLoading ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                            <Spin tip={`Loading projects for ${selectedDept.name}...`} />
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div
                            style={{
                                background: "#fff",
                                padding: "60px 20px",
                                borderRadius: 16,
                                textAlign: "center",
                                border: "1px dashed #cbd5e1",
                            }}
                        >
                            <Empty
                                description={
                                    <span>
                                        No projects found under <b>{selectedDept.name}</b>
                                    </span>
                                }
                            />
                            <Button
                                type="primary"
                                style={{ marginTop: 16, borderRadius: 8, background: "var(--accent, #D14E9A)", borderColor: "var(--accent, #D14E9A)" }}
                                onClick={() => navigate("/admin/all_tasks")}
                            >
                                View All Tasks in this Department
                            </Button>
                        </div>
                    ) : (
                        <div className="trello-cards-grid">
                            {filteredProjects.map((proj, idx) => {
                                const palette = CARD_PALETTES[idx % CARD_PALETTES.length];
                                const prefix = proj.project_name ? proj.project_name.substring(0, 3).toUpperCase() : "PRJ";
                                return (
                                    <div
                                        key={proj.project_name || idx}
                                        className="dept-card"
                                        onClick={() => setSelectedProject(proj)}
                                    >
                                        {/* Harmonious Navy-Anchored Header for Project */}
                                        <div
                                            style={{
                                                background: palette.gradient,
                                                padding: "16px 20px",
                                                color: "#fff",
                                                position: "relative",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    marginBottom: 8,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        letterSpacing: "0.08em",
                                                        textTransform: "uppercase",
                                                        background: "rgba(255, 255, 255, 0.18)",
                                                        backdropFilter: "blur(6px)",
                                                        border: "1px solid rgba(255, 255, 255, 0.22)",
                                                        padding: "3px 10px",
                                                        borderRadius: 12,
                                                    }}
                                                >
                                                    {prefix}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: 12,
                                                        background: "rgba(255, 255, 255, 0.16)",
                                                        backdropFilter: "blur(6px)",
                                                        padding: "3px 10px",
                                                        borderRadius: 12,
                                                        fontWeight: 500,
                                                        color: "#fff",
                                                    }}
                                                >
                                                    {proj.total_tasks} {proj.total_tasks === 1 ? "task" : "tasks"}
                                                </span>
                                            </div>

                                            <h3
                                                style={{
                                                    fontSize: 18,
                                                    fontWeight: 700,
                                                    margin: 0,
                                                    color: "#fff",
                                                    letterSpacing: "-0.01em",
                                                }}
                                            >
                                                {proj.project_name}
                                            </h3>
                                        </div>

                                        {/* Project Card Content */}
                                        <div style={{ padding: "18px 20px 14px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                            {/* Progress Bar */}
                                            <div style={{ marginBottom: 14 }}>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        fontSize: 12,
                                                        color: "#64748b",
                                                        marginBottom: 6,
                                                    }}
                                                >
                                                    <span style={{ fontWeight: 500 }}>Overall Completion</span>
                                                    <span style={{ fontWeight: 700, color: palette.accent }}>
                                                        {proj.completion_rate}%
                                                    </span>
                                                </div>
                                                <Progress
                                                    percent={proj.completion_rate}
                                                    showInfo={false}
                                                    strokeColor={palette.accent}
                                                    trailColor="#f1f5f9"
                                                    size={["100%", 7]}
                                                />
                                            </div>

                                            {/* Status Counters */}
                                            <div
                                                style={{
                                                    display: "grid",
                                                    gridTemplateColumns: "repeat(4, 1fr)",
                                                    gap: 6,
                                                    marginBottom: 6,
                                                }}
                                            >
                                                <div className="status-chip" style={{ background: "#f0f7ff", border: "1px solid #dbeafe" }}>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1d4ed8" }}>
                                                        {proj.open_tasks}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>Open</div>
                                                </div>
                                                <div className="status-chip" style={{ background: "#f0fdf4", border: "1px solid #dcfce7" }}>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>
                                                        {proj.completed_tasks}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>Done</div>
                                                </div>
                                                <div className="status-chip" style={{ background: "#fffbeb", border: "1px solid #fef3c7" }}>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#b45309" }}>
                                                        {proj.review_tasks}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>Review</div>
                                                </div>
                                                <div className="status-chip" style={{ background: "#fef2f2", border: "1px solid #fee2e2" }}>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#b91c1c" }}>
                                                        {proj.rework_tasks}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>Rework</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Footer Action */}
                                        <div
                                            style={{
                                                borderTop: "1px solid #f1f5f9",
                                                padding: "12px 20px",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                background: "#fafbfc",
                                            }}
                                        >
                                            <span style={{ fontSize: 12, fontWeight: 500, color: "#64748b" }}>
                                                Project Details
                                            </span>
                                            <Button
                                                type="link"
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedProject(proj);
                                                }}
                                                style={{
                                                    color: palette.accent,
                                                    fontWeight: 600,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                    padding: 0,
                                                }}
                                            >
                                                Open Tasks <RightOutlined style={{ fontSize: 10 }} />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                /* ── MAIN VIEW: Harmonious Navy-Anchored Department Cards ── */
                filteredDepartments.length === 0 ? (
                    <div
                        style={{
                            background: "#fff",
                            padding: "60px 20px",
                            borderRadius: 16,
                            textAlign: "center",
                            border: "1px dashed #cbd5e1",
                        }}
                    >
                        <Empty description={searchQuery ? "No departments match your search" : "No departments found. Add a department or team member to get started."}>
                            {!searchQuery && (
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => { setNewDeptName(""); setAddDeptModalOpen(true); }}
                                    style={{ background: "#D14E9A", borderColor: "#D14E9A", borderRadius: 8, marginTop: 8 }}
                                >
                                    Add Department
                                </Button>
                            )}
                        </Empty>
                    </div>
                ) : (
                    <div className="trello-cards-grid">
                        {filteredDepartments.map((dept, idx) => {
                            const palette = CARD_PALETTES[idx % CARD_PALETTES.length];
                            return (
                                <div
                                    key={dept.name || idx}
                                    className="dept-card"
                                    onClick={() => handleSelectDepartment(dept)}
                                >
                                    {/* Sleek Navy-Rooted Gradient Header */}
                                    <div
                                        style={{
                                            background: palette.gradient,
                                            padding: "18px 22px",
                                            color: "#fff",
                                            position: "relative",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginBottom: 8,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    letterSpacing: "0.08em",
                                                    textTransform: "uppercase",
                                                    background: "rgba(255, 255, 255, 0.18)",
                                                    backdropFilter: "blur(6px)",
                                                    border: "1px solid rgba(255, 255, 255, 0.22)",
                                                    padding: "3px 10px",
                                                    borderRadius: 12,
                                                }}
                                            >
                                                {dept.prefix || "DEPT"}
                                            </span>
                                            <Tooltip title={`${dept.members_count} team members`}>
                                                <span
                                                    style={{
                                                        fontSize: 12,
                                                        background: "rgba(255, 255, 255, 0.16)",
                                                        backdropFilter: "blur(6px)",
                                                        padding: "3px 10px",
                                                        borderRadius: 12,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 5,
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    <TeamOutlined /> {dept.members_count}
                                                </span>
                                            </Tooltip>
                                        </div>

                                        <h2
                                            style={{
                                                fontSize: 19,
                                                fontWeight: 700,
                                                margin: 0,
                                                color: "#fff",
                                                letterSpacing: "-0.01em",
                                            }}
                                        >
                                            {dept.name}
                                        </h2>
                                    </div>

                                    {/* Card Body with Key Stats */}
                                    <div style={{ padding: "18px 22px 14px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                        {/* Projects and Tasks count chips */}
                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "1fr 1fr",
                                                gap: 10,
                                                marginBottom: 16,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    padding: "8px 10px",
                                                    borderRadius: 8,
                                                    background: "#f8fafc",
                                                    border: "1px solid #edf2f7",
                                                }}
                                            >
                                                <FolderOutlined style={{ color: palette.accent, fontSize: 15 }} />
                                                <span style={{ fontSize: 13, color: "#475569" }}>
                                                    <b style={{ color: "#0f172a" }}>{dept.projects_count}</b> Projects
                                                </span>
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    padding: "8px 10px",
                                                    borderRadius: 8,
                                                    background: "#f8fafc",
                                                    border: "1px solid #edf2f7",
                                                }}
                                            >
                                                <AppstoreOutlined style={{ color: palette.accent, fontSize: 15 }} />
                                                <span style={{ fontSize: 13, color: "#475569" }}>
                                                    <b style={{ color: "#0f172a" }}>{dept.total_tasks}</b> Tasks
                                                </span>
                                            </div>
                                        </div>

                                        {/* Completion Progress Bar */}
                                        <div style={{ marginBottom: 16 }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    fontSize: 12,
                                                    color: "#64748b",
                                                    marginBottom: 6,
                                                }}
                                            >
                                                <span style={{ fontWeight: 500 }}>Overall Completion</span>
                                                <span style={{ fontWeight: 700, color: palette.accent }}>
                                                    {dept.completion_rate}%
                                                </span>
                                            </div>
                                            <Progress
                                                percent={dept.completion_rate}
                                                showInfo={false}
                                                strokeColor={palette.accent}
                                                trailColor="#f1f5f9"
                                                size={["100%", 7]}
                                            />
                                        </div>

                                        {/* Modern Status Chips Grid */}
                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "repeat(4, 1fr)",
                                                gap: 6,
                                                marginBottom: 4,
                                            }}
                                        >
                                            <div className="status-chip" style={{ background: "#f0f7ff", border: "1px solid #dbeafe" }}>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: "#1d4ed8" }}>
                                                    {dept.open_tasks}
                                                </div>
                                                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>Open</div>
                                            </div>
                                            <div className="status-chip" style={{ background: "#f0fdf4", border: "1px solid #dcfce7" }}>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>
                                                    {dept.completed_tasks}
                                                </div>
                                                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>Done</div>
                                            </div>
                                            <div className="status-chip" style={{ background: "#fffbeb", border: "1px solid #fef3c7" }}>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: "#b45309" }}>
                                                    {dept.review_tasks}
                                                </div>
                                                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>Review</div>
                                            </div>
                                            <div className="status-chip" style={{ background: "#fef2f2", border: "1px solid #fee2e2" }}>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: "#b91c1c" }}>
                                                    {dept.rework_tasks}
                                                </div>
                                                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>Rework</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div
                                        style={{
                                            borderTop: "1px solid #f1f5f9",
                                            padding: "12px 22px",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            background: "#fafbfc",
                                        }}
                                    >
                                        <span style={{ fontSize: 12, fontWeight: 500, color: "#64748b" }}>
                                            Open Board
                                        </span>
                                        <div
                                            style={{
                                                color: palette.accent,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 5,
                                            }}
                                        >
                                            View Projects <RightOutlined style={{ fontSize: 10 }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* ── Add Department Modal ── */}
            <Modal
                open={addDeptModalOpen}
                onCancel={() => { setAddDeptModalOpen(false); setNewDeptName(""); }}
                title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><PlusOutlined /> Add Department</span>}
                confirmLoading={savingDept}
                onOk={handleSaveDepartment}
                okText="Create"
                destroyOnClose
            >
                <div style={{ marginTop: 16 }}>
                    <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Department Name</label>
                    <Input
                        placeholder="e.g. Engineering, Sales, HR"
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        onPressEnter={handleSaveDepartment}
                        autoFocus
                    />
                </div>
            </Modal>
        </div>
    );
}
