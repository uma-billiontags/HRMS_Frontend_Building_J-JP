import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../AuthContext";
import {
    Input,
    Button,
    Spin,
    Dropdown,
    Tooltip,
    Modal,
    Select,
    DatePicker,
    message,
    Progress,
    Calendar,
    Badge,
    Tag,
    Upload,
} from "antd";
import type { MenuProps } from "antd";
import {
    SearchOutlined,
    ReloadOutlined,
    ArrowLeftOutlined,
    PlusOutlined,
    FilterOutlined,
    ShareAltOutlined,
    ThunderboltOutlined,
    LayoutOutlined,
    FullscreenOutlined,
    FullscreenExitOutlined,
    MoreOutlined,
    CheckOutlined,
    DownOutlined,
    RightOutlined,
    GlobalOutlined,
    ProfileOutlined,
    AppstoreOutlined,
    LineChartOutlined,
    FileTextOutlined,
    FormOutlined,
    CalendarOutlined,
    TableOutlined,
    CloseOutlined,
    BarsOutlined,
    SettingOutlined,
    PlayCircleOutlined,
    PauseCircleOutlined,
    CheckCircleOutlined,
    CheckCircleFilled,
    PaperClipOutlined,
    UploadOutlined,
    EditOutlined,
    DownloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

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

// ── Interfaces ──────────────────────────────────────────────────────────────
export interface TaskAttachmentItem {
    id: number;
    file: string;
    name?: string;
    size?: number;
    uploaded_at?: string;
}

export interface TaskCommentItem {
    id: number;
    actor: string;
    text: string;
    created_at: string;
}

export interface JiraTask {
    id: number;
    task_id: string;
    sub_task_id: string;
    task_name: string;
    task_details: string;
    project_name: string;
    department: string;
    department_name?: string;
    assigned_to: number | null;
    assigned_to_name: string | null;
    assigned_by_name: string | null;
    assigned_by_admin?: number | null;
    assigned_by_employee?: number | null;
    reporter_key?: string | null;
    priority: "low" | "medium" | "high" | "critical" | string;
    task_status: string;
    start_date?: string | null;
    assigned_date?: string | null;
    due_date?: string | null;
    due_time?: string | null;
    allotted_time?: string | number | null;
    total_time_taken?: string | number;
    remaining_or_over_time?: string | number;
    rework_count?: number;
    is_recurring?: boolean;
    attachments?: TaskAttachmentItem[];
}

export interface EmployeeOption {
    id: number;
    name: string;
    department: string;
}

interface JiraProjectViewProps {
    project: {
        project_name: string;
        department: string;
        total_tasks?: number;
        open_tasks?: number;
        completed_tasks?: number;
        review_tasks?: number;
        rework_tasks?: number;
        completion_rate?: number;
        assignees?: string[];
    };
    department: {
        name: string;
        prefix?: string;
    };
    mode?: "normal" | "recurring" | null;
    initialTab?: "trello" | "list" | "board" | "summary" | "timeline" | "calendar" | "backlog" | "docs";
    onBack?: () => void;
    userRole?: "admin" | "employee";
    customTitle?: string;
}

// ── Avatar Color Generator ───────────────────────────────────────────────────
const AVATAR_PALETTES = [
    { bg: "#0052cc", text: "#ffffff" }, // Electric Blue
    { bg: "#00875a", text: "#ffffff" }, // Emerald Teal
    { bg: "#6554c0", text: "#ffffff" }, // Royal Violet
    { bg: "#00b8d9", text: "#ffffff" }, // Ocean Blue
    { bg: "#ff5630", text: "#ffffff" }, // Coral Red
    { bg: "#36b37e", text: "#ffffff" }, // Spring Mint
    { bg: "#ffab00", text: "#172b4d" }, // Amber
    { bg: "#0e7490", text: "#ffffff" }, // Deep Cyan
];

function getAvatarColor(name: string) {
    if (!name) return { bg: "#94a3b8", text: "#ffffff" };
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function getInitials(name: string) {
    if (!name) return "??";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Jira Status Pill Configurations ─────────────────────────────────────────
interface StatusMeta {
    label: string;
    key: string;
    bg: string;
    text: string;
    border: string;
}

const STATUS_CONFIGS: Record<string, StatusMeta> = {
    not_started: { label: "To Do", key: "not_started", bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
    in_progress: { label: "In Progress", key: "in_progress", bg: "#e0f2fe", text: "#0284c7", border: "#bae6fd" },
    paused: { label: "Paused", key: "paused", bg: "#fef3c7", text: "#d97706", border: "#fde68a" },
    submitted: { label: "Submitted", key: "submitted", bg: "#f3e8ff", text: "#9333ea", border: "#e9d5ff" },
    under_review: { label: "Under Review", key: "under_review", bg: "#fffbeb", text: "#b45309", border: "#fcd34d" },
    rework_needed: { label: "Rework", key: "rework_needed", bg: "#fef2f2", text: "#dc2626", border: "#fecdd3" },
    completed: { label: "Done", key: "completed", bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
    on_hold: { label: "On Hold", key: "on_hold", bg: "#f1f5f9", text: "#64748b", border: "#cbd5e1" },
    cancelled: { label: "Cancelled", key: "cancelled", bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
};

function normalizeStatus(raw: string): StatusMeta {
    return STATUS_CONFIGS[raw] || {
        label: raw ? raw.replace(/_/g, " ").toUpperCase() : "To Do",
        key: raw || "not_started",
        bg: "#f1f5f9",
        text: "#475569",
        border: "#cbd5e1",
    };
}

// ── Jira Priority Component ──────────────────────────────────────────────────
function renderPriority(p: string) {
    const norm = (p || "medium").toLowerCase();
    switch (norm) {
        case "critical":
        case "highest":
            return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#b91c1c", fontWeight: 600, fontSize: 13 }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>↑↑</span> Highest
                </span>
            );
        case "high":
            return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#dc2626", fontWeight: 600, fontSize: 13 }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>↑</span> High
                </span>
            );
        case "low":
            return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#2563eb", fontWeight: 600, fontSize: 13 }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>↓</span> Low
                </span>
            );
        case "lowest":
            return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#059669", fontWeight: 600, fontSize: 13 }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>↓↓</span> Lowest
                </span>
            );
        case "medium":
        default:
            return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#d97706", fontWeight: 600, fontSize: 13 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1 }}>=</span> Medium
                </span>
            );
    }
}

export default function JiraProjectView({ project, department, mode, initialTab, onBack, userRole = "admin", customTitle }: JiraProjectViewProps) {
    const { user } = useAuth();
    const [myId, setMyId] = useState<number | null>(null);

    useEffect(() => {
        fetch(`${BASE_URL}/api/auth/me/`, { headers: authHeaders() })
            .then((r) => r.json())
            .then((d) => {
                if (d?.id) setMyId(d.id);
            })
            .catch(() => {});
    }, []);

    const isTaskMine = (task?: JiraTask | null) => {
        if (!task) return false;
        const isEmployee = userRole === "employee" || user?.role === "employee";
        if (!isEmployee) return false;
        if (myId && task.assigned_to === myId) return true;
        if (user?.name && task.assigned_to_name && task.assigned_to_name.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
        return false;
    };

    const canEditTask = (task?: JiraTask | null) => {
        if (!task) return false;
        if (userRole === "admin" || user?.role === "admin") return true;
        if (myId && task.assigned_to === myId) return true;
        if (user?.name && task.assigned_by_name && task.assigned_by_name.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
        if (user?.name && task.assigned_to_name && task.assigned_to_name.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
        return false;
    };

    const [attachmentCategory, setAttachmentCategory] = useState<"All" | "Images" | "Documents">("All");

    const [tasks, setTasks] = useState<JiraTask[]>([]);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"trello" | "list" | "board" | "summary" | "timeline" | "calendar" | "backlog" | "docs">(
        initialTab || (mode === "normal" ? "trello" : "list")
    );
    const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
    const [filterPriority, setFilterPriority] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [groupBy, setGroupBy] = useState<"none" | "status" | "assignee" | "priority">("none");

    // Trello board states
    const [deptProjects, setDeptProjects] = useState<string[]>([]);
    const [addingCardCol, setAddingCardCol] = useState<string | null>(null);
    const [newCardTitle, setNewCardTitle] = useState("");
    const [addCardLoading, setAddCardLoading] = useState(false);
    const [isAddingProject, setIsAddingProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");

    // Assignee dropdown in table (Screenshot 1 clone)
    const [activeAssigneeTaskId, setActiveAssigneeTaskId] = useState<number | null>(null);

    // Inline task creation
    const [isCreatingInline, setIsCreatingInline] = useState(false);
    const [inlineTaskName, setInlineTaskName] = useState("");
    const [inlineAssignee, setInlineAssignee] = useState<number | undefined>(undefined);
    const [inlineReporter, setInlineReporter] = useState<string | undefined>(undefined);
    const [reporters, setReporters] = useState<{ id: number; name: string; type: "admin" | "tl"; role: string; label: string; key: string }[]>([]);
    const [inlinePriority, setInlinePriority] = useState<string>("medium");
    const [inlineDueDate, setInlineDueDate] = useState<string | null>(null);
    const [createLoading, setCreateLoading] = useState(false);
    const inlineInputRef = useRef<any>(null);

    // Full Jira Issue Modal Dialog (Screenshots 2, 3, 4)
    const [selectedTask, setSelectedTask] = useState<JiraTask | null>(null);
    const [issueModalOpen, setIssueModalOpen] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const [taskTitleValue, setTaskTitleValue] = useState("");
    const [editingDesc, setEditingDesc] = useState(false);
    const [taskDescValue, setTaskDescValue] = useState("");
    const [activityTab, setActivityTab] = useState<"all" | "comments" | "history" | "worklog">("comments");
    const [commentText, setCommentText] = useState("");
    const [commentsList, setCommentsList] = useState<TaskCommentItem[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);

    // Timer actions state
    const [timerBusyTaskId, setTimerBusyTaskId] = useState<number | null>(null);
    const [pauseModalOpen, setPauseModalOpen] = useState(false);
    const [pauseTarget, setPauseTarget] = useState<JiraTask | null>(null);
    const [pauseType, setPauseType] = useState<"break" | "another_reason">("break");
    const [pauseOption, setPauseOption] = useState("15_mins");
    const [pauseReason, setPauseReason] = useState("");

    const [submitModalOpen, setSubmitModalOpen] = useState(false);
    const [submitTarget, setSubmitTarget] = useState<JiraTask | null>(null);
    const [submitSheetLink, setSubmitSheetLink] = useState("");
    const [submitRemarks, setSubmitRemarks] = useState("");
    const [submitFiles, setSubmitFiles] = useState<any[]>([]);

    // AI modal
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiQuestion, setAiQuestion] = useState("");
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [aiThinking, setAiThinking] = useState(false);

    // Fullscreen toggle
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Fetch department projects for Trello board columns
    const fetchDeptProjects = async () => {
        try {
            const res = await fetch(
                `${BASE_URL}/api/tasks/departments/projects/?department=${encodeURIComponent(department.name)}&mode=${mode || "normal"}`,
                { headers: authHeaders() }
            );
            if (res.ok) {
                const data = await res.json();
                const names = data.map((p: any) => p.project_name).filter(Boolean);
                setDeptProjects(names);
            }
        } catch (err) {
            console.error("Failed to fetch department projects for Trello:", err);
        }
    };

    useEffect(() => {
        fetchDeptProjects();
    }, [department.name, mode]);

    // Derive Trello project columns
    const trelloColumns = useMemo(() => {
        const set = new Set<string>();
        if (project?.project_name && project.project_name !== "General Tasks") {
            set.add(project.project_name);
        }
        deptProjects.forEach((p) => {
            if (p && p !== "General Tasks") set.add(p);
        });
        tasks.forEach((t) => {
            if (t.project_name && t.project_name !== "General Tasks") {
                set.add(t.project_name);
            }
        });
        return Array.from(set);
    }, [deptProjects, tasks, project?.project_name]);

    // Add Trello card handler
    const handleAddTrelloCard = async (colProjectName: string) => {
        if (!newCardTitle.trim()) {
            message.warning("Please enter a card title");
            return;
        }
        setAddCardLoading(true);
        try {
            const pName = colProjectName;
            const isEmployee = userRole === "employee" || user?.role === "employee";
            const assigneeId = isEmployee ? myId : null;
            const res = await fetch(`${BASE_URL}/api/tasks/quick_create/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders(),
                },
                body: JSON.stringify({
                    task_name: newCardTitle.trim(),
                    project_name: pName,
                    department: department.name,
                    priority: "medium",
                    task_status: "not_started",
                    assigned_to: assigneeId,
                    reporter: inlineReporter || null,
                }),
            });
            if (res.ok) {
                message.success(`Task added to ${colProjectName}`);
                setNewCardTitle("");
                setAddingCardCol(null);
                fetchTasks();
            } else {
                message.error("Failed to create task");
            }
        } catch (err) {
            console.error(err);
            message.error("Network error while creating task");
        } finally {
            setAddCardLoading(false);
        }
    };

    // Fetch tasks for this project & mode
    const fetchTasks = async () => {
        setLoading(true);
        try {
            const modeParam = mode ? `&mode=${mode}` : "";
            const projParam = project?.project_name ? `project_name=${encodeURIComponent(project.project_name)}&` : "";
            const url = `${BASE_URL}/api/tasks/project_tasks/?${projParam}department=${encodeURIComponent(
                department.name
            )}${modeParam}`;
            const res = await fetch(url, { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            } else {
                const fallbackRes = await fetch(`${BASE_URL}/api/tasks/get_all_tasks/`, {
                    headers: authHeaders(),
                });
                if (fallbackRes.ok) {
                    const allData: JiraTask[] = await fallbackRes.json();
                    const filtered = allData.filter((t) => {
                        const matchDept = !t.department || t.department.toLowerCase() === department.name.toLowerCase();
                        const matchProj = (t.project_name || "").toLowerCase() === project.project_name.toLowerCase();
                        const matchMode = !mode || (mode === "recurring" ? t.is_recurring : !t.is_recurring);
                        return matchDept && matchProj && matchMode;
                    });
                    setTasks(filtered);
                }
            }
        } catch (err) {
            console.error("Failed to load project tasks:", err);
            message.error("Could not fetch project tasks");
        } finally {
            setLoading(false);
        }
    };

    // Fetch department employees
    const fetchEmployees = async () => {
        try {
            const res = await fetch(
                `${BASE_URL}/api/tasks/get_all_employees/?department=${encodeURIComponent(department.name)}`,
                { headers: authHeaders() }
            );
            if (res.ok) {
                const data = await res.json();
                setEmployees(data);
            }
        } catch (err) {
            console.error("Failed to fetch employees:", err);
        }
    };

    // Fetch reporters (Admins and TLs)
    const fetchReporters = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/tasks/get_all_reporters/`, { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                setReporters(data);
                if (data.length > 0 && !inlineReporter) {
                    const matchUser = data.find((r: any) => r.name?.toLowerCase() === (user?.name || "").toLowerCase()) ||
                                      data.find((r: any) => r.type === "admin");
                    if (matchUser) {
                        setInlineReporter(matchUser.key);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch reporters:", err);
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchEmployees();
        fetchReporters();
    }, [project.project_name, department.name, mode]);

    useEffect(() => {
        if (isCreatingInline && inlineInputRef.current) {
            setTimeout(() => inlineInputRef.current?.focus(), 50);
        }
    }, [isCreatingInline]);

    // Open Jira Issue Dialog and populate values
    const openTaskDetailModal = (task: JiraTask) => {
        setSelectedTask(task);
        setTaskTitleValue(task.task_name || "");
        setTaskDescValue(task.task_details || "");
        setEditingTitle(false);
        setEditingDesc(false);
        setIssueModalOpen(true);
        fetchComments(task.id);
    };

    // Fetch comments for issue
    const fetchComments = async (taskId: number) => {
        setCommentsLoading(true);
        try {
            const res = await fetch(`${BASE_URL}/api/tasks/${taskId}/comments/`, { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                setCommentsList(data);
            }
        } catch (err) {
            console.error("Failed to fetch comments:", err);
        } finally {
            setCommentsLoading(false);
        }
    };

    // Add comment
    const handleAddComment = async () => {
        if (!selectedTask || !commentText.trim()) return;
        try {
            const res = await fetch(`${BASE_URL}/api/tasks/${selectedTask.id}/comments/`, {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ comment: commentText.trim() }),
            });
            if (res.ok) {
                message.success("Comment added");
                setCommentText("");
                fetchComments(selectedTask.id);
            }
        } catch {
            message.error("Failed to add comment");
        }
    };

    // Save edited task field (Title, Description, Due Date, Priority, etc.)
    const handleUpdateTaskField = async (taskId: number, patchData: Record<string, any>) => {
        // Optimistically update
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patchData } : t)));
        if (selectedTask && selectedTask.id === taskId) {
            setSelectedTask({ ...selectedTask, ...patchData });
        }

        try {
            const res = await fetch(`${BASE_URL}/api/tasks/${taskId}/edit/`, {
                method: "PATCH",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(patchData),
            });
            if (res.ok) {
                const updated = await res.json();
                setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
                if (selectedTask && selectedTask.id === taskId) {
                    setSelectedTask(updated);
                }
                message.success("Task updated successfully");
            } else {
                throw new Error("Update failed");
            }
        } catch (err) {
            console.error("Failed to update task:", err);
            message.error("Failed to save changes");
            fetchTasks();
        }
    };

    // Reassign task (Screenshot 1 clone)
    const handleReassign = async (task: JiraTask, newAssigneeId: number | null) => {
        const emp = employees.find((e) => e.id === newAssigneeId);
        const newName = emp ? emp.name : null;
        setActiveAssigneeTaskId(null);

        await handleUpdateTaskField(task.id, {
            assigned_to: newAssigneeId,
            assigned_to_name: newName,
        });
    };

    // Quick Status Change
    const handleStatusChange = async (task: JiraTask, newStatus: string) => {
        await handleUpdateTaskField(task.id, { task_status: newStatus });
    };

    // ── Timer Actions (Start, Pause, Resume, Submit) ──────────────────────────
    const handleStartTimer = async (task: JiraTask) => {
        setTimerBusyTaskId(task.id);
        try {
            const res = await fetch(`${BASE_URL}/api/tasks/${task.id}/start/`, {
                method: "POST",
                headers: { ...authHeaders() },
            });
            if (res.ok) {
                const updated = await res.json();
                setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
                if (selectedTask && selectedTask.id === task.id) setSelectedTask(updated);
                message.success(`Timer started for ${task.sub_task_id || task.task_id}`);
            } else {
                const err = await res.json().catch(() => ({}));
                message.error(err.detail || "Failed to start timer");
            }
        } catch {
            message.error("Network error starting timer");
        } finally {
            setTimerBusyTaskId(null);
        }
    };

    const handleConfirmPause = async () => {
        if (!pauseTarget) return;
        setTimerBusyTaskId(pauseTarget.id);
        try {
            const res = await fetch(`${BASE_URL}/api/tasks/${pauseTarget.id}/pause/`, {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({
                    pause_type: pauseType,
                    break_option: pauseOption,
                    reason: pauseReason || (pauseOption === "15_mins" ? "15 Mins Refreshment" : "30 Mins Lunch Break"),
                }),
            });
            if (res.ok) {
                const updated = await res.json();
                setTasks((prev) => prev.map((t) => (t.id === pauseTarget.id ? updated : t)));
                if (selectedTask && selectedTask.id === pauseTarget.id) setSelectedTask(updated);
                message.success(`Task ${pauseTarget.sub_task_id || pauseTarget.task_id} paused`);
                setPauseModalOpen(false);
            } else {
                const err = await res.json().catch(() => ({}));
                message.error(err.detail || "Failed to pause task");
            }
        } catch {
            message.error("Network error pausing task");
        } finally {
            setTimerBusyTaskId(null);
        }
    };

    const handleResumeTimer = async (task: JiraTask) => {
        setTimerBusyTaskId(task.id);
        try {
            const res = await fetch(`${BASE_URL}/api/tasks/${task.id}/resume/`, {
                method: "POST",
                headers: { ...authHeaders() },
            });
            if (res.ok) {
                const updated = await res.json();
                setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
                if (selectedTask && selectedTask.id === task.id) setSelectedTask(updated);
                message.success(`Timer resumed for ${task.sub_task_id || task.task_id}`);
            } else {
                const err = await res.json().catch(() => ({}));
                message.error(err.detail || "Failed to resume task");
            }
        } catch {
            message.error("Network error resuming timer");
        } finally {
            setTimerBusyTaskId(null);
        }
    };

    const handleConfirmSubmit = async () => {
        if (!submitTarget) return;
        setTimerBusyTaskId(submitTarget.id);
        try {
            const formData = new FormData();
            formData.append("task_sheet_link", submitSheetLink.trim());
            formData.append("employee_remarks", submitRemarks.trim());
            submitFiles.forEach((file) => {
                if (file.originFileObj) {
                    formData.append("attachments", file.originFileObj);
                }
            });

            const res = await fetch(`${BASE_URL}/api/tasks/${submitTarget.id}/submit/`, {
                method: "POST",
                headers: { ...authHeaders() },
                body: formData,
            });
            if (res.ok) {
                message.success(`Task ${submitTarget.sub_task_id || submitTarget.task_id} submitted for review!`);
                setSubmitModalOpen(false);
                setSubmitFiles([]);
                fetchTasks();
            } else {
                const err = await res.json().catch(() => ({}));
                message.error(err.detail || "Failed to submit task");
            }
        } catch {
            message.error("Network error submitting task");
        } finally {
            setTimerBusyTaskId(null);
        }
    };

    // Quick Inline Create
    const handleQuickCreate = async () => {
        const title = inlineTaskName.trim();
        if (!title) {
            message.warning("Please enter a task summary");
            return;
        }

        setCreateLoading(true);
        try {
            const isEmployee = userRole === "employee" || user?.role === "employee";
            const assigneeId = isEmployee ? myId : (inlineAssignee || null);
            const res = await fetch(`${BASE_URL}/api/tasks/quick_create/`, {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({
                    task_name: title,
                    project_name: project?.project_name || "",
                    department: department.name,
                    priority: inlinePriority,
                    task_status: "not_started",
                    assigned_to: assigneeId,
                    due_date: inlineDueDate || null,
                    reporter: inlineReporter || null,
                }),
            });

            if (res.ok) {
                const newTask = await res.json();
                setTasks((prev) => [newTask, ...prev]);
                message.success(`Task ${newTask.sub_task_id || newTask.task_id} created!`);
                setInlineTaskName("");
                setTimeout(() => inlineInputRef.current?.focus(), 50);
            } else {
                const errData = await res.json().catch(() => ({}));
                message.error(errData.detail || "Failed to create task");
            }
        } catch (err) {
            console.error("Inline creation failed:", err);
            message.error("Network error while creating task");
        } finally {
            setCreateLoading(false);
        }
    };

    // Ask AI Copilot
    const handleAskAI = (q?: string) => {
        const query = q || aiQuestion;
        if (!query.trim()) return;
        setAiThinking(true);
        setAiResponse(null);

        setTimeout(() => {
            const total = tasks.length;
            const completed = tasks.filter((t) => t.task_status === "completed").length;
            const inProg = tasks.filter((t) => t.task_status === "in_progress").length;
            const underRev = tasks.filter((t) => t.task_status === "under_review").length;
            const rework = tasks.filter((t) => t.task_status === "rework_needed").length;
            const highPri = tasks.filter((t) => ["high", "critical", "highest"].includes(t.priority.toLowerCase())).length;

            let reply = "";
            const lower = query.toLowerCase();
            if (lower.includes("summary") || lower.includes("status") || lower.includes("progress")) {
                reply = `📊 **Project Health Summary for ${project.project_name} (${mode === "recurring" ? "Recurring" : "Normal"} Mode)**:\n\n` +
                    `- **Total Work Items**: ${total} active tickets.\n` +
                    `- **Done**: ${completed} tasks (${total > 0 ? Math.round((completed / total) * 100) : 0}% completion).\n` +
                    `- **Active In Execution**: ${inProg} in progress, ${underRev} awaiting review, ${rework} rework needed.\n` +
                    `- **High Priority Items**: ${highPri} tasks requiring close management.\n\n` +
                    `💡 *Recommendation*: Prioritize review on submitted tickets to maintain fast cycle times.`;
            } else {
                reply = `🤖 **Project Insights**:\n\n` +
                    `Scope covers ${total} tasks in **${project.project_name}**.\n` +
                    `• Active Team: ${Array.from(new Set(tasks.map((t) => t.assigned_to_name).filter(Boolean))).join(", ") || "None"}\n` +
                    `• Velocity: Healthy progress at ${total > 0 ? Math.round((completed / total) * 100) : 0}%.\n` +
                    `• Action: ${tasks.filter((t) => !t.assigned_to_name).length} unassigned tickets available for delegation.`;
            }

            setAiResponse(reply);
            setAiThinking(false);
        }, 550);
    };

    // Filtered tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = (task.task_name || "").toLowerCase().includes(q);
                const matchKey = (task.sub_task_id || task.task_id || "").toLowerCase().includes(q);
                const matchAssignee = (task.assigned_to_name || "").toLowerCase().includes(q);
                if (!matchName && !matchKey && !matchAssignee) return false;
            }
            if (filterAssignee) {
                if (filterAssignee === "unassigned") {
                    if (task.assigned_to_name) return false;
                } else if (task.assigned_to_name !== filterAssignee) {
                    return false;
                }
            }
            if (filterPriority && task.priority.toLowerCase() !== filterPriority.toLowerCase()) {
                return false;
            }
            if (filterStatus && task.task_status !== filterStatus) {
                return false;
            }
            return true;
        });
    }, [tasks, searchQuery, filterAssignee, filterPriority, filterStatus]);

    const projectMembers = useMemo(() => {
        const set = new Set<string>();
        tasks.forEach((t) => {
            if (t.assigned_to_name) set.add(t.assigned_to_name);
        });
        (project.assignees || []).forEach((a) => set.add(a));
        employees.forEach((e) => set.add(e.name));
        return Array.from(set);
    }, [tasks, project.assignees, employees]);

    // Status menu
    const getStatusMenuItems = (task: JiraTask): MenuProps["items"] => [
        { key: "not_started", label: "To Do" },
        { key: "in_progress", label: "In Progress" },
        { key: "under_review", label: "Under Review" },
        { key: "rework_needed", label: "Rework" },
        { key: "completed", label: "Done" },
    ].map((s) => ({
        key: s.key,
        label: (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: normalizeStatus(s.key).text }} />
                <span style={{ fontWeight: task.task_status === s.key ? 700 : 500 }}>{s.label}</span>
                {task.task_status === s.key && <CheckOutlined style={{ marginLeft: "auto", color: "#16a34a" }} />}
            </div>
        ),
        onClick: () => handleStatusChange(task, s.key),
    }));

    return (
        <div
            style={{
                background: "#ffffff",
                minHeight: isFullscreen ? "100vh" : "calc(100vh - 70px)",
                padding: "20px 32px 60px",
                maxWidth: 1600,
                margin: "0 auto",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                color: "#172b4d",
            }}
        >
            {/* ── STYLING SPECIFICATIONS ── */}
            <style>{`
                .jira-tab-btn {
                    padding: 8px 14px;
                    font-size: 14px;
                    font-weight: 500;
                    color: #44546f;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    position: relative;
                    transition: color 0.15s ease;
                }
                .jira-tab-btn:hover { color: #D14E9A; }
                .jira-tab-btn.active { color: #D14E9A; font-weight: 600; }
                .jira-tab-btn.active::after {
                    content: '';
                    position: absolute;
                    bottom: -2px;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: #D14E9A;
                    border-radius: 2px 2px 0 0;
                }
                .jira-table-row {
                    transition: background 0.12s ease;
                    border-bottom: 1px solid #f1f5f9;
                }
                .jira-table-row:hover { background: #f8fafc; }
                .jira-table-cell {
                    padding: 9px 12px;
                    font-size: 13.5px;
                    vertical-align: middle;
                }
                .jira-work-clickable {
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border-radius: 4px;
                    padding: 2px 4px;
                    transition: background 0.15s ease;
                }
                .jira-work-clickable:hover {
                    background: #e9f2ff;
                }
                .jira-assignee-cell {
                    position: relative;
                    cursor: pointer;
                    padding: 4px 6px;
                    border-radius: 6px;
                    border: 1px solid transparent;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.15s ease;
                }
                .jira-assignee-cell:hover, .jira-assignee-cell.active {
                    background: #eff6ff;
                    border-color: #3b82f6;
                }
                .jira-dialog-section-header {
                    font-size: 13px;
                    font-weight: 700;
                    color: #475569;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    user-select: none;
                }
                .jira-dialog-tab {
                    padding: 6px 12px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #64748b;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                }
                .jira-dialog-tab.active {
                    color: #D14E9A;
                    border-bottom: 2px solid #D14E9A;
                }
                .kanban-column {
                    background: #f4f5f7;
                    border-radius: 10px;
                    padding: 12px;
                    min-height: 520px;
                    display: flex;
                    flex-direction: column;
                }
                .kanban-card {
                    background: #ffffff;
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 10px;
                    box-shadow: 0 1px 3px rgba(9, 30, 66, 0.12);
                    border: 1px solid #dfe1e6;
                    cursor: pointer;
                    transition: box-shadow 0.15s ease, transform 0.15s ease;
                }
                .kanban-card:hover {
                    box-shadow: 0 4px 10px rgba(9, 30, 66, 0.2);
                    transform: translateY(-2px);
                }
                .trello-board-wrapper {
                    display: flex;
                    gap: 16px;
                    overflow-x: auto;
                    padding: 14px 4px 20px;
                    align-items: flex-start;
                    min-height: 540px;
                }
                .trello-column-card {
                    width: 285px;
                    min-width: 285px;
                    max-width: 285px;
                    background: #f1f2f4;
                    border-radius: 12px;
                    border: 1px solid #dfe1e6;
                    box-shadow: 0 1px 3px rgba(9, 30, 66, 0.12);
                    display: flex;
                    flex-direction: column;
                    max-height: calc(100vh - 250px);
                }
                .trello-card-item {
                    background: #ffffff;
                    border-radius: 8px;
                    border: 1px solid #dfe1e6;
                    box-shadow: 0 1px 2px rgba(9, 30, 66, 0.1);
                    cursor: pointer;
                    overflow: hidden;
                    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
                }
                .trello-card-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(9, 30, 66, 0.16);
                    border-color: #cbd5e1;
                }
                .trello-add-card-btn {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 7px 10px;
                    color: #44546f;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    border-radius: 8px;
                    margin: 6px 8px 8px;
                    transition: background 0.15s ease, color 0.15s ease;
                }
                .trello-add-card-btn:hover {
                    background: rgba(9, 30, 66, 0.08);
                    color: #172b4d;
                }
            `}</style>

            {/* ── BREADCRUMB & TOP ACTIONS ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#626f86" }}>
                    {onBack && (
                        <>
                            <Button
                                type="text"
                                size="small"
                                icon={<ArrowLeftOutlined />}
                                onClick={onBack}
                                style={{ color: "#44546f", fontWeight: 600, padding: "0 6px" }}
                            >
                                Back
                            </Button>
                            <span>/</span>
                        </>
                    )}
                    <span style={{ cursor: onBack ? "pointer" : "default" }} onClick={onBack}>
                        {userRole === "employee" ? "My Workspace" : "Spaces"}
                    </span>
                    {department.name ? (
                        <>
                            <span>&gt;</span>
                            <span style={{ cursor: onBack ? "pointer" : "default" }} onClick={onBack}>
                                {department.name}
                            </span>
                        </>
                    ) : null}
                    <span>&gt;</span>
                    <Tag color={mode === "recurring" ? "green" : "blue"} style={{ margin: 0, fontWeight: 600 }}>
                        {mode === "recurring" ? "Recurring Mode" : "Normal Mode"}
                    </Tag>
                    {project?.project_name ? (
                        <>
                            <span>&gt;</span>
                            <span style={{ color: "#172b4d", fontWeight: 600 }}>{project.project_name}</span>
                        </>
                    ) : null}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Tooltip title="Share Project">
                        <Button
                            type="text"
                            icon={<ShareAltOutlined style={{ fontSize: 15, color: "#44546f" }} />}
                            onClick={() => {
                                navigator.clipboard?.writeText(window.location.href);
                                message.success("Project link copied!");
                            }}
                        />
                    </Tooltip>
                    <Tooltip title="Automations">
                        <Button
                            type="text"
                            icon={<ThunderboltOutlined style={{ fontSize: 15, color: "#44546f" }} />}
                            onClick={() => message.info("Timer triggers and auto-reassign active")}
                        />
                    </Tooltip>
                    <Tooltip title="Toggle Layout">
                        <Button type="text" icon={<LayoutOutlined style={{ fontSize: 15, color: "#44546f" }} />} />
                    </Tooltip>
                    <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                        <Button
                            type="text"
                            icon={
                                isFullscreen ? (
                                    <FullscreenExitOutlined style={{ fontSize: 15, color: "#44546f" }} />
                                ) : (
                                    <FullscreenOutlined style={{ fontSize: 15, color: "#44546f" }} />
                                )
                            }
                            onClick={() => setIsFullscreen(!isFullscreen)}
                        />
                    </Tooltip>
                </div>
            </div>

            {/* ── PROJECT TITLE BAR ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div
                    style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: mode === "recurring" ? "#059669" : "#D14E9A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        boxShadow: mode === "recurring" ? "0 2px 6px rgba(5, 150, 105, 0.35)" : "0 2px 6px rgba(209, 78, 154, 0.35)",
                        fontSize: 18,
                    }}
                >
                    {mode === "recurring" ? "🔁" : "📒"}
                </div>

                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#172b4d", letterSpacing: "-0.015em" }}>
                    {customTitle || (mode === "recurring" ? "Recurring Tasks" : (project.project_name || (department.name ? `${department.name} Tasks` : "Normal Tasks")))}
                </h1>

                <Tooltip title={`${projectMembers.length} Project Contributors`}>
                    <button
                        style={{
                            background: "#f1f2f4",
                            border: "none",
                            borderRadius: 6,
                            padding: "4px 8px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 13,
                            color: "#44546f",
                            cursor: "pointer",
                            fontWeight: 600,
                        }}
                        onClick={() => message.info(`Team Members: ${projectMembers.join(", ") || "All Members"}`)}
                    >
                        👥 <span style={{ fontSize: 12 }}>{projectMembers.length}</span>
                    </button>
                </Tooltip>

                <Button type="text" icon={<MoreOutlined style={{ fontSize: 16, color: "#44546f" }} />} />
            </div>

            {/* ── TABS ── */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    borderBottom: "1px solid #dfe1e6",
                    marginBottom: 16,
                    gap: 4,
                    overflowX: "auto",
                }}
            >
                <button
                    className={`jira-tab-btn ${activeTab === "summary" ? "active" : ""}`}
                    onClick={() => setActiveTab("summary")}
                >
                    <GlobalOutlined style={{ fontSize: 14 }} /> Summary
                </button>
                <button
                    className={`jira-tab-btn ${activeTab === "backlog" ? "active" : ""}`}
                    onClick={() => setActiveTab("backlog")}
                >
                    <ProfileOutlined style={{ fontSize: 14 }} /> Backlog
                </button>
                <button
                    className={`jira-tab-btn ${activeTab === "board" ? "active" : ""}`}
                    onClick={() => setActiveTab("board")}
                >
                    <AppstoreOutlined style={{ fontSize: 14 }} /> Board
                </button>
                <button
                    className={`jira-tab-btn ${activeTab === "timeline" ? "active" : ""}`}
                    onClick={() => setActiveTab("timeline")}
                >
                    <LineChartOutlined style={{ fontSize: 14 }} /> Timeline
                </button>
                <button
                    className={`jira-tab-btn ${activeTab === "docs" ? "active" : ""}`}
                    onClick={() => setActiveTab("docs")}
                >
                    <FileTextOutlined style={{ fontSize: 14 }} /> Docs
                </button>
                <button className="jira-tab-btn" onClick={() => message.info("Forms available")}>
                    <FormOutlined style={{ fontSize: 14 }} /> Forms
                </button>
                <button
                    className={`jira-tab-btn ${activeTab === "calendar" ? "active" : ""}`}
                    onClick={() => setActiveTab("calendar")}
                >
                    <CalendarOutlined style={{ fontSize: 14 }} /> Calendar
                </button>
                <button
                    className={`jira-tab-btn ${activeTab === "list" ? "active" : ""}`}
                    onClick={() => setActiveTab("list")}
                >
                    <TableOutlined style={{ fontSize: 14 }} /> List
                </button>
                {mode !== "recurring" && (
                    <button
                        className={`jira-tab-btn ${activeTab === "trello" ? "active" : ""}`}
                        onClick={() => setActiveTab("trello")}
                    >
                        <LayoutOutlined style={{ fontSize: 14 }} /> Trello
                    </button>
                )}
            </div>

            {/* ── TOOLBAR ── */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 16,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <button
                        onClick={() => setAiModalOpen(true)}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 14px",
                            borderRadius: 18,
                            background: "linear-gradient(135deg, #f0f7ff 0%, #faf5ff 100%)",
                            border: "1px solid #c7d2fe",
                            color: "#4338ca",
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: "pointer",
                        }}
                    >
                        <span>✨</span> Ask AI
                    </button>

                    <Input
                        prefix={<SearchOutlined style={{ color: "#8590a2" }} />}
                        placeholder="Search work..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        allowClear
                        style={{ width: 220, borderRadius: 20, height: 34, fontSize: 13 }}
                    />

                    {/* Member Filter Chips */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {projectMembers.map((member) => {
                            const colors = getAvatarColor(member);
                            const initials = getInitials(member);
                            const isSelected = filterAssignee === member;
                            return (
                                <Tooltip key={member} title={member}>
                                    <div
                                        onClick={() => setFilterAssignee(isSelected ? null : member)}
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: "50%",
                                            background: colors.bg,
                                            color: colors.text,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 11,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            outline: isSelected ? "2.5px solid #0c66e4" : "none",
                                            outlineOffset: 1,
                                        }}
                                    >
                                        {initials}
                                    </div>
                                </Tooltip>
                            );
                        })}
                        {filterAssignee && (
                            <Button
                                type="text"
                                size="small"
                                icon={<CloseOutlined style={{ fontSize: 10 }} />}
                                onClick={() => setFilterAssignee(null)}
                            />
                        )}
                    </div>

                    {/* Filter Button */}
                    <Dropdown
                        trigger={["click"]}
                        dropdownRender={() => (
                            <div
                                style={{
                                    background: "#fff",
                                    padding: "14px 16px",
                                    borderRadius: 10,
                                    boxShadow: "0 8px 24px rgba(9, 30, 66, 0.18)",
                                    width: 260,
                                    border: "1px solid #dfe1e6",
                                }}
                            >
                                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Filter Tasks</div>
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "#626f86", marginBottom: 4 }}>
                                        PRIORITY
                                    </div>
                                    <Select
                                        size="small"
                                        style={{ width: "100%" }}
                                        placeholder="All Priorities"
                                        value={filterPriority}
                                        allowClear
                                        onChange={(val) => setFilterPriority(val)}
                                        options={[
                                            { value: "critical", label: "Highest" },
                                            { value: "high", label: "High" },
                                            { value: "medium", label: "Medium" },
                                            { value: "low", label: "Low" },
                                        ]}
                                    />
                                </div>
                                <div style={{ marginBottom: 14 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "#626f86", marginBottom: 4 }}>
                                        STATUS
                                    </div>
                                    <Select
                                        size="small"
                                        style={{ width: "100%" }}
                                        placeholder="All Statuses"
                                        value={filterStatus}
                                        allowClear
                                        onChange={(val) => setFilterStatus(val)}
                                        options={[
                                            { value: "not_started", label: "To Do" },
                                            { value: "in_progress", label: "In Progress" },
                                            { value: "paused", label: "Paused" },
                                            { value: "under_review", label: "Under Review" },
                                            { value: "rework_needed", label: "Rework" },
                                            { value: "completed", label: "Done" },
                                        ]}
                                    />
                                </div>
                                <Button
                                    size="small"
                                    type="link"
                                    onClick={() => {
                                        setFilterPriority(null);
                                        setFilterStatus(null);
                                        setFilterAssignee(null);
                                    }}
                                >
                                    Reset filters
                                </Button>
                            </div>
                        )}
                    >
                        <button
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 12px",
                                borderRadius: 6,
                                background: filterPriority || filterStatus ? "#e0f2fe" : "#ffffff",
                                border: `1px solid ${filterPriority || filterStatus ? "#0284c7" : "#dfe1e6"}`,
                                color: filterPriority || filterStatus ? "#0284c7" : "#44546f",
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: "pointer",
                            }}
                        >
                            <FilterOutlined style={{ fontSize: 12 }} /> Filter
                        </button>
                    </Dropdown>

                    {/* Group Button */}
                    <Dropdown
                        menu={{
                            items: [
                                { key: "none", label: "None", onClick: () => setGroupBy("none") },
                                { key: "status", label: "Group by Status", onClick: () => setGroupBy("status") },
                                { key: "assignee", label: "Group by Assignee", onClick: () => setGroupBy("assignee") },
                                { key: "priority", label: "Group by Priority", onClick: () => setGroupBy("priority") },
                            ],
                        }}
                    >
                        <button
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 12px",
                                borderRadius: 6,
                                background: groupBy !== "none" ? "#f5f3ff" : "#ffffff",
                                border: `1px solid ${groupBy !== "none" ? "#7c3aed" : "#dfe1e6"}`,
                                color: groupBy !== "none" ? "#7c3aed" : "#44546f",
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: "pointer",
                            }}
                        >
                            <BarsOutlined style={{ fontSize: 12 }} /> Group
                        </button>
                    </Dropdown>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Tooltip title="Refresh Tasks">
                        <Button
                            icon={<ReloadOutlined style={{ color: "#44546f" }} />}
                            onClick={fetchTasks}
                            loading={loading}
                            style={{ borderRadius: 6, height: 34 }}
                        />
                    </Tooltip>
                </div>
            </div>

            {/* ── TAB CONTENT ── */}
            {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
                    <Spin size="large" tip="Loading project workspace..." />
                </div>
            ) : activeTab === "list" ? (
                /* ══════════════════════════════════════════════════════════════════
                   1. JIRA LIST TABLE WITH ALL COLUMNS & TIMER CONTROLS
                   ══════════════════════════════════════════════════════════════════ */
                <div
                    style={{
                        border: "1px solid #dfe1e6",
                        borderRadius: 8,
                        background: "#ffffff",
                        overflowX: "auto",
                        boxShadow: "0 1px 3px rgba(9, 30, 66, 0.08)",
                    }}
                >
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: 1350 }}>
                        <thead>
                            <tr
                                style={{
                                    background: "#f7f8f9",
                                    borderBottom: "1px solid #dfe1e6",
                                    color: "#626f86",
                                    fontSize: 12,
                                    fontWeight: 700,
                                }}
                            >
                                <th style={{ width: 36, padding: "10px 12px", textAlign: "center" }}>
                                    <input type="checkbox" style={{ cursor: "pointer" }} />
                                </th>
                                <th style={{ padding: "10px 12px", width: 110 }}>Task ID</th>
                                <th style={{ padding: "10px 12px", width: 120 }}>Sub Task ID</th>
                                <th style={{ padding: "10px 12px", minWidth: 260 }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                        <RightOutlined style={{ fontSize: 10, color: "#8590a2" }} /> Task
                                    </span>
                                </th>
                                <th style={{ padding: "10px 12px", width: 180 }}>Assignee</th>
                                <th style={{ padding: "10px 12px", width: 140 }}>Status</th>
                                <th style={{ padding: "10px 12px", width: 130 }}>Priority</th>
                                <th style={{ padding: "10px 12px", width: 160 }}>Reporter</th>
                                <th style={{ padding: "10px 12px", width: 140 }}>Due Date</th>
                                <th style={{ padding: "10px 12px", width: 90 }}>Allotted</th>
                                <th style={{ padding: "10px 12px", width: 95 }}>Time Taken</th>
                                <th style={{ padding: "10px 12px", width: 190 }}>Timer Actions</th>
                                <th style={{ width: 44, padding: "10px 12px", textAlign: "center" }}>
                                    <SettingOutlined style={{ color: "#8590a2" }} />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTasks.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={13}
                                        style={{
                                            textAlign: "center",
                                            padding: "48px 20px",
                                            color: "#8590a2",
                                            fontSize: 14,
                                        }}
                                    >
                                        No tasks found. Click <b>+ Create</b> below to quickly add one!
                                    </td>
                                </tr>
                            ) : (
                                filteredTasks.map((task) => {
                                    const assigneeColors = getAvatarColor(task.assigned_to_name || "");
                                    const reporterColors = getAvatarColor(task.assigned_by_name || "Admin");
                                    const statusMeta = normalizeStatus(task.task_status);
                                    const isAssigneeMenuOpen = activeAssigneeTaskId === task.id;

                                    return (
                                        <tr key={task.id} className="jira-table-row">
                                            {/* Checkbox */}
                                            <td className="jira-table-cell" style={{ textAlign: "center" }}>
                                                <input type="checkbox" style={{ cursor: "pointer" }} />
                                            </td>

                                            {/* TASK ID COLUMN */}
                                            <td className="jira-table-cell">
                                                <span
                                                    style={{
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        color: "#626f86",
                                                        background: "#f1f2f4",
                                                        padding: "3px 8px",
                                                        borderRadius: 4,
                                                        cursor: "pointer",
                                                        display: "inline-block",
                                                    }}
                                                    onClick={() => openTaskDetailModal(task)}
                                                    title="Click to view details"
                                                >
                                                    {task.task_id || "—"}
                                                </span>
                                            </td>

                                            {/* SUB TASK ID COLUMN */}
                                            <td className="jira-table-cell">
                                                <span
                                                    style={{
                                                        color: "#0c66e4",
                                                        fontWeight: 600,
                                                        textDecoration: "underline",
                                                        textUnderlineOffset: 2,
                                                        fontSize: 13,
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() => openTaskDetailModal(task)}
                                                    title="Click to view details"
                                                >
                                                    {task.sub_task_id || "—"}
                                                </span>
                                            </td>

                                            {/* TASK COLUMN (Task Name only) */}
                                            <td className="jira-table-cell">
                                                <div
                                                    className="jira-work-clickable"
                                                    onClick={() => openTaskDetailModal(task)}
                                                    title="Click to view and edit task in Jira dialog"
                                                    style={{ display: "flex", alignItems: "center", gap: 7 }}
                                                >
                                                    <span style={{ color: "#7c3aed", fontSize: 14, lineHeight: 1 }}>
                                                        ⚡
                                                    </span>
                                                    <span
                                                        style={{
                                                            color: "#172b4d",
                                                            fontWeight: 500,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                            maxWidth: 320,
                                                        }}
                                                    >
                                                        {task.task_name}
                                                    </span>
                                                    {task.is_recurring && (
                                                        <Tag color="green" style={{ fontSize: 10, padding: "0 5px", margin: 0 }}>
                                                            🔁 Recurring
                                                        </Tag>
                                                    )}
                                                </div>
                                            </td>

                                            {/* ASSIGNEE COLUMN (Screenshot 1 clone: Interactive inline dropdown) */}
                                            <td className="jira-table-cell">
                                                <Dropdown
                                                    open={isAssigneeMenuOpen}
                                                    onOpenChange={(open) => setActiveAssigneeTaskId(open ? task.id : null)}
                                                    trigger={["click"]}
                                                    dropdownRender={() => (
                                                        <div
                                                            style={{
                                                                background: "#ffffff",
                                                                borderRadius: 8,
                                                                boxShadow: "0 8px 24px rgba(9, 30, 66, 0.2)",
                                                                border: "1px solid #dfe1e6",
                                                                width: 240,
                                                                padding: "6px 0",
                                                                maxHeight: 280,
                                                                overflowY: "auto",
                                                            }}
                                                        >
                                                            {/* Unassigned Option */}
                                                            <div
                                                                onClick={() => handleReassign(task, null)}
                                                                style={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 10,
                                                                    padding: "8px 14px",
                                                                    cursor: "pointer",
                                                                    fontSize: 13,
                                                                    color: "#172b4d",
                                                                }}
                                                            >
                                                                <span style={{ fontSize: 14 }}>👤</span>
                                                                <span>Unassigned</span>
                                                                {!task.assigned_to_name && (
                                                                    <CheckOutlined style={{ marginLeft: "auto", color: "#16a34a" }} />
                                                                )}
                                                            </div>

                                                            {/* Automatic Option */}
                                                            <div
                                                                onClick={() => {
                                                                    if (employees.length > 0) handleReassign(task, employees[0].id);
                                                                }}
                                                                style={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 10,
                                                                    padding: "8px 14px",
                                                                    cursor: "pointer",
                                                                    fontSize: 13,
                                                                    color: "#172b4d",
                                                                    borderBottom: "1px solid #f1f5f9",
                                                                }}
                                                            >
                                                                <span style={{ fontSize: 14 }}>👤</span>
                                                                <span>Automatic</span>
                                                            </div>

                                                            {/* Team Members List with colored circle avatars */}
                                                            {employees.map((emp) => {
                                                                const colors = getAvatarColor(emp.name);
                                                                const isCurr = task.assigned_to === emp.id;
                                                                return (
                                                                    <div
                                                                        key={emp.id}
                                                                        onClick={() => handleReassign(task, emp.id)}
                                                                        style={{
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            gap: 10,
                                                                            padding: "8px 14px",
                                                                            cursor: "pointer",
                                                                            fontSize: 13,
                                                                            color: "#172b4d",
                                                                            background: isCurr ? "#f0f7ff" : "transparent",
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                width: 22,
                                                                                height: 22,
                                                                                borderRadius: "50%",
                                                                                background: colors.bg,
                                                                                color: colors.text,
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "center",
                                                                                fontSize: 10,
                                                                                fontWeight: 700,
                                                                            }}
                                                                        >
                                                                            {getInitials(emp.name)}
                                                                        </div>
                                                                        <span>{emp.name}</span>
                                                                        {isCurr && (
                                                                            <CheckOutlined style={{ marginLeft: "auto", color: "#16a34a" }} />
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                >
                                                    <div className={`jira-assignee-cell ${isAssigneeMenuOpen ? "active" : ""}`}>
                                                        {task.assigned_to_name ? (
                                                            <>
                                                                <div
                                                                    style={{
                                                                        width: 24,
                                                                        height: 24,
                                                                        borderRadius: "50%",
                                                                        background: assigneeColors.bg,
                                                                        color: assigneeColors.text,
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                        fontSize: 10,
                                                                        fontWeight: 700,
                                                                        flexShrink: 0,
                                                                    }}
                                                                >
                                                                    {getInitials(task.assigned_to_name)}
                                                                </div>
                                                                <span style={{ fontSize: 13, color: "#172b4d", fontWeight: 500 }}>
                                                                    {task.assigned_to_name}
                                                                </span>
                                                                <CloseOutlined
                                                                    style={{ fontSize: 9, color: "#94a3b8", marginLeft: 4 }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleReassign(task, null);
                                                                    }}
                                                                />
                                                            </>
                                                        ) : (
                                                            <span style={{ color: "#8590a2", fontSize: 12, fontStyle: "italic" }}>
                                                                + Assign
                                                            </span>
                                                        )}
                                                    </div>
                                                </Dropdown>
                                            </td>

                                            {/* STATUS DROPDOWN PILL (Positioned after Assignee as requested) */}
                                            <td className="jira-table-cell">
                                                <Dropdown menu={{ items: getStatusMenuItems(task) }} trigger={["click"]}>
                                                    <button
                                                        style={{
                                                            background: statusMeta.bg,
                                                            color: statusMeta.text,
                                                            border: `1px solid ${statusMeta.border}`,
                                                            padding: "3px 10px",
                                                            borderRadius: 5,
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: 5,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        <span>{statusMeta.label}</span>
                                                        <DownOutlined style={{ fontSize: 9 }} />
                                                    </button>
                                                </Dropdown>
                                            </td>

                                            {/* PRIORITY COLUMN (with interactive quick changer) */}
                                            <td className="jira-table-cell">
                                                <Dropdown
                                                    menu={{
                                                        items: ["critical", "high", "medium", "low"].map((pr) => ({
                                                            key: pr,
                                                            label: renderPriority(pr),
                                                            onClick: () => handleUpdateTaskField(task.id, { priority: pr }),
                                                        })),
                                                    }}
                                                    trigger={["click"]}
                                                >
                                                    <span style={{ cursor: "pointer" }}>{renderPriority(task.priority)}</span>
                                                </Dropdown>
                                            </td>

                                            {/* REPORTER COLUMN */}
                                            <td className="jira-table-cell">
                                                {canEditTask(task) && reporters.length > 0 ? (
                                                    <Dropdown
                                                        menu={{
                                                            items: reporters.map((r) => ({
                                                                key: r.key,
                                                                label: r.label,
                                                                onClick: () => {
                                                                    handleUpdateTaskField(task.id, {
                                                                        reporter: r.key,
                                                                        assigned_by_name: r.name,
                                                                        reporter_key: r.key,
                                                                    });
                                                                },
                                                            })),
                                                        }}
                                                        trigger={["click"]}
                                                    >
                                                        <div style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }} title="Click to change reporter">
                                                            <div
                                                                style={{
                                                                    width: 22,
                                                                    height: 22,
                                                                    borderRadius: "50%",
                                                                    background: reporterColors.bg,
                                                                    color: reporterColors.text,
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    fontSize: 9,
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                {getInitials(task.assigned_by_name || "Admin")}
                                                            </div>
                                                            <span style={{ fontSize: 13, color: "#172b4d" }}>
                                                                {task.assigned_by_name || "Admin"}
                                                            </span>
                                                            <DownOutlined style={{ fontSize: 9, color: "#94a3b8" }} />
                                                        </div>
                                                    </Dropdown>
                                                ) : (
                                                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                                        <div
                                                            style={{
                                                                width: 22,
                                                                height: 22,
                                                                borderRadius: "50%",
                                                                background: reporterColors.bg,
                                                                color: reporterColors.text,
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                fontSize: 9,
                                                                fontWeight: 700,
                                                            }}
                                                        >
                                                            {getInitials(task.assigned_by_name || "Admin")}
                                                        </div>
                                                        <span style={{ fontSize: 13, color: "#172b4d" }}>
                                                            {task.assigned_by_name || "Admin"}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* DUE DATE COLUMN (Interactive DatePicker) */}
                                            <td className="jira-table-cell">
                                                <DatePicker
                                                    size="small"
                                                    value={task.due_date ? dayjs(task.due_date) : null}
                                                    onChange={(_date, dateString) =>
                                                        handleUpdateTaskField(task.id, { due_date: dateString || null })
                                                    }
                                                    placeholder="Set due date"
                                                    style={{ width: 130, borderRadius: 6, fontSize: 12 }}
                                                />
                                            </td>

                                            {/* ALLOTTED TIME */}
                                            <td className="jira-table-cell">
                                                <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>
                                                    {task.allotted_time ? `${task.allotted_time}h` : "—"}
                                                </span>
                                            </td>

                                            {/* TIME TAKEN */}
                                            <td className="jira-table-cell">
                                                <span style={{ fontSize: 12, color: "#0c66e4", fontWeight: 600 }}>
                                                    {task.total_time_taken ? `${task.total_time_taken}h` : "0.0h"}
                                                </span>
                                            </td>

                                            {/* TIMER ACTIONS COLUMN (Start, Pause, Resume, Submit) */}
                                            <td className="jira-table-cell">
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    {isTaskMine(task) ? (
                                                        task.task_status === "not_started" ? (
                                                            <Button
                                                                size="small"
                                                                type="primary"
                                                                icon={<PlayCircleOutlined />}
                                                                loading={timerBusyTaskId === task.id}
                                                                onClick={() => handleStartTimer(task)}
                                                                style={{
                                                                    background: "#16a34a",
                                                                    borderColor: "#16a34a",
                                                                    borderRadius: 6,
                                                                    fontSize: 11,
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                Start
                                                            </Button>
                                                        ) : task.task_status === "in_progress" ? (
                                                            <>
                                                                <Button
                                                                    size="small"
                                                                    icon={<PauseCircleOutlined />}
                                                                    loading={timerBusyTaskId === task.id}
                                                                    onClick={() => {
                                                                        setPauseTarget(task);
                                                                        setPauseReason("");
                                                                        setPauseModalOpen(true);
                                                                    }}
                                                                    style={{
                                                                        borderRadius: 6,
                                                                        fontSize: 11,
                                                                        fontWeight: 600,
                                                                        borderColor: "#f59e0b",
                                                                        color: "#b45309",
                                                                    }}
                                                                >
                                                                    Pause
                                                                </Button>
                                                                <Button
                                                                    size="small"
                                                                    type="primary"
                                                                    icon={<CheckCircleOutlined />}
                                                                    loading={timerBusyTaskId === task.id}
                                                                    onClick={() => {
                                                                        setSubmitTarget(task);
                                                                        setSubmitSheetLink("");
                                                                        setSubmitRemarks("");
                                                                        setSubmitModalOpen(true);
                                                                    }}
                                                                    style={{
                                                                        background: "#0c66e4",
                                                                        borderRadius: 6,
                                                                        fontSize: 11,
                                                                        fontWeight: 600,
                                                                    }}
                                                                >
                                                                    Submit
                                                                </Button>
                                                            </>
                                                        ) : task.task_status === "paused" || task.task_status === "rework_needed" ? (
                                                            <>
                                                                <Button
                                                                    size="small"
                                                                    type="primary"
                                                                    icon={<PlayCircleOutlined />}
                                                                    loading={timerBusyTaskId === task.id}
                                                                    onClick={() => handleResumeTimer(task)}
                                                                    style={{
                                                                        background: "#16a34a",
                                                                        borderColor: "#16a34a",
                                                                        borderRadius: 6,
                                                                        fontSize: 11,
                                                                        fontWeight: 600,
                                                                    }}
                                                                >
                                                                    Resume
                                                                </Button>
                                                                <Button
                                                                    size="small"
                                                                    icon={<CheckCircleOutlined />}
                                                                    onClick={() => {
                                                                        setSubmitTarget(task);
                                                                        setSubmitSheetLink("");
                                                                        setSubmitRemarks("");
                                                                        setSubmitFiles([]);
                                                                        setSubmitModalOpen(true);
                                                                    }}
                                                                    style={{ borderRadius: 6, fontSize: 11, fontWeight: 600 }}
                                                                >
                                                                    Submit
                                                                </Button>
                                                            </>
                                                        ) : task.task_status === "completed" ? (
                                                            <Tag color="success" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
                                                                ✓ Done
                                                            </Tag>
                                                        ) : (
                                                            <Tag color="processing" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
                                                                In Review
                                                            </Tag>
                                                        )
                                                    ) : task.task_status === "completed" ? (
                                                        <Tag color="success" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
                                                            ✓ Done
                                                        </Tag>
                                                    ) : task.task_status === "under_review" || task.task_status === "submitted" ? (
                                                        <Tag color="processing" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
                                                            In Review
                                                        </Tag>
                                                    ) : (
                                                        <span style={{ color: "#94a3b8", fontSize: 13 }}>—</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Config / Actions menu */}
                                            <td className="jira-table-cell" style={{ textAlign: "center" }}>
                                                <Dropdown
                                                    menu={{
                                                        items: [
                                                            {
                                                                key: "open",
                                                                label: "Open Jira Dialog",
                                                                onClick: () => openTaskDetailModal(task),
                                                            },
                                                            {
                                                                key: "copy",
                                                                label: "Copy Issue Key",
                                                                onClick: () => {
                                                                    navigator.clipboard?.writeText(task.sub_task_id || task.task_id);
                                                                    message.success("Copied key");
                                                                },
                                                            },
                                                        ],
                                                    }}
                                                >
                                                    <Button type="text" size="small" icon={<MoreOutlined style={{ color: "#8590a2" }} />} />
                                                </Dropdown>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}

                            {/* ── INLINE QUICK CREATE ROW ── */}
                            {isCreatingInline && (
                                <tr style={{ background: "#f8fafc", borderTop: "2px dashed #0c66e4", borderBottom: "1px solid #cbd5e1" }}>
                                    <td style={{ textAlign: "center", padding: "10px 12px" }}>
                                        <span style={{ color: "#7c3aed", fontSize: 14 }}>⚡</span>
                                    </td>
                                    {/* Task ID auto */}
                                    <td style={{ padding: "10px 12px" }}>
                                        <span style={{ color: "#94a3b8", fontSize: 12, fontStyle: "italic" }}>Auto</span>
                                    </td>
                                    {/* Sub Task ID auto */}
                                    <td style={{ padding: "10px 12px" }}>
                                        <span style={{ color: "#94a3b8", fontSize: 12, fontStyle: "italic" }}>Auto</span>
                                    </td>
                                    {/* Task Name */}
                                    <td style={{ padding: "10px 12px" }}>
                                        <Input
                                            ref={inlineInputRef}
                                            placeholder="What needs to be done? (Press Enter to create)"
                                            value={inlineTaskName}
                                            onChange={(e) => setInlineTaskName(e.target.value)}
                                            onPressEnter={handleQuickCreate}
                                            disabled={createLoading}
                                            style={{ borderRadius: 6, borderColor: "#0c66e4", height: 34, fontSize: 13 }}
                                        />
                                    </td>
                                    <td style={{ padding: "10px 12px" }}>
                                        {userRole === "employee" || user?.role === "employee" ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#1e293b", fontWeight: 600 }}>
                                                <span>👤</span>
                                                <span>{user?.name || "You (Self)"}</span>
                                            </div>
                                        ) : (
                                            <Select
                                                placeholder="Assignee"
                                                value={inlineAssignee}
                                                onChange={(val) => setInlineAssignee(val)}
                                                style={{ width: "100%" }}
                                                allowClear
                                                options={employees.map((e) => ({ value: e.id, label: e.name }))}
                                            />
                                        )}
                                    </td>
                                    {/* Status (Positioned after Assignee) */}
                                    <td style={{ padding: "10px 12px" }}>
                                        <Tag color="default" style={{ margin: 0, fontSize: 11.5, padding: "2px 8px" }}>To Do</Tag>
                                    </td>
                                    {/* Priority */}
                                    <td style={{ padding: "10px 12px" }}>
                                        <Select
                                            value={inlinePriority}
                                            onChange={(val) => setInlinePriority(val)}
                                            style={{ width: "100%" }}
                                            options={[
                                                { value: "critical", label: "Highest" },
                                                { value: "high", label: "High" },
                                                { value: "medium", label: "Medium" },
                                                { value: "low", label: "Low" },
                                            ]}
                                        />
                                    </td>
                                    {/* Reporter */}
                                    <td style={{ padding: "10px 12px" }}>
                                        <Select
                                            placeholder="Reporter"
                                            value={inlineReporter}
                                            onChange={(val) => setInlineReporter(val)}
                                            allowClear
                                            style={{ width: "100%", minWidth: 140 }}
                                            options={reporters.map((r) => ({
                                                value: r.key,
                                                label: r.label,
                                            }))}
                                        />
                                    </td>
                                    {/* Due Date */}
                                    <td style={{ padding: "10px 12px" }}>
                                        <DatePicker
                                            size="middle"
                                            onChange={(_d, ds) => setInlineDueDate(typeof ds === "string" ? ds : null)}
                                            placeholder="Due date"
                                            style={{ width: "100%", borderRadius: 6 }}
                                        />
                                    </td>
                                    {/* Allotted */}
                                    <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: 12 }}>—</td>
                                    {/* Time taken */}
                                    <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: 12 }}>0.0h</td>
                                    {/* Actions */}
                                    <td colSpan={2} style={{ padding: "10px 12px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <Button
                                                type="primary"
                                                onClick={handleQuickCreate}
                                                loading={createLoading}
                                                style={{ background: "#D14E9A", borderColor: "#D14E9A", borderRadius: 6, fontWeight: 600 }}
                                            >
                                                Create Task
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setIsCreatingInline(false);
                                                    setInlineTaskName("");
                                                }}
                                                style={{ borderRadius: 6 }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* BOTTOM BAR: + Create Button & Item Counter */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 16px",
                            background: "#ffffff",
                            borderTop: "1px solid #dfe1e6",
                        }}
                    >
                        <button
                            onClick={() => setIsCreatingInline(true)}
                            style={{
                                background: "transparent",
                                border: "none",
                                color: "#0c66e4",
                                fontWeight: 600,
                                fontSize: 13.5,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 8px",
                            }}
                        >
                            <PlusOutlined style={{ fontSize: 12 }} /> Create
                        </button>

                        <div style={{ color: "#626f86", fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
                            <span>
                                {filteredTasks.length} of {tasks.length}
                            </span>
                            <ReloadOutlined style={{ cursor: "pointer", fontSize: 11 }} onClick={fetchTasks} />
                        </div>
                    </div>
                </div>
            ) : activeTab === "board" ? (
                /* ══════════════════════════════════════════════════════════════════
                   2. JIRA KANBAN BOARD VIEW
                   ══════════════════════════════════════════════════════════════════ */
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(5, minmax(240px, 1fr))",
                        gap: 14,
                        overflowX: "auto",
                        paddingBottom: 16,
                    }}
                >
                    {[
                        { key: "not_started", title: "TO DO", border: "#cbd5e1" },
                        { key: "in_progress", title: "IN PROGRESS", border: "#0284c7" },
                        { key: "under_review", title: "UNDER REVIEW", border: "#f59e0b" },
                        { key: "rework_needed", title: "REWORK", border: "#ef4444" },
                        { key: "completed", title: "DONE", border: "#10b981" },
                    ].map((col) => {
                        const colTasks = filteredTasks.filter((t) => {
                            if (col.key === "not_started") return t.task_status === "not_started" || t.task_status === "paused";
                            return t.task_status === col.key;
                        });

                        return (
                            <div key={col.key} className="kanban-column" style={{ borderTop: `3px solid ${col.border}` }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "#626f86" }}>{col.title}</span>
                                    <span style={{ background: "#e9ebf0", color: "#44546f", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
                                        {colTasks.length}
                                    </span>
                                </div>

                                <div style={{ flex: 1, overflowY: "auto" }}>
                                    {colTasks.map((t) => (
                                        <div key={t.id} className="kanban-card" onClick={() => openTaskDetailModal(t)}>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: "#172b4d", marginBottom: 8 }}>
                                                {t.task_name}
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                                    <span style={{ color: "#7c3aed", fontSize: 12 }}>⚡</span>
                                                    <span style={{ color: "#0c66e4", fontSize: 11, fontWeight: 600 }}>
                                                        {t.sub_task_id || t.task_id}
                                                    </span>
                                                    <span style={{ marginLeft: 6 }}>{renderPriority(t.priority)}</span>
                                                </div>
                                                {t.assigned_to_name && (
                                                    <div
                                                        style={{
                                                            width: 22,
                                                            height: 22,
                                                            borderRadius: "50%",
                                                            background: getAvatarColor(t.assigned_to_name).bg,
                                                            color: "#fff",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            fontSize: 9,
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        {getInitials(t.assigned_to_name)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : activeTab === "summary" ? (
                /* ══════════════════════════════════════════════════════════════════
                   3. JIRA SUMMARY VIEW
                   ══════════════════════════════════════════════════════════════════ */
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                        <div style={{ background: "#f8fafc", padding: "18px 20px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 600 }}>Total Work Items</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{tasks.length}</div>
                        </div>
                        <div style={{ background: "#f0fdf4", padding: "18px 20px", borderRadius: 12, border: "1px solid #bbf7d0" }}>
                            <div style={{ color: "#166534", fontSize: 12, fontWeight: 600 }}>Completed Items</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: "#16a34a", marginTop: 4 }}>
                                {tasks.filter((t) => t.task_status === "completed").length}
                            </div>
                        </div>
                        <div style={{ background: "#eff6ff", padding: "18px 20px", borderRadius: 12, border: "1px solid #bfdbfe" }}>
                            <div style={{ color: "#1e40af", fontSize: 12, fontWeight: 600 }}>Active In-Flight</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: "#2563eb", marginTop: 4 }}>
                                {tasks.filter((t) => ["in_progress", "under_review", "rework_needed"].includes(t.task_status)).length}
                            </div>
                        </div>
                        <div style={{ background: "#faf5ff", padding: "18px 20px", borderRadius: 12, border: "1px solid #e9d5ff" }}>
                            <div style={{ color: "#6b21a8", fontSize: 12, fontWeight: 600 }}>Completion Velocity</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: "#7c3aed", marginTop: 4 }}>
                                {tasks.length > 0
                                    ? Math.round(
                                          (tasks.filter((t) => t.task_status === "completed").length / tasks.length) * 100
                                      )
                                    : 0}
                                %
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === "calendar" ? (
                /* ══════════════════════════════════════════════════════════════════
                   4. JIRA CALENDAR VIEW
                   ══════════════════════════════════════════════════════════════════ */
                <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <Calendar
                        cellRender={(current, info) => {
                            if (info.type !== "date") return null;
                            const formatted = current.format("YYYY-MM-DD");
                            const dayTasks = tasks.filter((t) => t.due_date === formatted || t.assigned_date === formatted);
                            return (
                                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                    {dayTasks.map((item) => (
                                        <li key={item.id} style={{ marginBottom: 2 }}>
                                            <Badge
                                                status={item.task_status === "completed" ? "success" : "processing"}
                                                text={<span style={{ fontSize: 11, fontWeight: 500 }}>{item.sub_task_id || item.task_id}</span>}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            );
                        }}
                    />
                </div>
            ) : activeTab === "timeline" ? (
                /* ══════════════════════════════════════════════════════════════════
                   5. JIRA TIMELINE VIEW
                   ══════════════════════════════════════════════════════════════════ */
                <div style={{ background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Project Roadmap Timeline</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {tasks.map((t, idx) => (
                            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                                <div style={{ width: 120, fontWeight: 600, color: "#0c66e4", fontSize: 13 }}>
                                    {t.sub_task_id || t.task_id}
                                </div>
                                <div style={{ width: 240, color: "#172b4d", fontSize: 13, fontWeight: 500 }}>
                                    {t.task_name}
                                </div>
                                <div style={{ flex: 1, position: "relative", height: 26, background: "#f8fafc", borderRadius: 6 }}>
                                    <div
                                        style={{
                                            position: "absolute",
                                            left: `${(idx * 15) % 65}%`,
                                            width: `${Math.max(25, 45 - idx * 3)}%`,
                                            top: 3,
                                            bottom: 3,
                                            background: normalizeStatus(t.task_status).bg,
                                            border: `1px solid ${normalizeStatus(t.task_status).border}`,
                                            borderRadius: 4,
                                            display: "flex",
                                            alignItems: "center",
                                            padding: "0 8px",
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: normalizeStatus(t.task_status).text,
                                        }}
                                    >
                                        {normalizeStatus(t.task_status).label}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : activeTab === "trello" ? (
                /* ══════════════════════════════════════════════════════════════════
                   6. TRELLO TYPE BOARD (Screenshots 2 & 4)
                   Each column is a PROJECT name.
                   Tasks under each project are displayed as cards.
                   Bottom has "+ Add a card" inline composer.
                   ══════════════════════════════════════════════════════════════════ */
                <div className="trello-board-wrapper">
                    {trelloColumns.map((colProjectName, colIdx) => {
                        const colTasks = filteredTasks.filter((t) => t.project_name === colProjectName);
                        const isComposing = addingCardCol === colProjectName;

                        return (
                            <div key={colProjectName} className="trello-column-card">
                                {/* Column Header (Screenshot 4: Project Name + Count + ...) */}
                                <div className="trello-col-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px 8px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                                        <span
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 800,
                                                color: "#172b4d",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.03em",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                            title={colProjectName}
                                        >
                                            {colProjectName}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 11.5,
                                                fontWeight: 700,
                                                color: "#626f86",
                                                background: "rgba(9, 30, 66, 0.08)",
                                                padding: "1px 7px",
                                                borderRadius: 10,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {colTasks.length}
                                        </span>
                                    </div>
                                    <Dropdown
                                        menu={{
                                            items: [
                                                {
                                                    key: "add",
                                                    label: "+ Add Card to " + colProjectName,
                                                    onClick: () => {
                                                        setAddingCardCol(colProjectName);
                                                        setNewCardTitle("");
                                                    },
                                                },
                                                {
                                                    key: "switch-list",
                                                    label: "View in List",
                                                    onClick: () => setActiveTab("list"),
                                                },
                                            ],
                                        }}
                                        trigger={["click"]}
                                    >
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<MoreOutlined style={{ color: "#626f86", fontSize: 15 }} />}
                                            style={{ width: 26, height: 26 }}
                                        />
                                    </Dropdown>
                                </div>

                                {/* Cards List (Screenshot 2) */}
                                <div
                                    style={{
                                        flex: 1,
                                        overflowY: "auto",
                                        padding: "4px 8px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 8,
                                        minHeight: 80,
                                    }}
                                >
                                    {colTasks.length === 0 && !isComposing ? (
                                        <div
                                            style={{
                                                padding: "24px 10px",
                                                textAlign: "center",
                                                color: "#94a3b8",
                                                fontSize: 12,
                                                fontStyle: "italic",
                                            }}
                                        >
                                            No tasks in this project yet.
                                        </div>
                                    ) : (
                                        colTasks.map((task, tIdx) => {
                                            const isDone = task.task_status === "completed";
                                            const assigneeColors = getAvatarColor(task.assigned_to_name || "");
                                            // Screenshot 2 coral/orange stripe on top cards or high priority
                                            const showCoralStripe = colIdx === 0 && tIdx < 3;

                                            return (
                                                <div
                                                    key={task.id}
                                                    className="trello-card-item"
                                                    onClick={() => openTaskDetailModal(task)}
                                                    title="Click to view & edit task details"
                                                >
                                                    {/* Coral Top Banner (like Screenshot 2) */}
                                                    {showCoralStripe && (
                                                        <div
                                                            style={{
                                                                height: 28,
                                                                background: "#ff7875",
                                                                borderTopLeftRadius: 7,
                                                                borderTopRightRadius: 7,
                                                            }}
                                                        />
                                                    )}

                                                    <div style={{ padding: "10px 12px" }}>
                                                        {/* Task Name with Green Checkmark if done */}
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "flex-start",
                                                                gap: 6,
                                                                fontSize: 13,
                                                                fontWeight: 600,
                                                                color: "#172b4d",
                                                                lineHeight: 1.4,
                                                                marginBottom: 8,
                                                            }}
                                                        >
                                                            {isDone && (
                                                                <CheckCircleFilled
                                                                    style={{ color: "#16a34a", fontSize: 14, marginTop: 2, flexShrink: 0 }}
                                                                />
                                                            )}
                                                            <span style={{ wordBreak: "break-word" }}>{task.task_name}</span>
                                                        </div>

                                                        {/* Bottom Meta on Card */}
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                justifyContent: "space-between",
                                                                alignItems: "center",
                                                                flexWrap: "wrap",
                                                                gap: 6,
                                                                paddingTop: 4,
                                                                borderTop: "1px solid #f1f5f9",
                                                            }}
                                                        >
                                                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                                                <span style={{ color: "#7c3aed", fontSize: 11 }}>⚡</span>
                                                                <span style={{ color: "#0c66e4", fontSize: 11, fontWeight: 600 }}>
                                                                    {task.sub_task_id || task.task_id}
                                                                </span>
                                                                <span style={{ transform: "scale(0.85)", transformOrigin: "left center" }}>
                                                                    {renderPriority(task.priority)}
                                                                </span>
                                                            </div>

                                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                                {task.due_date && (
                                                                    <span style={{ fontSize: 10.5, color: "#64748b" }}>
                                                                        📅 {task.due_date}
                                                                    </span>
                                                                )}
                                                                {task.assigned_to_name ? (
                                                                    <div
                                                                        style={{
                                                                            width: 20,
                                                                            height: 20,
                                                                            borderRadius: "50%",
                                                                            background: assigneeColors.bg,
                                                                            color: "#fff",
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            justifyContent: "center",
                                                                            fontSize: 8.5,
                                                                            fontWeight: 700,
                                                                        }}
                                                                        title={`Assigned to: ${task.assigned_to_name}`}
                                                                    >
                                                                        {getInitials(task.assigned_to_name)}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}

                                    {/* Inline Add Card Composer */}
                                    {isComposing && (
                                        <div
                                            style={{
                                                background: "#fff",
                                                borderRadius: 8,
                                                padding: 8,
                                                border: "1px solid #0c66e4",
                                                boxShadow: "0 2px 8px rgba(12, 102, 228, 0.15)",
                                            }}
                                        >
                                            <Input.TextArea
                                                autoFocus
                                                rows={2}
                                                placeholder="Enter a title for this card..."
                                                value={newCardTitle}
                                                onChange={(e) => setNewCardTitle(e.target.value)}
                                                onPressEnter={(e) => {
                                                    if (!e.shiftKey) {
                                                        e.preventDefault();
                                                        handleAddTrelloCard(colProjectName);
                                                    }
                                                }}
                                                style={{ resize: "none", border: "none", boxShadow: "none", padding: 4, fontSize: 13 }}
                                            />
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    loading={addCardLoading}
                                                    onClick={() => handleAddTrelloCard(colProjectName)}
                                                    style={{ background: "#D14E9A", borderColor: "#D14E9A", borderRadius: 6, fontWeight: 600 }}
                                                >
                                                    Add Card
                                                </Button>
                                                {reporters.length > 0 && (
                                                    <Select
                                                        size="small"
                                                        placeholder="Reporter"
                                                        value={inlineReporter}
                                                        onChange={(val) => setInlineReporter(val)}
                                                        style={{ width: 140, fontSize: 11 }}
                                                        options={reporters.map((r) => ({
                                                            value: r.key,
                                                            label: r.label,
                                                        }))}
                                                    />
                                                )}
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<CloseOutlined style={{ color: "#626f86" }} />}
                                                    onClick={() => {
                                                        setAddingCardCol(null);
                                                        setNewCardTitle("");
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Column Footer: + Add a card (Screenshot 2) */}
                                {!isComposing && (
                                    <div
                                        className="trello-add-card-btn"
                                        onClick={() => {
                                            setAddingCardCol(colProjectName);
                                            setNewCardTitle("");
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <PlusOutlined style={{ fontSize: 12 }} />
                                            <span>Add a card</span>
                                        </div>
                                        <span style={{ fontSize: 14, opacity: 0.6 }}>📋</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Column: + Add another project */}
                    <div
                        style={{
                            width: 260,
                            minWidth: 260,
                            borderRadius: 12,
                            background: isAddingProject ? "#f1f2f4" : "rgba(255, 255, 255, 0.6)",
                            border: "1px dashed #cbd5e1",
                            padding: isAddingProject ? "12px" : "8px 12px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                        }}
                    >
                        {isAddingProject ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <Input
                                    autoFocus
                                    placeholder="Enter project name..."
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    onPressEnter={() => {
                                        if (newProjectName.trim()) {
                                            setDeptProjects((prev) => [...prev, newProjectName.trim()]);
                                            setAddingCardCol(newProjectName.trim());
                                            setNewProjectName("");
                                            setIsAddingProject(false);
                                        }
                                    }}
                                    style={{ borderRadius: 6 }}
                                />
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <Button
                                        type="primary"
                                        size="small"
                                        onClick={() => {
                                            if (newProjectName.trim()) {
                                                setDeptProjects((prev) => [...prev, newProjectName.trim()]);
                                                setAddingCardCol(newProjectName.trim());
                                                setNewProjectName("");
                                                setIsAddingProject(false);
                                            }
                                        }}
                                        style={{ background: "#D14E9A", borderColor: "#D14E9A", borderRadius: 6, fontWeight: 600 }}
                                    >
                                        Add Project
                                    </Button>
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<CloseOutlined />}
                                        onClick={() => {
                                            setIsAddingProject(false);
                                            setNewProjectName("");
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <Button
                                type="text"
                                icon={<PlusOutlined />}
                                onClick={() => setIsAddingProject(true)}
                                style={{
                                    height: 38,
                                    fontWeight: 600,
                                    color: "#44546f",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-start",
                                    padding: 0,
                                }}
                            >
                                Add another project
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ background: "#fff", padding: "60px 20px", borderRadius: 12, textAlign: "center", border: "1px dashed #dfe1e6" }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                    <h3 style={{ fontSize: 18, fontWeight: 600 }}>{activeTab.toUpperCase()} View</h3>
                    <Button type="primary" style={{ background: "#D14E9A", borderColor: "#D14E9A", borderRadius: 6 }} onClick={() => setActiveTab("list")}>
                        Back to List
                    </Button>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
               JIRA ISSUE MODAL DIALOG (Screenshots 2, 3, 4 Clone)
               ══════════════════════════════════════════════════════════════════ */}
            <Modal
                open={issueModalOpen}
                onCancel={() => setIssueModalOpen(false)}
                footer={null}
                width={1000}
                style={{ top: 30 }}
                styles={{ body: { padding: "18px 24px" } }}
                closable={false}
            >
                {selectedTask && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {/* Top Dialog Bar */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ color: "#7c3aed", fontSize: 15 }}>⚡</span>
                                <span style={{ color: "#0c66e4", fontWeight: 700, fontSize: 14 }}>
                                    {selectedTask.sub_task_id || selectedTask.task_id}
                                </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <CloseOutlined style={{ cursor: "pointer", color: "#8590a2", fontSize: 16 }} onClick={() => setIssueModalOpen(false)} />
                            </div>
                        </div>

                        {/* Title and Action Buttons Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                {editingTitle ? (
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <Input
                                            value={taskTitleValue}
                                            onChange={(e) => setTaskTitleValue(e.target.value)}
                                            onPressEnter={() => {
                                                handleUpdateTaskField(selectedTask.id, { task_name: taskTitleValue });
                                                setEditingTitle(false);
                                            }}
                                            style={{ fontSize: 20, fontWeight: 700, borderRadius: 6 }}
                                        />
                                        <Button
                                            type="primary"
                                            onClick={() => {
                                                handleUpdateTaskField(selectedTask.id, { task_name: taskTitleValue });
                                                setEditingTitle(false);
                                            }}
                                        >
                                            Save
                                        </Button>
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ width: 18, height: 18, borderRadius: 4, background: "#9333ea", display: "inline-block" }} />
                                        <h2
                                            style={{
                                                fontSize: 22,
                                                fontWeight: 700,
                                                margin: 0,
                                                color: "#172b4d",
                                                cursor: canEditTask(selectedTask) ? "pointer" : "default",
                                            }}
                                            onClick={() => {
                                                if (canEditTask(selectedTask)) setEditingTitle(true);
                                            }}
                                            title={canEditTask(selectedTask) ? "Click to edit task title" : undefined}
                                        >
                                            {selectedTask.task_name}{" "}
                                            {canEditTask(selectedTask) && <EditOutlined style={{ fontSize: 14, color: "#94a3b8" }} />}
                                        </h2>
                                    </div>
                                )}
                            </div>

                            {/* Top Right Controls: Status Pill + Timer Action */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Dropdown menu={{ items: getStatusMenuItems(selectedTask) }} trigger={["click"]}>
                                    <button
                                        style={{
                                            background: normalizeStatus(selectedTask.task_status).bg,
                                            color: normalizeStatus(selectedTask.task_status).text,
                                            border: `1px solid ${normalizeStatus(selectedTask.task_status).border}`,
                                            padding: "5px 12px",
                                            borderRadius: 6,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 6,
                                        }}
                                    >
                                        <span>{normalizeStatus(selectedTask.task_status).label}</span>
                                        <DownOutlined style={{ fontSize: 10 }} />
                                    </button>
                                </Dropdown>

                                {isTaskMine(selectedTask) && (
                                    selectedTask.task_status === "not_started" ? (
                                        <Button
                                            type="primary"
                                            icon={<PlayCircleOutlined />}
                                            onClick={() => handleStartTimer(selectedTask)}
                                            style={{ background: "#16a34a", borderColor: "#16a34a", borderRadius: 6 }}
                                        >
                                            Start Timer
                                        </Button>
                                    ) : selectedTask.task_status === "in_progress" ? (
                                        <Button
                                            icon={<PauseCircleOutlined />}
                                            onClick={() => {
                                                setPauseTarget(selectedTask);
                                                setPauseModalOpen(true);
                                            }}
                                            style={{ borderRadius: 6, color: "#b45309", borderColor: "#f59e0b" }}
                                        >
                                            Pause
                                        </Button>
                                    ) : (
                                        <Button
                                            type="primary"
                                            icon={<PlayCircleOutlined />}
                                            onClick={() => handleResumeTimer(selectedTask)}
                                            style={{ background: "#16a34a", borderColor: "#16a34a", borderRadius: 6 }}
                                        >
                                            Resume
                                        </Button>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Two-Column Dialog Body (Screenshots 2, 3, 4) */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, marginTop: 10 }}>
                            {/* LEFT COLUMN: Description, Attachments, Subtasks, Activity */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                {/* 1. DESCRIPTION SECTION */}
                                <div>
                                    <div className="jira-dialog-section-header">
                                        <DownOutlined style={{ fontSize: 10 }} />
                                        <span>Description</span>
                                    </div>
                                    {editingDesc ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                            <Input.TextArea
                                                rows={4}
                                                value={taskDescValue}
                                                onChange={(e) => setTaskDescValue(e.target.value)}
                                                placeholder="Add a more detailed description..."
                                                style={{ borderRadius: 6 }}
                                            />
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    onClick={() => {
                                                        handleUpdateTaskField(selectedTask.id, { task_details: taskDescValue });
                                                        setEditingDesc(false);
                                                    }}
                                                >
                                                    Save
                                                </Button>
                                                <Button size="small" onClick={() => setEditingDesc(false)}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => {
                                                if (canEditTask(selectedTask)) setEditingDesc(true);
                                            }}
                                            style={{
                                                background: "#f8fafc",
                                                padding: "10px 14px",
                                                borderRadius: 8,
                                                border: "1px solid #e2e8f0",
                                                fontSize: 13.5,
                                                color: taskDescValue ? "#1e293b" : "#94a3b8",
                                                cursor: canEditTask(selectedTask) ? "pointer" : "default",
                                                minHeight: 50,
                                            }}
                                            title={canEditTask(selectedTask) ? "Click to edit description" : undefined}
                                        >
                                            {taskDescValue || (canEditTask(selectedTask) ? "Add a description... (click to edit)" : "No description provided.")}
                                        </div>
                                    )}
                                </div>

                                {/* 2. ATTACHMENTS SECTION */}
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                        <div className="jira-dialog-section-header" style={{ margin: 0 }}>
                                            <DownOutlined style={{ fontSize: 10 }} />
                                            <span>Attachments</span>
                                            <span style={{ background: "#f1f2f4", padding: "1px 8px", borderRadius: 10, fontSize: 11 }}>
                                                {(selectedTask.attachments || []).length}
                                            </span>
                                        </div>
                                        {canEditTask(selectedTask) && (
                                            <Upload
                                                showUploadList={false}
                                                accept=".png,.jpg,.jpeg,.gif,.webp,.svg,.bmp,.pdf,.docx,.doc,.ppt,.pptx,.xls,.xlsx,.csv,.txt"
                                                beforeUpload={(file) => {
                                                    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
                                                    const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", ".m4v", ".3gp"];
                                                    if (videoExts.includes(ext)) {
                                                        message.error("Video files are not allowed. Only images, docx, ppt, pdf, and excel files are supported.");
                                                        return Upload.LIST_IGNORE;
                                                    }
                                                    return true;
                                                }}
                                                customRequest={async ({ file, onSuccess, onError }) => {
                                                    const formData = new FormData();
                                                    formData.append("attachments", file as any);
                                                    try {
                                                        const res = await fetch(`${BASE_URL}/api/tasks/${selectedTask.id}/attachments/`, {
                                                            method: "POST",
                                                            headers: { ...authHeaders() },
                                                            body: formData,
                                                        });
                                                        if (res.ok) {
                                                            const atts = await res.json();
                                                            setSelectedTask({ ...selectedTask, attachments: atts });
                                                            message.success("Attachment uploaded successfully");
                                                            onSuccess?.("ok");
                                                            fetchTasks();
                                                        } else {
                                                            const err = await res.json().catch(() => ({}));
                                                            message.error(err.detail || "Failed to upload attachment");
                                                            onError?.(new Error("upload failed"));
                                                        }
                                                    } catch {
                                                        message.error("Network error uploading attachment");
                                                        onError?.(new Error("upload failed"));
                                                    }
                                                }}
                                            >
                                                <Button size="small" icon={<UploadOutlined />} style={{ borderRadius: 6, fontSize: 12 }}>
                                                    Add Attachment
                                                </Button>
                                            </Upload>
                                        )}
                                    </div>

                                    {/* Attachments List Table */}
                                    <div style={{ background: "#fff", border: "1px solid #dfe1e6", borderRadius: 8, overflow: "hidden" }}>
                                        <div style={{ display: "flex", gap: 8, padding: "8px 12px", background: "#f8fafc", borderBottom: "1px solid #dfe1e6" }}>
                                            {(["All", "Images", "Documents"] as const).map((cat) => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setAttachmentCategory(cat)}
                                                    style={{
                                                        background: attachmentCategory === cat ? "#eff6ff" : "transparent",
                                                        border: attachmentCategory === cat ? "1px solid #bfdbfe" : "none",
                                                        color: attachmentCategory === cat ? "#1d4ed8" : "#64748b",
                                                        borderRadius: 12,
                                                        padding: "2px 10px",
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>

                                        <div style={{ padding: "8px 12px" }}>
                                            {(() => {
                                                const isImageFile = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name);
                                                const isDocFile = (name: string) => /\.(pdf|docx|doc|ppt|pptx|xls|xlsx|csv|txt)$/i.test(name);
                                                const allAtts = selectedTask.attachments || [];
                                                const filteredAtts = allAtts.filter((att) => {
                                                    const fname = att.name || att.file || "";
                                                    if (attachmentCategory === "Images") return isImageFile(fname);
                                                    if (attachmentCategory === "Documents") return isDocFile(fname);
                                                    return true;
                                                });

                                                if (filteredAtts.length === 0) {
                                                    return (
                                                        <div style={{ color: "#94a3b8", fontSize: 12, padding: "10px 0", textAlign: "center" }}>
                                                            No {attachmentCategory === "All" ? "" : attachmentCategory.toLowerCase()} attachments yet.
                                                        </div>
                                                    );
                                                }

                                                return filteredAtts.map((att) => (
                                                    <div
                                                        key={att.id}
                                                        style={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            alignItems: "center",
                                                            padding: "8px 0",
                                                            borderBottom: "1px solid #f1f5f9",
                                                        }}
                                                    >
                                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                            <PaperClipOutlined style={{ color: "#0c66e4", fontSize: 16 }} />
                                                            <a href={att.file} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 500, color: "#0c66e4" }}>
                                                                {att.name || "Attachment"}
                                                            </a>
                                                        </div>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#64748b", fontSize: 12 }}>
                                                            <span>{att.uploaded_at ? dayjs(att.uploaded_at).format("MMM DD, YYYY") : "Today"}</span>
                                                            <span>{att.size ? `${Math.round(att.size / 1024)} KB` : "File"}</span>
                                                            <a
                                                                href={att.file}
                                                                download={att.name || "download"}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                style={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: 4,
                                                                    color: "#0c66e4",
                                                                    fontWeight: 600,
                                                                    fontSize: 11.5,
                                                                    background: "#f0f7ff",
                                                                    padding: "3px 8px",
                                                                    borderRadius: 6,
                                                                    textDecoration: "none",
                                                                }}
                                                            >
                                                                <DownloadOutlined /> Download
                                                            </a>
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* 4. ACTIVITY & COMMENTS SECTION (Screenshot 4 clone) */}
                                <div>
                                    <div className="jira-dialog-section-header">
                                        <span>Activity</span>
                                    </div>
                                    <div style={{ display: "flex", gap: 6, borderBottom: "1px solid #dfe1e6", marginBottom: 14 }}>
                                        {(["all", "comments", "history", "worklog"] as const).map((tab) => (
                                            <button
                                                key={tab}
                                                className={`jira-dialog-tab ${activityTab === tab ? "active" : ""}`}
                                                onClick={() => setActivityTab(tab)}
                                            >
                                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Add a Comment Input Box */}
                                    <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                                        <div
                                            style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: "50%",
                                                background: "#0052cc",
                                                color: "#fff",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: 11,
                                                fontWeight: 700,
                                                flexShrink: 0,
                                            }}
                                        >
                                            UK
                                        </div>
                                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                                            <Input.TextArea
                                                rows={2}
                                                placeholder="Add a comment..."
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                style={{ borderRadius: 8 }}
                                            />
                                            {/* Quick comment suggestion chips (Screenshot 4 clone) */}
                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                                {["Status update...", "Thanks...", "Agree..."].map((chip) => (
                                                    <button
                                                        key={chip}
                                                        onClick={() => setCommentText(chip.replace("...", ""))}
                                                        style={{
                                                            background: "#f1f2f4",
                                                            border: "none",
                                                            borderRadius: 12,
                                                            padding: "3px 10px",
                                                            fontSize: 11,
                                                            color: "#44546f",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        {chip}
                                                    </button>
                                                ))}
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    onClick={handleAddComment}
                                                    disabled={!commentText.trim()}
                                                    style={{ marginLeft: "auto", background: "#D14E9A", borderColor: "#D14E9A", borderRadius: 6 }}
                                                >
                                                    Save
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Comments & Activity Timeline */}
                                    {commentsLoading ? (
                                        <Spin size="small" />
                                    ) : commentsList.length > 0 ? (
                                        commentsList.map((comm) => (
                                            <div key={comm.id} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                                                <div
                                                    style={{
                                                        width: 26,
                                                        height: 26,
                                                        borderRadius: "50%",
                                                        background: getAvatarColor(comm.actor).bg,
                                                        color: "#fff",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {getInitials(comm.actor)}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                                                        {comm.actor}{" "}
                                                        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>
                                                            {dayjs(comm.created_at).format("MMM DD, YYYY h:mm A")}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: 13, color: "#334155", marginTop: 2 }}>{comm.text}</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ color: "#94a3b8", fontSize: 12, fontStyle: "italic" }}>
                                            No comments yet. Add one above!
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT SIDEBAR: DETAILS (Screenshots 2, 3, 4 Clone) */}
                            <div
                                style={{
                                    borderLeft: "1px solid #f1f5f9",
                                    paddingLeft: 20,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 16,
                                }}
                            >
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#626f86", display: "flex", justifyContent: "space-between" }}>
                                    <span>Details</span>
                                    <SettingOutlined />
                                </div>

                                {/* Assignee Dropdown */}
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Assignee</div>
                                    <Select
                                        value={selectedTask.assigned_to || undefined}
                                        placeholder="Unassigned"
                                        allowClear
                                        onChange={(val) => handleReassign(selectedTask, val || null)}
                                        style={{ width: "100%" }}
                                        options={[
                                            { value: 0, label: "👤 Unassigned" },
                                            ...employees.map((e) => ({
                                                value: e.id,
                                                label: `${getInitials(e.name)} ${e.name}`,
                                            })),
                                        ]}
                                    />
                                </div>



                                {/* Due Date */}
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Due date</div>
                                    <DatePicker
                                        value={selectedTask.due_date ? dayjs(selectedTask.due_date) : null}
                                        onChange={(_d, ds) =>
                                            handleUpdateTaskField(selectedTask.id, {
                                                due_date: typeof ds === "string" ? ds : null,
                                            })
                                        }
                                        style={{ width: "100%", borderRadius: 6 }}
                                    />
                                </div>

                                {/* Priority */}
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Priority</div>
                                    <Select
                                        value={selectedTask.priority}
                                        onChange={(val) => handleUpdateTaskField(selectedTask.id, { priority: val })}
                                        style={{ width: "100%" }}
                                        options={[
                                            { value: "critical", label: "Highest" },
                                            { value: "high", label: "High" },
                                            { value: "medium", label: "Medium" },
                                            { value: "low", label: "Low" },
                                        ]}
                                    />
                                </div>

                                {/* Reporter */}
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Reporter</div>
                                    {canEditTask(selectedTask) && reporters.length > 0 ? (
                                        <Select
                                            value={
                                                selectedTask.reporter_key ||
                                                (selectedTask.assigned_by_admin
                                                    ? `admin_${selectedTask.assigned_by_admin}`
                                                    : reporters.find((r) => r.name?.toLowerCase() === (selectedTask.assigned_by_name || "").toLowerCase())?.key)
                                            }
                                            onChange={(val) => {
                                                const repObj = reporters.find((r) => r.key === val);
                                                handleUpdateTaskField(selectedTask.id, {
                                                    reporter: val,
                                                    assigned_by_name: repObj ? repObj.name : selectedTask.assigned_by_name,
                                                    reporter_key: val,
                                                });
                                            }}
                                            placeholder="Select reporter"
                                            style={{ width: "100%" }}
                                            options={reporters.map((r) => ({
                                                value: r.key,
                                                label: r.label,
                                            }))}
                                        />
                                    ) : (
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <div
                                                style={{
                                                    width: 22,
                                                    height: 22,
                                                    borderRadius: "50%",
                                                    background: "#0052cc",
                                                    color: "#fff",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {getInitials(selectedTask.assigned_by_name || "Admin")}
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 500 }}>
                                                {selectedTask.assigned_by_name || "Admin"}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Time Tracking */}
                                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>
                                        Time Tracking
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                                        <span>Logged: <b>{selectedTask.total_time_taken || "0.0"}h</b></span>
                                        <span>Allotted: <b>{selectedTask.allotted_time || "1.0"}h</b></span>
                                    </div>
                                    <Progress
                                        percent={
                                            selectedTask.allotted_time
                                                ? Math.min(
                                                      100,
                                                      Math.round(
                                                          (Number(selectedTask.total_time_taken || 0) /
                                                              Number(selectedTask.allotted_time)) *
                                                              100
                                                      )
                                                  )
                                                : 0
                                        }
                                        size={["100%", 6]}
                                        strokeColor="#0c66e4"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── PAUSE MODAL (Task Pause Concept) ── */}
            <Modal
                title={
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <PauseCircleOutlined style={{ color: "#d97706" }} />
                        <span>Pause Task: {pauseTarget?.sub_task_id || pauseTarget?.task_id}</span>
                    </div>
                }
                open={pauseModalOpen}
                onCancel={() => setPauseModalOpen(false)}
                onOk={handleConfirmPause}
                okText="Confirm Pause"
                okButtonProps={{ style: { background: "#d97706" } }}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 10 }}>
                    <p style={{ color: "#64748b", margin: 0 }}>
                        Select the break reason or custom pause duration. The timer will stop until resumed.
                    </p>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Pause Type</div>
                        <Select
                            value={pauseType}
                            onChange={(val) => setPauseType(val)}
                            style={{ width: "100%" }}
                            options={[
                                { value: "break", label: "Break" },
                                { value: "another_reason", label: "Another Reason" },
                            ]}
                        />
                    </div>
                    {pauseType === "break" ? (
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Break Option</div>
                            <Select
                                value={pauseOption}
                                onChange={(val) => setPauseOption(val)}
                                style={{ width: "100%" }}
                                options={[
                                    { value: "15_mins", label: "☕ 15 Mins Refreshment Break" },
                                    { value: "30_mins", label: "🍽️ 30 Mins Lunch Break" },
                                ]}
                            />
                        </div>
                    ) : (
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Reason</div>
                            <Input
                                placeholder="State reason for pause..."
                                value={pauseReason}
                                onChange={(e) => setPauseReason(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </Modal>

            {/* ── SUBMIT MODAL (Task Submit Concept) ── */}
            <Modal
                title={
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <CheckCircleOutlined style={{ color: "#16a34a" }} />
                        <span>Submit Deliverable: {submitTarget?.sub_task_id || submitTarget?.task_id}</span>
                    </div>
                }
                open={submitModalOpen}
                onCancel={() => setSubmitModalOpen(false)}
                onOk={handleConfirmSubmit}
                okText="Submit Task"
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 10 }}>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                            Task Sheet / PR Link <span style={{ color: "#94a3b8", fontWeight: 400 }}>(Optional)</span>
                        </div>
                        <Input
                            placeholder="Optional: https://github.com/... or Google Drive link"
                            value={submitSheetLink}
                            onChange={(e) => setSubmitSheetLink(e.target.value)}
                            allowClear
                        />
                    </div>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                            Remarks <span style={{ color: "#94a3b8", fontWeight: 400 }}>(Optional)</span>
                        </div>
                        <Input.TextArea
                            rows={3}
                            placeholder="Optional: Add submission notes..."
                            value={submitRemarks}
                            onChange={(e) => setSubmitRemarks(e.target.value)}
                        />
                    </div>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                            Screenshots / Attachments <span style={{ color: "#94a3b8", fontWeight: 400 }}>(Optional - Images, Screenshots, PPT, DOCX, Excel, PDF)</span>
                        </div>
                        <Upload
                            multiple
                            accept=".png,.jpg,.jpeg,.gif,.webp,.svg,.bmp,.pdf,.docx,.doc,.ppt,.pptx,.xls,.xlsx,.csv,.txt"
                            beforeUpload={(file) => {
                                const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
                                const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", ".m4v", ".3gp"];
                                if (videoExts.includes(ext)) {
                                    message.error("Video files are not allowed. Only screenshots, docx, ppt, pdf, and excel files are supported.");
                                    return Upload.LIST_IGNORE;
                                }
                                return false;
                            }}
                            fileList={submitFiles}
                            onChange={({ fileList }) => {
                                const valid = fileList.filter((f) => {
                                    const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
                                    return ![".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", ".m4v", ".3gp"].includes(ext);
                                });
                                setSubmitFiles(valid);
                            }}
                        >
                            <Button icon={<UploadOutlined />}>Upload Screenshots / Files</Button>
                        </Upload>
                    </div>
                </div>
            </Modal>

            {/* ── ASK AI COPILOT MODAL ── */}
            <Modal
                title={
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>✨</span>
                        <span style={{ fontWeight: 700, color: "#4338ca" }}>Jira AI Copilot</span>
                    </div>
                }
                open={aiModalOpen}
                onCancel={() => setAiModalOpen(false)}
                footer={null}
                width={500}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 6 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {["Summarize project status", "Identify high priority items", "Check blockers"].map((prompt) => (
                            <button
                                key={prompt}
                                onClick={() => {
                                    setAiQuestion(prompt);
                                    handleAskAI(prompt);
                                }}
                                style={{
                                    background: "#f0f7ff",
                                    border: "1px solid #bfdbfe",
                                    color: "#1d4ed8",
                                    borderRadius: 14,
                                    padding: "3px 10px",
                                    fontSize: 12,
                                    cursor: "pointer",
                                }}
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>

                    <div style={{ minHeight: 120, background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        {aiThinking ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6366f1" }}>
                                <Spin size="small" /> Analyzing work items...
                            </div>
                        ) : aiResponse ? (
                            <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-line" }}>{aiResponse}</div>
                        ) : (
                            <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "20px 0" }}>
                                Ask AI about velocity, team distribution, or status breakdown.
                            </div>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                        <Input
                            placeholder="Ask about this project..."
                            value={aiQuestion}
                            onChange={(e) => setAiQuestion(e.target.value)}
                            onPressEnter={() => handleAskAI()}
                        />
                        <Button type="primary" onClick={() => handleAskAI()} style={{ background: "#4338ca" }}>
                            Ask
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
