import { Fragment, useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../AuthContext";
import PauseTaskModal from "../employee/tasks/PauseTaskModal";
import {
    Input,
    Button,
    Spin,
    Dropdown,
    Tooltip,
    Modal,
    Select,
    DatePicker,
    TimePicker,
    InputNumber,
    Form,
    Checkbox,
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
    LayoutOutlined,
    MoreOutlined,
    CheckOutlined,
    DownOutlined,
    RightOutlined,
    GlobalOutlined,
    ProfileOutlined,
    AppstoreOutlined,
    LineChartOutlined,
    FileTextOutlined,
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
    EyeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip as ChartTooltip,
    XAxis,
    YAxis,
} from "recharts";

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

const getAttachmentUrl = (url?: string) => {
    if (!url) return "#";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

// ── Interfaces ──────────────────────────────────────────────────────────────
export interface TaskAttachmentItem {
    id: number;
    file: string;
    name?: string;
    size?: number;
    uploaded_at?: string;
    uploaded_by?: number | null;
    uploaded_by_admin?: number | null;
    is_creation_attachment?: boolean;
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
    assigned_to_admin?: number | null;
    assigned_to_name: string | null;
    assigned_by_name: string | null;
    assigned_by_admin?: number | null;
    assigned_by_employee?: number | null;
    created_by_admin?: number | null;
    created_by_employee?: number | null;
    reporter_key?: string | null;
    priority: "low" | "medium" | "high" | "critical" | string;
    task_status: string;
    task_sheet_link?: string;
    employee_remarks?: string;
    quality_of_task?: string;
    rating?: number | null;
    admin_remarks?: string;
    reviewed_date?: string | null;
    start_date?: string | null;
    assigned_date?: string | null;
    due_date?: string | null;
    due_time?: string | null;
    allotted_time?: string | number | null;
    total_time_taken?: string | number;
    remaining_or_over_time?: string | number;
    recurring_source?: number | null;
    rework_count?: number;
    is_recurring?: boolean;
    attachments?: TaskAttachmentItem[];
}

export interface EmployeeOption {
    id: number;
    name: string;
    department: string;
}

interface RecurringDefinition {
    id: number;
    task_name: string;
    project_name: string;
    task_details: string;
    assigned_to: number | null;
    assigned_to_admin: number | null;
    assigned_to_name: string | null;
    priority: string;
    allotted_time: number;
    start_date: string;
    end_date: string | null;
    weekdays: number[];
    excluded_dates: string[];
    is_active: boolean;
}

const WEEKDAY_OPTIONS = [
    { value: 0, label: "Mon" }, { value: 1, label: "Tue" }, { value: 2, label: "Wed" },
    { value: 3, label: "Thu" }, { value: 4, label: "Fri" }, { value: 5, label: "Sat" }, { value: 6, label: "Sun" },
];

function formatDuration(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === "") return "—";
    const totalMinutes = Math.round(Number(value) * 60);
    if (!Number.isFinite(totalMinutes)) return "—";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours && minutes) return `${hours}h ${minutes}m`;
    if (hours) return `${hours}h`;
    return `${minutes}m`;
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
    initialTab?: "trello" | "list" | "submitted" | "review" | "completed" | "board" | "summary" | "timeline" | "calendar" | "backlog";
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
    return (parts[0]?.[0] || "?").toUpperCase();
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

const REVIEW_QUALITY_OPTIONS = [
    { value: "excellent", label: "Excellent", rating: 5 },
    { value: "good", label: "Good", rating: 4 },
    { value: "needs_improvement", label: "Satisfactory", rating: 3 },
    { value: "rework_needed", label: "Below Expectations", rating: 2 },
    { value: "rejected", label: "Unsatisfactory", rating: 1 },
];

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
        return !!myId && task.created_by_employee === myId;
    };

    const [attachmentCategory, setAttachmentCategory] = useState<"All" | "Images" | "Documents">("All");

    const [tasks, setTasks] = useState<JiraTask[]>([]);
    const [activeTimerTaskId, setActiveTimerTaskId] = useState<number | null>(null);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const activeTabStorageKey = `jira-active-tab:${mode || "all"}:${department.name}:${project.project_name || "general"}`;
    const [activeTab, setActiveTab] = useState<"trello" | "list" | "submitted" | "review" | "completed" | "board" | "summary" | "timeline" | "calendar" | "backlog">(() => {
        const tabs = ["trello", "list", "submitted", "review", "completed", "board", "summary", "timeline", "calendar", "backlog"];
        try {
            const savedTab = sessionStorage.getItem(activeTabStorageKey);
            if (savedTab && tabs.includes(savedTab)) return savedTab as "trello" | "list" | "submitted" | "review" | "completed" | "board" | "summary" | "timeline" | "calendar" | "backlog";
        } catch { /* Use the route default if session storage is unavailable. */ }
        return initialTab || (mode === "normal" ? "trello" : "list");
    });
    useEffect(() => {
        try { sessionStorage.setItem(activeTabStorageKey, activeTab); }
        catch { /* Keep the workspace usable if session storage is unavailable. */ }
    }, [activeTabStorageKey, activeTab]);
    const isAdminUser = user?.role ? user.role === "admin" : userRole === "admin";
    const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
    const [filterPriority, setFilterPriority] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [dueSortDirection, setDueSortDirection] = useState<"asc" | "desc">("asc");
    const [adminSortBy, setAdminSortBy] = useState<"created" | "due" | "days">("created");
    const [summaryAssignee, setSummaryAssignee] = useState<number | null>(null);
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
    const [inlineStartDate, setInlineStartDate] = useState<string | null>(dayjs().format("YYYY-MM-DD"));
    const [inlineDueTime, setInlineDueTime] = useState<string | null>(null);
    const [inlineAllottedHours, setInlineAllottedHours] = useState<number>(0);
    const [inlineAllottedMinutes, setInlineAllottedMinutes] = useState<number>(0);
    const [createLoading, setCreateLoading] = useState(false);
    const inlineInputRef = useRef<any>(null);

    // Full Create Task Modal state (Screenshots 2 & 3)
    const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
    const [createTaskLoading, setCreateTaskLoading] = useState(false);
    const [createTaskForm] = Form.useForm();
    const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(dayjs());
    const [recurringWeekdays, setRecurringWeekdays] = useState<number[]>([0, 1, 2, 3, 4, 5]);

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
    const [scheduleDefinition, setScheduleDefinition] = useState<RecurringDefinition | null>(null);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [scheduleSaving, setScheduleSaving] = useState(false);

    // Timer actions state
    const [timerBusyTaskId, setTimerBusyTaskId] = useState<number | null>(null);
    const [pauseModalOpen, setPauseModalOpen] = useState(false);
    const [pauseTarget, setPauseTarget] = useState<JiraTask | null>(null);

    const [submitModalOpen, setSubmitModalOpen] = useState(false);
    const [submitTarget, setSubmitTarget] = useState<JiraTask | null>(null);
    const [submitSheetLink, setSubmitSheetLink] = useState("");
    const [submitRemarks, setSubmitRemarks] = useState("");
    const [submitFiles, setSubmitFiles] = useState<any[]>([]);
    const [existingSubmitAttachments, setExistingSubmitAttachments] = useState<TaskAttachmentItem[]>([]);
    const [deletedSubmitAttachmentIds, setDeletedSubmitAttachmentIds] = useState<number[]>([]);

    const [reviewTarget, setReviewTarget] = useState<JiraTask | null>(null);
    const [approveReviewOpen, setApproveReviewOpen] = useState(false);
    const [approveReviewForm] = Form.useForm();
    const [approveReviewLoading, setApproveReviewLoading] = useState(false);
    const [reworkReviewOpen, setReworkReviewOpen] = useState(false);
    const [reworkReviewForm] = Form.useForm();
    const [reworkReviewLoading, setReworkReviewLoading] = useState(false);
    const [reviewBusyTaskId, setReviewBusyTaskId] = useState<number | null>(null);
    const [previewAttachment, setPreviewAttachment] = useState<{
        url: string;
        name: string;
        mimeType: string;
        taskId: number;
        attachmentId: number;
        file: string;
    } | null>(null);

    // AI modal
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiQuestion, setAiQuestion] = useState("");
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [aiThinking, setAiThinking] = useState(false);

    // Multi-attachment upload & forced download
    const attachmentInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);

    const downloadAttachmentFile = async (fileUrl: string, fileName: string, attId?: number, taskId?: number) => {
        try {
            const attachmentTaskId = taskId ?? selectedTask?.id;
            const urlToFetch = attId && attachmentTaskId
                ? `${BASE_URL}/api/tasks/${attachmentTaskId}/attachments/${attId}/download/`
                : fileUrl;
            const res = await fetch(urlToFetch, { headers: { ...authHeaders() } });
            if (!res.ok) throw new Error("Fetch failed");
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = fileName || "attachment";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
        } catch {
            message.error("Could not download this attachment. Please try again.");
        }
    };

    const previewAttachmentFile = async (attId: number, taskId: number) => {
        try {
            const res = await fetch(`${BASE_URL}/api/tasks/${taskId}/attachments/${attId}/download/`, {
                headers: { ...authHeaders() },
            });
            if (!res.ok) throw new Error("Preview fetch failed");
            const blob = await res.blob();
            const attachment = (tasks.find((task) => task.id === taskId)?.attachments || []).find((item) => item.id === attId);
            if (previewAttachment?.url) window.URL.revokeObjectURL(previewAttachment.url);
            setPreviewAttachment({
                url: window.URL.createObjectURL(blob),
                name: attachment?.name || "Attachment",
                mimeType: blob.type,
                taskId,
                attachmentId: attId,
                file: attachment?.file || "",
            });
        } catch {
            message.error("Could not preview this attachment. You can download it instead.");
        }
    };

    const closeAttachmentPreview = () => {
        if (previewAttachment?.url) window.URL.revokeObjectURL(previewAttachment.url);
        setPreviewAttachment(null);
    };

    const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !selectedTask) return;

        const fileList = Array.from(files);
        const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", ".m4v", ".3gp"];
        const invalidVideos = fileList.filter((f) => {
            const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
            return videoExts.includes(ext);
        });

        if (invalidVideos.length > 0) {
            message.error("Video files are not allowed. Only images, docx, ppt, pdf, and excel files are supported.");
            if (attachmentInputRef.current) attachmentInputRef.current.value = "";
            return;
        }

        setUploadingAttachment(true);
        const formData = new FormData();
        fileList.forEach((file) => {
            formData.append("attachments", file, file.name);
        });

        try {
            const res = await fetch(`${BASE_URL}/api/tasks/${selectedTask.id}/attachments/`, {
                method: "POST",
                headers: { ...authHeaders() },
                body: formData,
            });

            if (res.ok) {
                const atts = await res.json();
                setSelectedTask({ ...selectedTask, attachments: atts });
                message.success(
                    fileList.length > 1
                        ? `${fileList.length} attachments uploaded successfully`
                        : "Attachment uploaded successfully"
                );
                fetchTasks();
            } else {
                const errText = await res.text();
                let errDetail = "";
                try {
                    const errJson = JSON.parse(errText);
                    errDetail = errJson.detail || errJson.message || "";
                } catch {
                    const match = errText.match(/<pre class="exception_value">([\s\S]*?)<\/pre>/i) || errText.match(/<title>([\s\S]*?)<\/title>/i);
                    if (match) {
                        errDetail = match[1].replace(/&#x27;/g, "'").replace(/<[^>]+>/g, "").trim();
                    } else {
                        errDetail = `Upload failed (${res.status} ${res.statusText})`;
                    }
                }
                message.error(errDetail || "Failed to upload attachments");
            }
        } catch {
            message.error("Network error uploading attachments");
        } finally {
            setUploadingAttachment(false);
            if (attachmentInputRef.current) attachmentInputRef.current.value = "";
        }
    };

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
            const bucket = activeTab === "review" ? "review" : activeTab === "submitted" ? "submitted" : activeTab === "completed" ? "completed" : activeTab === "backlog" ? "backlog" : activeTab === "list" ? "active" : "all";
            const bucketParam = `&bucket=${bucket}`;
            const projParam = project?.project_name ? `project_name=${encodeURIComponent(project.project_name)}&` : "";
            const url = `${BASE_URL}/api/tasks/project_tasks/?${projParam}department=${encodeURIComponent(
                department.name
            )}${modeParam}${bucketParam}`;
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
                        const isEmployee = userRole === "employee" || user?.role === "employee";
                        const matchAssignee = !isEmployee || (myId ? t.assigned_to === myId : t.assigned_to_name === user?.name);
                        const matchBucket = bucket === "all"
                            || (bucket === "active" && !["submitted", "under_review", "resubmitted", "completed", "cancelled"].includes(t.task_status))
                            || ((bucket === "submitted" || bucket === "review") && ["submitted", "under_review", "resubmitted"].includes(t.task_status))
                            || (bucket === "completed" && t.task_status === "completed")
                            || (bucket === "backlog" && t.assigned_to == null && t.assigned_to_admin == null);
                        return matchDept && matchProj && matchMode && matchAssignee && matchBucket;
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
    }, [project.project_name, department.name, mode, activeTab]);

    useEffect(() => {
        const fetchActiveTimer = async () => {
            try {
                const res = await fetch(`${BASE_URL}/api/tasks/my_active_session/`, { headers: authHeaders() });
                if (!res.ok) return;
                const data = await res.json();
                setActiveTimerTaskId(data?.active && data?.task ? Number(data.task) : null);
            } catch {
                // Timer controls remain protected by the backend if this request fails.
            }
        };
        fetchActiveTimer();
    }, []);

    useEffect(() => {
        fetchEmployees();
        fetchReporters();
    }, [department.name]);

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
        setScheduleDefinition(null);
        setEditingTitle(false);
        setEditingDesc(false);
        setIssueModalOpen(true);
        fetchComments(task.id);
        if (task.recurring_source && isAdminUser) {
            setScheduleLoading(true);
            fetch(`${BASE_URL}/api/tasks/recurring/${task.recurring_source}/`, { headers: authHeaders() })
                .then(async (response) => {
                    if (!response.ok) throw new Error("Could not load recurring schedule");
                    setScheduleDefinition(await response.json());
                })
                .catch(() => message.error("Could not load recurring schedule"))
                .finally(() => setScheduleLoading(false));
        }
    };

    const updateRecurringSchedule = async (patch: Record<string, unknown>) => {
        if (!scheduleDefinition) return;
        setScheduleSaving(true);
        try {
            const response = await fetch(`${BASE_URL}/api/tasks/recurring/${scheduleDefinition.id}/`, {
                method: "PATCH",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(patch),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.detail || "Failed to update recurring schedule");
            setScheduleDefinition(result);
            fetchTasks();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "Failed to update recurring schedule");
        } finally {
            setScheduleSaving(false);
        }
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
                setActiveTimerTaskId(task.id);
                setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
                if (activeTab === "backlog" && (updated.assigned_to != null || updated.assigned_to_admin != null)) {
                    fetchTasks();
                }
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

    const handleResumeTimer = async (task: JiraTask) => {
        setTimerBusyTaskId(task.id);
        try {
            const res = await fetch(`${BASE_URL}/api/tasks/${task.id}/resume/`, {
                method: "POST",
                headers: { ...authHeaders() },
            });
            if (res.ok) {
                const updated = await res.json();
                setActiveTimerTaskId(task.id);
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

    const openSubmitModal = (task: JiraTask, resubmitting = false) => {
        setSubmitTarget(task);
        setSubmitSheetLink(resubmitting ? task.task_sheet_link || "" : "");
        setSubmitRemarks(resubmitting ? task.employee_remarks || "" : "");
        setSubmitFiles([]);
        setExistingSubmitAttachments(resubmitting ? task.attachments || [] : []);
        setDeletedSubmitAttachmentIds([]);
        setSubmitModalOpen(true);
    };

    const handleConfirmSubmit = async () => {
        if (!submitTarget) return;
        setTimerBusyTaskId(submitTarget.id);
        try {
            const formData = new FormData();
            formData.append("task_sheet_link", submitSheetLink.trim());
            formData.append("employee_remarks", submitRemarks.trim());
            formData.append("delete_attachment_ids", JSON.stringify(deletedSubmitAttachmentIds));
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
                setActiveTimerTaskId(null);
                message.success(`${["submitted", "under_review", "resubmitted"].includes(submitTarget.task_status) ? "Task resubmitted" : "Task submitted"} ${submitTarget.sub_task_id || submitTarget.task_id} for review!`);
                setSubmitModalOpen(false);
                setSubmitFiles([]);
                setExistingSubmitAttachments([]);
                setDeletedSubmitAttachmentIds([]);
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

    const prepareTaskForReview = async (task: JiraTask) => {
        if (task.task_status === "under_review") return true;
        if (!["submitted", "resubmitted"].includes(task.task_status)) {
            message.error("This task is no longer waiting for review.");
            return false;
        }
        setReviewBusyTaskId(task.id);
        try {
            const res = await fetch(`${BASE_URL}/api/tasks/${task.id}/review/start/`, {
                method: "POST",
                headers: { ...authHeaders() },
            });
            const updated = await res.json().catch(() => ({}));
            if (!res.ok) {
                message.error(updated.detail || "Could not start reviewing this task.");
                fetchTasks();
                return false;
            }
            setTasks((current) => current.map((item) => item.id === task.id ? updated : item));
            return true;
        } catch {
            message.error("Network error while starting the review.");
            return false;
        } finally {
            setReviewBusyTaskId(null);
        }
    };

    const openApproveReview = async (task: JiraTask) => {
        if (!(await prepareTaskForReview(task))) return;
        approveReviewForm.resetFields();
        setReviewTarget(task);
        setApproveReviewOpen(true);
    };

    const openReworkReview = async (task: JiraTask) => {
        if (!(await prepareTaskForReview(task))) return;
        reworkReviewForm.resetFields();
        setReviewTarget(task);
        setReworkReviewOpen(true);
    };

    const handleApproveReviewedTask = async () => {
        if (!reviewTarget) return;
        let values: any;
        try {
            values = await approveReviewForm.validateFields();
        } catch {
            return;
        }
        const rating = REVIEW_QUALITY_OPTIONS.find((option) => option.value === values.quality_of_task)?.rating ?? 1;
        setApproveReviewLoading(true);
        try {
            const res = await fetch(`${BASE_URL}/api/tasks/${reviewTarget.id}/review/approve/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({
                    quality_of_task: values.quality_of_task,
                    rating,
                    admin_remarks: values.admin_remarks || "",
                }),
            });
            const responseData = await res.json().catch(() => ({}));
            if (!res.ok) {
                message.error(responseData.detail || "Failed to approve task.");
                return;
            }
            message.success("Task approved and marked completed.");
            setApproveReviewOpen(false);
            setReviewTarget(null);
            fetchTasks();
        } catch {
            message.error("Network error while approving task.");
        } finally {
            setApproveReviewLoading(false);
        }
    };

    const handleRequestTaskRework = async () => {
        if (!reviewTarget) return;
        let values: any;
        try {
            values = await reworkReviewForm.validateFields();
        } catch {
            return;
        }
        setReworkReviewLoading(true);
        try {
            const res = await fetch(`${BASE_URL}/api/tasks/${reviewTarget.id}/review/rework/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ admin_remarks: values.admin_remarks }),
            });
            const responseData = await res.json().catch(() => ({}));
            if (!res.ok) {
                message.error(responseData.detail || "Failed to request rework.");
                return;
            }
            message.success("Task sent back for rework.");
            setReworkReviewOpen(false);
            setReviewTarget(null);
            fetchTasks();
        } catch {
            message.error("Network error while requesting rework.");
        } finally {
            setReworkReviewLoading(false);
        }
    };

    // Helper to calculate target due date and time from start date + duration (Screenshots 2 & 3)
    const handleDurationChange = (hVal?: number | null, mVal?: number | null, baseDate?: dayjs.Dayjs | null) => {
        const h = Number(hVal !== undefined ? hVal : (createTaskForm.getFieldValue("allotted_hours") ?? 0));
        const m = Number(mVal !== undefined ? mVal : (createTaskForm.getFieldValue("allotted_minutes") ?? 0));
        const totalMinutes = h * 60 + m;
        const start = baseDate || createTaskForm.getFieldValue("start_date") || startDate || dayjs();
        if (totalMinutes > 0 && start) {
            const target = start.add(totalMinutes, "minute");
            createTaskForm.setFieldsValue({
                due_date: target,
                due_time: target,
            });
        }
    };

    // Full Create Task Handler (Screenshots 2 & 3)
    const handleCreateTaskSubmit = async (values: any) => {
        const hours = Number(values.allotted_hours || 0);
        const minutes = Number(values.allotted_minutes || 0);
        const totalMinutes = hours * 60 + minutes;
        if (totalMinutes <= 0) {
            message.error("Please enter allotted time in hours or minutes.");
            return;
        }

        const isRecurring = mode === "recurring";
        if (isRecurring && recurringWeekdays.length === 0) {
            message.error("Select at least one repeat day.");
            return;
        }
        if (isRecurring && !values.recurring_start_date) {
            message.error("Please select a recurring start date.");
            return;
        }
        if (!isRecurring && !values.start_date) {
            message.error("Please select a start date.");
            return;
        }
        if (!isRecurring && !values.due_date) {
            message.error("Please select a due date.");
            return;
        }

        setCreateTaskLoading(true);
        try {
            const isEmployee = userRole === "employee" || user?.role === "employee";
            const assigneeVal = isEmployee ? myId : values.assigned_to;
            const payload: any = {
                task_name: values.task_name?.trim(),
                task_details: values.task_details?.trim() || "",
                project_name: values.project_name?.trim() || project?.project_name || "",
                department: department.name,
                priority: values.priority || "medium",
                allotted_hours: hours,
                allotted_minutes: minutes,
                allotted_time: Math.round((hours + minutes / 60.0) * 100) / 100,
                reporter: values.reporter || null,
            };

            const requestUrl = isRecurring
                ? `${BASE_URL}/api/tasks/recurring/create/`
                : `${BASE_URL}/api/tasks/quick_create/`;
            if (isRecurring) {
                payload.start_date = values.recurring_start_date.format("YYYY-MM-DD");
                payload.end_date = values.recurring_end_date ? values.recurring_end_date.format("YYYY-MM-DD") : null;
                payload.weekdays = recurringWeekdays;
            } else {
                payload.start_date = values.start_date.format("YYYY-MM-DD");
                payload.due_date = values.due_date.format("YYYY-MM-DD");
                payload.due_time = values.due_time ? (dayjs.isDayjs(values.due_time) ? values.due_time.format("HH:mm:ss") : values.due_time) : null;
            }

            if (assigneeVal) {
                if (typeof assigneeVal === "string" && assigneeVal.startsWith("admin_")) {
                    payload.assigned_to_admin = parseInt(assigneeVal.replace("admin_", ""), 10);
                } else {
                    payload.assigned_to = assigneeVal;
                }
            }

            const res = await fetch(requestUrl, {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const newTask = await res.json();
                message.success(isRecurring ? "Recurring task scheduled successfully!" : `Task ${newTask.sub_task_id || newTask.task_id} created successfully!`);
                setCreateTaskModalOpen(false);
                createTaskForm.resetFields();
                setRecurringWeekdays([0, 1, 2, 3, 4, 5]);
                setStartDate(dayjs());
                fetchTasks();
            } else {
                const errText = await res.text();
                let errDetail = "";
                try {
                    const errJson = JSON.parse(errText);
                    errDetail = errJson.detail || errJson.message || "";
                } catch {
                    errDetail = errText;
                }
                message.error(errDetail || "Failed to create task");
            }
        } catch (err) {
            console.error("Task creation failed:", err);
            message.error("Network error while creating task");
        } finally {
            setCreateTaskLoading(false);
        }
    };

    // Quick Inline Create
    const handleQuickCreate = async () => {
        const title = inlineTaskName.trim();
        if (!title) {
            message.warning("Please enter a task summary");
            return;
        }

        const totalMinutes = inlineAllottedHours * 60 + inlineAllottedMinutes;
        const allotted = totalMinutes > 0 ? Math.round((inlineAllottedHours + inlineAllottedMinutes / 60.0) * 100) / 100 : 1.0;

        setCreateLoading(true);
        try {
            const assigneeId = inlineAssignee || null;
            const isRecurring = mode === "recurring";
            const requestUrl = isRecurring
                ? `${BASE_URL}/api/tasks/recurring/create/`
                : `${BASE_URL}/api/tasks/quick_create/`;
            const payload: Record<string, unknown> = {
                task_name: title,
                task_details: "",
                project_name: project?.project_name || "",
                department: department.name,
                priority: inlinePriority,
                task_status: "not_started",
                assigned_to: assigneeId,
                start_date: inlineStartDate || dayjs().format("YYYY-MM-DD"),
                due_date: inlineDueDate || null,
                due_time: inlineDueTime || null,
                allotted_hours: inlineAllottedHours,
                allotted_minutes: inlineAllottedMinutes,
                allotted_time: allotted,
                reporter: inlineReporter || null,
            };
            if (isRecurring) {
                payload.weekdays = [0, 1, 2, 3, 4, 5];
                payload.end_date = null;
                delete payload.due_date;
                delete payload.due_time;
                delete payload.reporter;
            }

            const res = await fetch(requestUrl, {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const newTask = await res.json();
                if (isRecurring) {
                    message.success("Recurring task created. Open it to set its assignee and schedule.");
                    await fetchTasks();
                } else {
                    setTasks((prev) => [newTask, ...prev]);
                    message.success(`Task ${newTask.sub_task_id || newTask.task_id} created!`);
                }
                setInlineTaskName("");
                setIsCreatingInline(false);
                setInlineAssignee(undefined);
                setInlinePriority("medium");
                setInlineStartDate(dayjs().format("YYYY-MM-DD"));
                setInlineAllottedHours(0);
                setInlineAllottedMinutes(0);
                setInlineDueDate(null);
                setInlineDueTime(null);
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
    const taskGroupLabel = (task: JiraTask) => {
        if (groupBy === "status") return normalizeStatus(task.task_status).label;
        if (groupBy === "assignee") return task.assigned_to_name || "Unassigned";
        if (groupBy === "priority") return (task.priority || "No priority").replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
        return "";
    };

    const toggleTaskDateSort = (sortBy: "due" | "days") => {
        if (isAdminUser && adminSortBy !== sortBy) {
            setAdminSortBy(sortBy);
            setDueSortDirection("asc");
            return;
        }
        setDueSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => {
            if (activeTab === "backlog" && (task.assigned_to != null || task.assigned_to_admin != null)) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const searchable = [task.task_name, task.task_details, task.task_id, task.sub_task_id,
                    task.project_name, task.assigned_to_name, task.assigned_by_name, task.priority,
                    normalizeStatus(task.task_status).label, task.due_date, task.due_time];
                if (!searchable.some((field) => field?.toLowerCase().includes(q))) return false;
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
        }).sort((a, b) => {
            if (groupBy !== "none") {
                const groupCompare = taskGroupLabel(a).localeCompare(taskGroupLabel(b));
                if (groupCompare) return groupCompare;
            }
            if (isAdminUser && adminSortBy === "created") return b.id - a.id;
            if (!a.due_date && !b.due_date) return a.id - b.id;
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            const sortByDays = isAdminUser && adminSortBy === "days";
            const dueA = dayjs(`${a.due_date} ${sortByDays ? "00:00:00" : a.due_time || "23:59:59"}`).valueOf();
            const dueB = dayjs(`${b.due_date} ${sortByDays ? "00:00:00" : b.due_time || "23:59:59"}`).valueOf();
            return (dueA - dueB) * (dueSortDirection === "asc" ? 1 : -1) || a.id - b.id;
        });
    }, [tasks, searchQuery, filterAssignee, filterPriority, filterStatus, dueSortDirection, adminSortBy, groupBy, isAdminUser, activeTab]);

    const projectMembers = useMemo(() => {
        const set = new Set<string>();
        tasks.forEach((t) => {
            if (t.assigned_to_name) set.add(t.assigned_to_name);
        });
        (project.assignees || []).forEach((a) => set.add(a));
        employees.forEach((e) => set.add(e.name));
        return Array.from(set);
    }, [tasks, project.assignees, employees]);

    const summaryTasks = useMemo(() => {
        const isEmployee = userRole === "employee" || user?.role === "employee";
        if (isEmployee) {
            return tasks.filter((task) => (myId ? task.assigned_to === myId : task.assigned_to_name === user?.name));
        }
        return summaryAssignee === null
            ? tasks
            : tasks.filter((task) => task.assigned_to === summaryAssignee);
    }, [tasks, summaryAssignee, userRole, user?.role, user?.name, myId]);

    const summaryStatusData = useMemo(() => {
        const groups = [
            { name: "Completed", color: "#16A34A", statuses: ["completed"] },
            { name: "In Progress", color: "#D1479B", statuses: ["in_progress", "paused", "rework_needed"] },
            { name: "Under Review", color: "#8B5CF6", statuses: ["under_review"] },
            { name: "Submitted", color: "#F59E0B", statuses: ["submitted", "resubmitted"] },
            { name: "To Do", color: "#94A3B8", statuses: ["not_started", "on_hold"] },
        ];
        return groups.map((group) => ({
            name: group.name,
            value: summaryTasks.filter((task) => group.statuses.includes(task.task_status)).length,
            fill: group.color,
        }));
    }, [summaryTasks]);

    const summaryPriorityData = useMemo(() => {
        const priorities = [
            { name: "Critical", value: "critical", color: "#dc2626" },
            { name: "High", value: "high", color: "#f97316" },
            { name: "Medium", value: "medium", color: "#6366f1" },
            { name: "Low", value: "low", color: "#16a34a" },
        ];
        return priorities.map((priority) => ({
            name: priority.name,
            count: summaryTasks.filter((task) => task.priority.toLowerCase() === priority.value).length,
            fill: priority.color,
        }));
    }, [summaryTasks]);

    const summaryQualityData = useMemo(() => {
        const qualities = [
            { value: "excellent", name: "Excellent", color: "#16a34a" },
            { value: "good", name: "Good", color: "#0d9488" },
            { value: "needs_improvement", name: "Satisfactory", color: "#2563eb" },
            { value: "rework_needed", name: "Below Expectations", color: "#d97706" },
            { value: "rejected", name: "Unsatisfactory", color: "#dc2626" },
        ];
        return qualities.map((quality) => ({
            name: quality.name,
            count: summaryTasks.filter((task) => task.quality_of_task === quality.value).length,
            fill: quality.color,
        }));
    }, [summaryTasks]);

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
                minHeight: "calc(100vh - 70px)",
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
                {isAdminUser ? (
                    <button
                        className={`jira-tab-btn ${activeTab === "review" ? "active" : ""}`}
                        onClick={() => setActiveTab("review")}
                    >
                        <FileTextOutlined style={{ fontSize: 14 }} /> Review
                    </button>
                ) : (
                    <button
                        className={`jira-tab-btn ${activeTab === "submitted" ? "active" : ""}`}
                        onClick={() => setActiveTab("submitted")}
                    >
                        <FileTextOutlined style={{ fontSize: 14 }} /> Submitted
                    </button>
                )}
                <button
                    className={`jira-tab-btn ${activeTab === "completed" ? "active" : ""}`}
                    onClick={() => setActiveTab("completed")}
                >
                    <CheckCircleFilled style={{ fontSize: 14 }} /> Completed
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
                    <Input
                        prefix={<SearchOutlined style={{ color: "#8590a2" }} />}
                        placeholder="Search task, ID, assignee, reporter..."
                        aria-label="Search tasks by name, ID, details, assignee, reporter, priority, status, or deadline"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        allowClear
                        style={{ width: 290, borderRadius: 20, height: 34, fontSize: 13 }}
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
                            <BarsOutlined style={{ fontSize: 12 }} /> Group{groupBy !== "none" ? `: ${groupBy}` : ""}
                        </button>
                    </Dropdown>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {activeTab === "list" && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            createTaskForm.resetFields();
                            createTaskForm.setFieldsValue({
                                department: department.name,
                                project_name: project?.project_name || "",
                                priority: "medium",
                                start_date: dayjs(),
                                allotted_hours: 0,
                                allotted_minutes: 0,
                                reporter: reporters[0]?.key,
                            });
                            setStartDate(dayjs());
                            setCreateTaskModalOpen(true);
                        }}
                        style={{
                            background: "#D14E9A",
                            borderColor: "#D14E9A",
                            borderRadius: 6,
                            fontWeight: 600,
                            height: 34,
                        }}
                    >
                        Create Task
                    </Button>
                    )}
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
            ) : activeTab === "list" || activeTab === "backlog" || activeTab === "submitted" || activeTab === "review" || activeTab === "completed" ? (
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
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: activeTab === "completed" ? 2350 : activeTab === "review" || activeTab === "submitted" ? 1750 : 1350 }}>
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
                                <th style={{ padding: "10px 12px", width: 110 }}>Task ID</th>
                                <th style={{ padding: "10px 12px", width: 120, whiteSpace: "nowrap" }}>Sub Task<br />ID</th>
                                <th style={{ padding: "10px 12px", minWidth: 260 }}>
                                    Task
                                </th>
                                <th style={{ padding: "10px 12px", width: 180 }}>Assignee</th>
                                <th style={{ padding: "10px 12px", width: 140 }}>Status</th>
                                <th style={{ padding: "10px 12px", width: 130 }}>Priority</th>
                                <th style={{ padding: "10px 12px", width: 160 }}>Reporter</th>
                                <th style={{ padding: "10px 12px", minWidth: 185 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span>Due Date &amp; Deadline</span>
                                        <button
                                            type="button"
                                            onClick={() => toggleTaskDateSort("due")}
                                            aria-label={`Sort due dates ${dueSortDirection === "asc" ? "descending" : "ascending"}`}
                                            title={`Currently ${dueSortDirection === "asc" ? "ascending" : "descending"}; click to reverse`}
                                            style={{ border: 0, padding: 0, background: "transparent", color: "#44546f", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                                        >
                                            {dueSortDirection === "asc" ? "↑↓" : "↓↑"}
                                        </button>
                                    </div>
                                </th>
                                <th style={{ padding: "10px 12px", minWidth: 150 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span>Days To Go</span>
                                        <button
                                            type="button"
                                            onClick={() => toggleTaskDateSort("days")}
                                            aria-label={`Sort days to go ${dueSortDirection === "asc" ? "descending" : "ascending"}`}
                                            title="Sort by days remaining"
                                            style={{ border: 0, padding: 0, background: "transparent", color: "#44546f", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                                        >
                                            {dueSortDirection === "asc" ? "↑↓" : "↓↑"}
                                        </button>
                                    </div>
                                </th>
                                <th style={{ padding: "10px 12px", width: 115 }}>Allotted Time</th>
                                <th style={{ padding: "10px 12px", width: 110 }}>Time Taken</th>
                                {activeTab === "review" && <>
                                    <th style={{ padding: "10px 12px", minWidth: 180 }}>Task Sheet Link</th>
                                    <th style={{ padding: "10px 12px", minWidth: 220 }}>Employee Remarks</th>
                                    <th style={{ padding: "10px 12px", minWidth: 180 }}>Submitted Proofs</th>
                                </>}
                                {activeTab === "submitted" && <>
                                    <th style={{ padding: "10px 12px", minWidth: 180 }}>Task Sheet Link</th>
                                    <th style={{ padding: "10px 12px", minWidth: 220 }}>Attachments</th>
                                    <th style={{ padding: "10px 12px", minWidth: 240 }}>Employee Remarks</th>
                                </>}
                                {activeTab === "completed" && <>
                                    <th style={{ padding: "10px 12px", minWidth: 160 }}>Quality</th>
                                    <th style={{ padding: "10px 12px", width: 90 }}>Rating</th>
                                    <th style={{ padding: "10px 12px", minWidth: 180 }}>Task Sheet Link</th>
                                    <th style={{ padding: "10px 12px", minWidth: 180 }}>Attachments</th>
                                    <th style={{ padding: "10px 12px", minWidth: 200 }}>Employee Remarks</th>
                                    <th style={{ padding: "10px 12px", minWidth: 200 }}>Admin Remarks</th>
                                    <th style={{ padding: "10px 12px", width: 100 }}>Rework Count</th>
                                    <th style={{ padding: "10px 12px", minWidth: 150 }}>Completed On</th>
                                </>}
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
                                        colSpan={13 + (activeTab === "review" || activeTab === "submitted" ? 3 : activeTab === "completed" ? 8 : 0)}
                                        style={{
                                            textAlign: "center",
                                            padding: "48px 20px",
                                            color: "#8590a2",
                                            fontSize: 14,
                                        }}
                                    >
                                        {activeTab === "backlog" ? "No unassigned tasks in the backlog." : activeTab === "submitted" ? "No submitted tasks to show." : <>No tasks found. Click <b>+ Create</b> below to quickly add one!</>}
                                    </td>
                                </tr>
                            ) : (
                                filteredTasks.map((task, taskIndex) => {
                                    const assigneeColors = getAvatarColor(task.assigned_to_name || "");
                                    const reporterColors = getAvatarColor(task.assigned_by_name || "Admin");
                                    const statusMeta = normalizeStatus(task.task_status);
                                    const isAssigneeMenuOpen = activeAssigneeTaskId === task.id;
                                    const groupLabel = taskGroupLabel(task);
                                    const previousGroupLabel = taskIndex > 0 ? taskGroupLabel(filteredTasks[taskIndex - 1]) : null;
                                    const showGroupHeader = groupBy !== "none" && groupLabel !== previousGroupLabel;
                                    const groupCount = showGroupHeader ? filteredTasks.filter((item) => taskGroupLabel(item) === groupLabel).length : 0;
                                    const groupTitle = groupBy === "status" ? "Status" : groupBy === "assignee" ? "Assignee" : "Priority";

                                    return (
                                        <Fragment key={task.id}>
                                        {showGroupHeader && <tr>
                                            <td colSpan={13 + (activeTab === "review" || activeTab === "submitted" ? 3 : activeTab === "completed" ? 8 : 0)} style={{ padding: "8px 14px", background: "#f7f8f9", color: "#44546f", fontSize: 12, fontWeight: 700, borderTop: "1px solid #dfe1e6" }}>
                                                {groupTitle}: {groupLabel} <span style={{ marginLeft: 6, color: "#8590a2", fontWeight: 500 }}>({groupCount})</span>
                                            </td>
                                        </tr>}
                                        <tr className="jira-table-row">
                                            {/* TASK ID COLUMN */}
                                            <td className="jira-table-cell" style={{ whiteSpace: "nowrap" }}>
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
                                                        whiteSpace: "nowrap",
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
                                                    disabled={!canEditTask(task)}
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
                                                                {canEditTask(task) && <CloseOutlined
                                                                    style={{ fontSize: 9, color: "#94a3b8", marginLeft: 4 }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleReassign(task, null);
                                                                    }}
                                                                />}
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
                                                {isAdminUser && activeTab === "review" ? (
                                                    <Tag color={task.task_status === "under_review" ? "orange" : "purple"} style={{ margin: 0 }}>
                                                        {statusMeta.label}
                                                    </Tag>
                                                ) : canEditTask(task) ? (
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
                                                ) : (
                                                    <Tag style={{ margin: 0, color: statusMeta.text, background: statusMeta.bg, borderColor: statusMeta.border }}>{statusMeta.label}</Tag>
                                                )}
                                            </td>

                                            {/* PRIORITY COLUMN (with interactive quick changer) */}
                                            <td className="jira-table-cell">
                                                <Dropdown
                                                    disabled={!canEditTask(task)}
                                                    menu={{
                                                        items: ["critical", "high", "medium", "low"].map((pr) => ({
                                                            key: pr,
                                                            label: renderPriority(pr),
                                                            onClick: () => handleUpdateTaskField(task.id, { priority: pr }),
                                                        })),
                                                    }}
                                                    trigger={["click"]}
                                                >
                                                    <span style={{ cursor: canEditTask(task) ? "pointer" : "default" }}>{renderPriority(task.priority)}</span>
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
                                                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                                    {canEditTask(task) ? (
                                                        <DatePicker
                                                            size="small"
                                                            value={task.due_date ? dayjs(task.due_date) : null}
                                                            onChange={(_date, dateString) => handleUpdateTaskField(task.id, { due_date: dateString || null })}
                                                            placeholder="Set due date"
                                                            style={{ width: 150, borderRadius: 6, fontSize: 12 }}
                                                        />
                                                    ) : (
                                                        <span style={{ fontSize: 12, color: "#475569" }}>{task.due_date ? dayjs(task.due_date).format("DD MMM YYYY") : "—"}</span>
                                                    )}
                                                    {task.due_time && <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>by {dayjs(`1970-01-01T${task.due_time}`).format("hh:mm A")}</span>}
                                                </div>
                                            </td>

                                            <td className="jira-table-cell">
                                                {task.due_date && !["completed", "cancelled", "submitted", "under_review", "resubmitted"].includes(task.task_status) ? (() => {
                                                    const days = dayjs(task.due_date).startOf("day").diff(dayjs().startOf("day"), "day");
                                                    const label = days < 0 ? `Overdue by ${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"}` : days === 0 ? "Due today" : `${days} ${days === 1 ? "day" : "days"} to go`;
                                                    const color = days < 0 ? "#dc2626" : days === 0 ? "#d97706" : "#059669";
                                                    const bg = days < 0 ? "#fef2f2" : days === 0 ? "#fffbeb" : "#ecfdf5";
                                                    return <span style={{ color, background: bg, border: `1px solid ${color}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>;
                                                })() : <span style={{ color: "#94a3b8" }}>—</span>}
                                            </td>

                                            {/* ALLOTTED TIME */}
                                            <td className="jira-table-cell">
                                                <span style={{ fontSize: 12, color: "#475569", fontWeight: 600, whiteSpace: "nowrap" }}>
                                                    {formatDuration(task.allotted_time)}
                                                </span>
                                            </td>

                                            {/* TIME TAKEN */}
                                            <td className="jira-table-cell">
                                                <span style={{ fontSize: 12, color: "#0c66e4", fontWeight: 600, whiteSpace: "nowrap" }}>
                                                    {formatDuration(task.total_time_taken ?? 0)}
                                                </span>
                                            </td>

                                            {activeTab === "review" && <>
                                                <td className="jira-table-cell">
                                                    {task.task_sheet_link ? (
                                                        <a href={task.task_sheet_link} target="_blank" rel="noreferrer" style={{ color: "#0c66e4", fontSize: 12, whiteSpace: "nowrap" }}>
                                                            Open submission link
                                                        </a>
                                                    ) : <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>}
                                                </td>
                                                <td className="jira-table-cell" style={{ maxWidth: 250, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, color: "#475569" }}>
                                                    {task.employee_remarks || <span style={{ color: "#94a3b8" }}>—</span>}
                                                </td>
                                                <td className="jira-table-cell">
                                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5 }}>
                                                        {(task.attachments || []).map((attachment) => (
                                                            <div key={attachment.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                                                <Button
                                                                    type="link"
                                                                    size="small"
                                                                    icon={<EyeOutlined />}
                                                                    title="Preview attachment"
                                                                    aria-label={`Preview ${attachment.name || "attachment"}`}
                                                                    onClick={() => previewAttachmentFile(attachment.id, task.id)}
                                                                    style={{ padding: 0, height: "auto" }}
                                                                />
                                                                <Button
                                                                    type="link"
                                                                    size="small"
                                                                    icon={<DownloadOutlined />}
                                                                    title="Download attachment"
                                                                    aria-label={`Download ${attachment.name || "attachment"}`}
                                                                    onClick={() => downloadAttachmentFile(attachment.file, attachment.name || "attachment", attachment.id, task.id)}
                                                                    style={{ padding: 0, height: "auto" }}
                                                                />
                                                                <span style={{ fontSize: 12, color: "#0c66e4" }}>{attachment.name || "Attachment"}</span>
                                                            </div>
                                                        ))}
                                                        {(!task.attachments || task.attachments.length === 0) && <span style={{ color: "#94a3b8", fontSize: 12 }}>No attachments</span>}
                                                    </div>
                                                </td>
                                            </>}

                                            {activeTab === "submitted" && <>
                                                <td className="jira-table-cell">
                                                    {task.task_sheet_link ? (
                                                        <a href={task.task_sheet_link} target="_blank" rel="noreferrer" style={{ color: "#0c66e4", fontSize: 12, whiteSpace: "nowrap" }}>
                                                            Open submission link
                                                        </a>
                                                    ) : <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>}
                                                </td>
                                                <td className="jira-table-cell">
                                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5 }}>
                                                        {(task.attachments || []).map((attachment) => (
                                                            <div key={attachment.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                                                <Button type="link" size="small" icon={<EyeOutlined />} title="Preview attachment" aria-label={`Preview ${attachment.name || "attachment"}`} onClick={() => previewAttachmentFile(attachment.id, task.id)} style={{ padding: 0, height: "auto" }} />
                                                                <Button type="link" size="small" icon={<DownloadOutlined />} title="Download attachment" aria-label={`Download ${attachment.name || "attachment"}`} onClick={() => downloadAttachmentFile(attachment.file, attachment.name || "attachment", attachment.id, task.id)} style={{ padding: 0, height: "auto" }} />
                                                                <span style={{ fontSize: 12, color: "#0c66e4" }}>{attachment.name || "Attachment"}</span>
                                                            </div>
                                                        ))}
                                                        {(!task.attachments || task.attachments.length === 0) && <span style={{ color: "#94a3b8", fontSize: 12 }}>No attachments</span>}
                                                    </div>
                                                </td>
                                                <td className="jira-table-cell" style={{ maxWidth: 260, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, color: "#475569" }}>
                                                    {task.employee_remarks || <span style={{ color: "#94a3b8" }}>—</span>}
                                                </td>
                                            </>}

                                            {activeTab === "completed" && <>
                                                <td className="jira-table-cell">
                                                    <Tag color="green" style={{ margin: 0 }}>{REVIEW_QUALITY_OPTIONS.find((option) => option.value === task.quality_of_task)?.label || task.quality_of_task || "—"}</Tag>
                                                </td>
                                                <td className="jira-table-cell" style={{ whiteSpace: "nowrap" }}>
                                                    {task.rating ? <span title={`${task.rating} out of 5`} style={{ color: "#f5c400", letterSpacing: 1 }}>{"★".repeat(Math.min(5, task.rating))}</span> : <span style={{ color: "#94a3b8" }}>—</span>}
                                                </td>
                                                <td className="jira-table-cell">
                                                    {task.task_sheet_link ? <a href={task.task_sheet_link} target="_blank" rel="noreferrer" style={{ color: "#0c66e4", fontSize: 12 }}>Open</a> : <span style={{ color: "#94a3b8" }}>—</span>}
                                                </td>
                                                <td className="jira-table-cell">
                                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5 }}>
                                                        {(task.attachments || []).map((attachment) => (
                                                            <div key={attachment.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                                                <Button type="link" size="small" icon={<EyeOutlined />} title="Preview attachment" aria-label={`Preview ${attachment.name || "attachment"}`} onClick={() => previewAttachmentFile(attachment.id, task.id)} style={{ padding: 0, height: "auto" }} />
                                                                <Button type="link" size="small" icon={<DownloadOutlined />} title="Download attachment" aria-label={`Download ${attachment.name || "attachment"}`} onClick={() => downloadAttachmentFile(attachment.file, attachment.name || "attachment", attachment.id, task.id)} style={{ padding: 0, height: "auto" }} />
                                                                <span style={{ fontSize: 12, color: "#0c66e4" }}>{attachment.name || "Attachment"}</span>
                                                            </div>
                                                        ))}
                                                        {(!task.attachments || task.attachments.length === 0) && <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>}
                                                    </div>
                                                </td>
                                                <td className="jira-table-cell" style={{ maxWidth: 240, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, color: "#475569" }}>{task.employee_remarks || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                                                <td className="jira-table-cell" style={{ maxWidth: 240, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, color: "#475569" }}>{task.admin_remarks || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                                                <td className="jira-table-cell" style={{ textAlign: "center" }}>{task.rework_count ?? 0}</td>
                                                <td className="jira-table-cell" style={{ whiteSpace: "nowrap", fontSize: 12, color: "#475569" }}>{task.reviewed_date ? dayjs(task.reviewed_date).format("DD MMM YYYY, HH:mm") : "—"}</td>
                                            </>}

                                            {/* TIMER ACTIONS COLUMN (Start, Pause, Resume, Submit) */}
                                            <td className="jira-table-cell">
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    {isAdminUser && activeTab === "review" ? (
                                                        <>
                                                            <Button
                                                                size="small"
                                                                type="primary"
                                                                loading={reviewBusyTaskId === task.id}
                                                                onClick={() => openApproveReview(task)}
                                                                style={{ background: "#16a34a", borderColor: "#16a34a", borderRadius: 6, fontSize: 11, fontWeight: 600 }}
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="small"
                                                                danger
                                                                loading={reviewBusyTaskId === task.id}
                                                                onClick={() => openReworkReview(task)}
                                                                style={{ borderRadius: 6, fontSize: 11, fontWeight: 600 }}
                                                            >
                                                                Rework
                                                            </Button>
                                                        </>
                                                    ) : isTaskMine(task) ? (
                                                        task.task_status === "not_started" ? (
                                                            <Button
                                                                size="small"
                                                                type="primary"
                                                                icon={<PlayCircleOutlined />}
                                                                loading={timerBusyTaskId === task.id}
                                                                disabled={activeTimerTaskId !== null && activeTimerTaskId !== task.id}
                                                                title={activeTimerTaskId !== null && activeTimerTaskId !== task.id ? "Pause or submit your active task first" : undefined}
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
                                                            activeTimerTaskId === task.id ? <>
                                                                <Button
                                                                    size="small"
                                                                    icon={<PauseCircleOutlined />}
                                                                    loading={timerBusyTaskId === task.id}
                                                                    onClick={() => {
                                                                        setPauseTarget(task);
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
                                                                    onClick={() => openSubmitModal(task)}
                                                                    style={{
                                                                        background: "#0c66e4",
                                                                        borderRadius: 6,
                                                                        fontSize: 11,
                                                                        fontWeight: 600,
                                                                    }}
                                                                >
                                                                    Submit
                                                                </Button>
                                                            </> : (
                                                                <Button
                                                                    size="small"
                                                                    type="primary"
                                                                    icon={<PlayCircleOutlined />}
                                                                    loading={timerBusyTaskId === task.id}
                                                                    disabled={activeTimerTaskId !== null && activeTimerTaskId !== task.id}
                                                                    title={activeTimerTaskId !== null && activeTimerTaskId !== task.id ? "Pause or submit your active task first" : undefined}
                                                                    onClick={() => handleResumeTimer(task)}
                                                                    style={{ background: "#7c3aed", borderColor: "#7c3aed", borderRadius: 6, fontSize: 11, fontWeight: 600 }}
                                                                >
                                                                    Resume
                                                                </Button>
                                                            )
                                                        ) : task.task_status === "paused" || task.task_status === "rework_needed" ? (
                                                            <>
                                                                <Button
                                                                    size="small"
                                                                    type="primary"
                                                                    icon={<PlayCircleOutlined />}
                                                                    loading={timerBusyTaskId === task.id}
                                                                    disabled={activeTimerTaskId !== null && activeTimerTaskId !== task.id}
                                                                    title={activeTimerTaskId !== null && activeTimerTaskId !== task.id ? "Pause or submit your active task first" : undefined}
                                                                    onClick={() => handleResumeTimer(task)}
                                                                    style={{
                                                                        background: "#7c3aed",
                                                                        borderColor: "#7c3aed",
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
                                                                    onClick={() => openSubmitModal(task)}
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
                                                {activeTab === "submitted" && isTaskMine(task) && ["submitted", "under_review", "resubmitted"].includes(task.task_status) && (
                                                    <Dropdown
                                                        menu={{
                                                            items: [{
                                                                key: "resubmit",
                                                                label: "Resubmit",
                                                                onClick: () => openSubmitModal(task, true),
                                                            }],
                                                        }}
                                                    >
                                                        <Button type="text" size="small" icon={<MoreOutlined style={{ color: "#8590a2" }} />} />
                                                    </Dropdown>
                                                )}
                                            </td>
                                        </tr>
                                        </Fragment>
                                    );
                                })
                            )}

                            {/* ── INLINE QUICK CREATE ROW ── */}
                            {isCreatingInline && activeTab === "list" && (
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
                                        <Select
                                            placeholder="Assignee (optional)"
                                            value={inlineAssignee}
                                            onChange={(val) => setInlineAssignee(val)}
                                            style={{ width: "100%" }}
                                            allowClear
                                            options={employees.map((e) => ({ value: e.id, label: e.name }))}
                                        />
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
                                    {/* Due Date & Deadline Time */}
                                    <td style={{ padding: "8px 10px" }}>
                                        {mode === "recurring" ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                <DatePicker
                                                    size="small"
                                                    format="DD MMM YYYY"
                                                    value={inlineStartDate ? dayjs(inlineStartDate) : null}
                                                    disabledDate={(date) => date.isBefore(dayjs(), "day")}
                                                    onChange={(date) => setInlineStartDate(date?.format("YYYY-MM-DD") || null)}
                                                    placeholder="Start date"
                                                    style={{ width: "100%", borderRadius: 6 }}
                                                />
                                                <span style={{ color: "#64748b", fontSize: 10 }}>Repeat days are set after creation</span>
                                            </div>
                                        ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                <DatePicker
                                                    size="small"
                                                    format="DD MMM YYYY"
                                                    onChange={(_d, ds) => setInlineDueDate(typeof ds === "string" && ds ? dayjs(_d).format("YYYY-MM-DD") : null)}
                                                    placeholder="Due date"
                                                    style={{ width: "100%", borderRadius: 6 }}
                                                />
                                                <TimePicker
                                                    size="small"
                                                    format="hh:mm A"
                                                    use12Hours
                                                    placeholder="Deadline Time"
                                                    onChange={(_t) => setInlineDueTime(_t ? _t.format("HH:mm:ss") : null)}
                                                    style={{ width: "100%", borderRadius: 6 }}
                                                />
                                            </div>
                                        )}
                                    </td>
                                    {/* Allotted Time */}
                                    <td style={{ padding: "8px 10px" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                            <InputNumber
                                                size="small"
                                                min={0}
                                                step={1}
                                                placeholder="0"
                                                addonAfter="hrs"
                                                value={inlineAllottedHours}
                                                onChange={(h) => setInlineAllottedHours(Number(h || 0))}
                                                style={{ width: "100%" }}
                                            />
                                            <InputNumber
                                                size="small"
                                                min={0}
                                                max={59}
                                                step={5}
                                                placeholder="0"
                                                addonAfter="mins"
                                                value={inlineAllottedMinutes}
                                                onChange={(m) => setInlineAllottedMinutes(Number(m || 0))}
                                                style={{ width: "100%" }}
                                            />
                                        </div>
                                    </td>
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
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {activeTab === "list" && (
                            <button
                                onClick={() => {
                                    createTaskForm.resetFields();
                                    createTaskForm.setFieldsValue({
                                        department: department.name,
                                        project_name: project?.project_name || "",
                                        priority: "medium",
                                        start_date: dayjs(),
                                        allotted_hours: 0,
                                        allotted_minutes: 0,
                                        reporter: reporters[0]?.key,
                                    });
                                    setStartDate(dayjs());
                                    setCreateTaskModalOpen(true);
                                }}
                                style={{
                                    background: "#D14E9A",
                                    border: "none",
                                    color: "#ffffff",
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "6px 14px",
                                    borderRadius: 6,
                                }}
                            >
                                <PlusOutlined style={{ fontSize: 12 }} /> Create Task
                            </button>
                            )}

                            {activeTab === "list" && <button
                                onClick={() => setIsCreatingInline(true)}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "#0c66e4",
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "4px 8px",
                                }}
                            >
                                + Quick Inline
                            </button>}
                        </div>

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
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                        <div>
                            <div style={{ fontSize: 19, fontWeight: 700, color: "#172b4d" }}>Task overview</div>
                            <div style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>
                                {department.name} · {mode === "recurring" ? "Recurring tasks" : "Normal tasks"}
                                {project?.project_name ? ` · ${project.project_name}` : ""}
                            </div>
                        </div>
                        {userRole === "admin" && user?.role !== "employee" && (
                            <Select
                                value={summaryAssignee ?? "all"}
                                onChange={(value) => setSummaryAssignee(value === "all" ? null : Number(value))}
                                style={{ width: 220 }}
                                options={[
                                    { value: "all", label: "All team members" },
                                    ...employees.map((employee) => ({ value: employee.id, label: employee.name })),
                                ]}
                            />
                        )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                        <div style={{ background: "#f8fafc", padding: "18px 20px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 600 }}>Total Work Items</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{summaryTasks.length}</div>
                        </div>
                        <div style={{ background: "#f0fdf4", padding: "18px 20px", borderRadius: 12, border: "1px solid #bbf7d0" }}>
                            <div style={{ color: "#166534", fontSize: 12, fontWeight: 600 }}>Completed Items</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: "#16a34a", marginTop: 4 }}>
                                {summaryTasks.filter((t) => t.task_status === "completed").length}
                            </div>
                        </div>
                        <div style={{ background: "#eff6ff", padding: "18px 20px", borderRadius: 12, border: "1px solid #bfdbfe" }}>
                            <div style={{ color: "#1e40af", fontSize: 12, fontWeight: 600 }}>Active In-Flight</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: "#2563eb", marginTop: 4 }}>
                                {summaryTasks.filter((t) => ["in_progress", "under_review", "rework_needed"].includes(t.task_status)).length}
                            </div>
                        </div>
                        <div style={{ background: "#faf5ff", padding: "18px 20px", borderRadius: 12, border: "1px solid #e9d5ff" }}>
                            <div style={{ color: "#6b21a8", fontSize: 12, fontWeight: 600 }}>Completion Velocity</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: "#7c3aed", marginTop: 4 }}>
                                {summaryTasks.length > 0
                                    ? Math.round(
                                          (summaryTasks.filter((t) => t.task_status === "completed").length / summaryTasks.length) * 100
                                      )
                                    : 0}
                                %
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
                        <div style={{ background: "#fff", padding: "20px 22px", borderRadius: 12, border: "1px solid #e2e8f0", minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#172b4d" }}>Status breakdown</div>
                            <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>Current work item status{summaryAssignee === null ? " across the team" : " for the selected member"}.</div>
                            {!summaryStatusData.some((item) => item.value > 0) ? (
                                <div style={{ height: 280, display: "grid", placeItems: "center", color: "#94a3b8", fontSize: 13 }}>No tasks to summarize yet.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={325}>
                                    <PieChart>
                                        <Pie data={summaryStatusData.filter((item) => item.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="42%" innerRadius={52} outerRadius={78} paddingAngle={2}>
                                            {summaryStatusData.filter((entry) => entry.value > 0).map((entry, index) => (
                                                <Cell key={`status-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <ChartTooltip />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={48}
                                            content={() => (
                                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, max-content)", justifyContent: "center", columnGap: 16, rowGap: 5, width: "100%", padding: "0 4px" }}>
                                                    {summaryStatusData.map((entry) => (
                                                        <div key={entry.name} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, lineHeight: "18px", color: "#5f5f5f", whiteSpace: "nowrap" }}>
                                                            <span style={{ width: 12, height: 12, borderRadius: 3, background: entry.fill }} />
                                                            <span>{entry.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div style={{ background: "#fff", padding: "20px 22px", borderRadius: 12, border: "1px solid #e2e8f0", minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#172b4d" }}>Priority distribution</div>
                            <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>Task count by priority for the same scope.</div>
                            {summaryTasks.length === 0 ? (
                                <div style={{ height: 280, display: "grid", placeItems: "center", color: "#94a3b8", fontSize: 13 }}>No tasks to summarize yet.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={summaryPriorityData} margin={{ top: 12, right: 18, left: -16, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                        <ChartTooltip />
                                        <Bar dataKey="count" name="Tasks" radius={[6, 6, 0, 0]}>
                                            {summaryPriorityData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div style={{ background: "#fff", padding: "20px 22px", borderRadius: 12, border: "1px solid #e2e8f0", minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#172b4d" }}>Quality rating distribution</div>
                            <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>Admin review ratings for the same scope.</div>
                            {summaryQualityData.every((quality) => quality.count === 0) ? (
                                <div style={{ height: 280, display: "grid", placeItems: "center", color: "#94a3b8", fontSize: 13 }}>No rated tasks in this scope yet.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie data={summaryQualityData.filter((quality) => quality.count > 0)} dataKey="count" nameKey="name" cx="50%" cy="48%" innerRadius={62} outerRadius={96} paddingAngle={2}>
                                            {summaryQualityData.filter((quality) => quality.count > 0).map((quality) => <Cell key={quality.name} fill={quality.fill} />)}
                                        </Pie>
                                        <ChartTooltip />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={48}
                                            content={() => (
                                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, max-content)", justifyContent: "center", columnGap: 16, rowGap: 5, width: "100%", padding: "0 4px" }}>
                                                    {summaryQualityData.filter((quality) => quality.count > 0).map((quality) => (
                                                        <div key={quality.name} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, lineHeight: "18px", color: quality.fill, whiteSpace: "nowrap" }}>
                                                            <span style={{ width: 10, height: 10, borderRadius: 2, background: quality.fill }} />
                                                            <span>{quality.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
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
                                {canEditTask(selectedTask) ? (
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
                                ) : (
                                    <span style={{ color: normalizeStatus(selectedTask.task_status).text, background: normalizeStatus(selectedTask.task_status).bg, border: `1px solid ${normalizeStatus(selectedTask.task_status).border}`, padding: "5px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                                        {normalizeStatus(selectedTask.task_status).label}
                                    </span>
                                )}

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

                                {selectedTask.recurring_source && isAdminUser && (
                                    <div style={{ padding: 14, border: "1px solid #dfe1e6", borderRadius: 8, background: "#fff" }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "#172b4d", marginBottom: 12 }}>Recurring Schedule</div>
                                        {scheduleLoading || !scheduleDefinition ? (
                                            <Spin size="small" />
                                        ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 14, opacity: scheduleDefinition.is_active ? 1 : 0.65 }}>
                                                {!scheduleDefinition.is_active && <Tag color="default" style={{ width: "fit-content", margin: 0 }}>Schedule stopped</Tag>}
                                                <div>
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 5 }}>ASSIGNEE</div>
                                                    <Select
                                                        allowClear
                                                        disabled={scheduleSaving || !scheduleDefinition.is_active}
                                                        placeholder="Assign now or later"
                                                        value={scheduleDefinition.assigned_to != null ? `employee_${scheduleDefinition.assigned_to}` : scheduleDefinition.assigned_to_admin != null ? `admin_${scheduleDefinition.assigned_to_admin}` : undefined}
                                                        options={[
                                                            ...employees.map((employee) => ({ value: `employee_${employee.id}`, label: employee.name })),
                                                            ...reporters.filter((reporter) => reporter.type === "admin").map((reporter) => ({ value: `admin_${reporter.id}`, label: `${reporter.name} (Admin)` })),
                                                        ]}
                                                        onChange={(value) => {
                                                            const [kind, id] = String(value || "").split("_");
                                                            updateRecurringSchedule({
                                                                assigned_to: kind === "employee" ? Number(id) : null,
                                                                assigned_to_admin: kind === "admin" ? Number(id) : null,
                                                            });
                                                        }}
                                                        style={{ width: "100%" }}
                                                    />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 7 }}>REPEAT ON</div>
                                                    <Checkbox.Group
                                                        disabled={scheduleSaving || !scheduleDefinition.is_active}
                                                        value={scheduleDefinition.weekdays}
                                                        options={WEEKDAY_OPTIONS}
                                                        onChange={(values) => updateRecurringSchedule({ weekdays: values })}
                                                        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                                                    />
                                                </div>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                                    <div>
                                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 5 }}>START DATE</div>
                                                        <DatePicker
                                                            disabled={scheduleSaving || !scheduleDefinition.is_active}
                                                            disabledDate={(date) => date.isBefore(dayjs(), "day")}
                                                            value={scheduleDefinition.start_date ? dayjs(scheduleDefinition.start_date) : null}
                                                            format="DD MMM YYYY"
                                                            onChange={(date) => date && updateRecurringSchedule({ start_date: date.format("YYYY-MM-DD") })}
                                                            style={{ width: "100%" }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 5 }}>END DATE (OPTIONAL)</div>
                                                        <DatePicker
                                                            allowClear
                                                            disabled={scheduleSaving || !scheduleDefinition.is_active}
                                                            value={scheduleDefinition.end_date ? dayjs(scheduleDefinition.end_date) : null}
                                                            format="DD MMM YYYY"
                                                            placeholder="Ongoing"
                                                            onChange={(date) => updateRecurringSchedule({ end_date: date ? date.format("YYYY-MM-DD") : null })}
                                                            style={{ width: "100%" }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {isAdminUser && activeTab === "review" && (
                                    <div style={{ padding: 14, borderRadius: 8, border: "1px solid #bfdbfe", background: "#eff6ff" }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a8a", marginBottom: 10 }}>Employee Submission</div>
                                        {selectedTask.task_sheet_link && (
                                            <div style={{ marginBottom: selectedTask.employee_remarks ? 10 : 0, fontSize: 13 }}>
                                                <strong>Task Sheet / PR Link: </strong>
                                                {selectedTask.task_sheet_link.startsWith("http://") || selectedTask.task_sheet_link.startsWith("https://") ? (
                                                    <a href={selectedTask.task_sheet_link} target="_blank" rel="noreferrer">Open submission link</a>
                                                ) : selectedTask.task_sheet_link}
                                            </div>
                                        )}
                                        {selectedTask.employee_remarks && (
                                            <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap" }}>
                                                <strong>Employee Remarks: </strong>{selectedTask.employee_remarks}
                                            </div>
                                        )}
                                        {!selectedTask.task_sheet_link && !selectedTask.employee_remarks && (
                                            <div style={{ color: "#64748b", fontSize: 12 }}>No link or remarks were included. Review any attachments below.</div>
                                        )}
                                    </div>
                                )}

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
                                                    const rawFile = (file as any).originFileObj || file;
                                                    formData.append("attachments", rawFile, (rawFile as any).name || (file as any).name || "attachment");
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
                                                            const errText = await res.text();
                                                            let errDetail = "";
                                                            try {
                                                                const errJson = JSON.parse(errText);
                                                                errDetail = errJson.detail || errJson.message || "";
                                                            } catch {
                                                                const match = errText.match(/<pre class="exception_value">([\s\S]*?)<\/pre>/i) || errText.match(/<title>([\s\S]*?)<\/title>/i);
                                                                if (match) {
                                                                    errDetail = match[1].replace(/&#x27;/g, "'").replace(/<[^>]+>/g, "").trim();
                                                                } else {
                                                                    errDetail = `Upload failed (${res.status} ${res.statusText})`;
                                                                }
                                                            }
                                                            message.error(errDetail || "Failed to upload attachment");
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

                                                return filteredAtts.map((att) => {
                                                    const fileUrl = getAttachmentUrl(att.file);
                                                    const isImg = isImageFile(att.name || att.file || "");
                                                    return (
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
                                                                {isImg ? (
                                                                    <img
                                                                        src={fileUrl}
                                                                        alt={att.name || "attachment"}
                                                                        style={{
                                                                            width: 32,
                                                                            height: 32,
                                                                            objectFit: "cover",
                                                                            borderRadius: 4,
                                                                            border: "1px solid #e2e8f0",
                                                                            cursor: "pointer",
                                                                        }}
                                                                        onClick={() => previewAttachmentFile(att.id, selectedTask.id)}
                                                                    />
                                                                ) : (
                                                                    <PaperClipOutlined style={{ color: "#0c66e4", fontSize: 16 }} />
                                                                )}
                                                                <a href={fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 500, color: "#0c66e4" }}>
                                                                    {att.name || "Attachment"}
                                                                </a>
                                                            </div>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#64748b", fontSize: 12 }}>
                                                                <span>{att.uploaded_at ? dayjs(att.uploaded_at).format("MMM DD, YYYY") : "Today"}</span>
                                                                <span>{att.size ? `${Math.round(att.size / 1024)} KB` : "File"}</span>
                                                                <a
                                                                    href={fileUrl}
                                                                    download={att.name || "download"}
                                                                    onClick={(event) => {
                                                                        event.preventDefault();
                                                                        void downloadAttachmentFile(fileUrl, att.name || "attachment", att.id);
                                                                    }}
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
                                                    );
                                                });
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
                                            {(user?.name?.trim()?.[0] || "U").toUpperCase()}
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

                                {/* SCREENSHOT 2: ALLOTTED TIME */}
                                <div>
                                    <div style={{ marginBottom: 4 }}>
                                        <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.5px", color: "#334155", textTransform: "uppercase" }}>
                                            <span style={{ color: "#ef4444", marginRight: 3 }}>*</span>ALLOTTED TIME
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <InputNumber
                                            min={0}
                                            step={1}
                                            placeholder="0"
                                            addonAfter="hrs"
                                            value={Math.floor(Number(selectedTask.allotted_time || 0))}
                                            onChange={(h) => {
                                                const currentMinutes = Math.round((Number(selectedTask.allotted_time || 0) % 1) * 60);
                                                const newHours = Number(h || 0);
                                                const totalM = newHours * 60 + currentMinutes;
                                                const newAllotted = Math.round((totalM / 60.0) * 100) / 100;
                                                const patch: Record<string, any> = { allotted_time: newAllotted };
                                                if (selectedTask.start_date && totalM > 0) {
                                                    const target = dayjs(selectedTask.start_date).add(totalM, "minute");
                                                    patch.due_date = target.format("YYYY-MM-DD");
                                                    patch.due_time = target.format("HH:mm:ss");
                                                }
                                                handleUpdateTaskField(selectedTask.id, patch);
                                            }}
                                            style={{ width: "50%" }}
                                        />
                                        <InputNumber
                                            min={0}
                                            max={59}
                                            step={5}
                                            placeholder="0"
                                            addonAfter="mins"
                                            value={Math.round((Number(selectedTask.allotted_time || 0) % 1) * 60)}
                                            onChange={(m) => {
                                                const currentHours = Math.floor(Number(selectedTask.allotted_time || 0));
                                                const newMins = Number(m || 0);
                                                const totalM = currentHours * 60 + newMins;
                                                const newAllotted = Math.round((totalM / 60.0) * 100) / 100;
                                                const patch: Record<string, any> = { allotted_time: newAllotted };
                                                if (selectedTask.start_date && totalM > 0) {
                                                    const target = dayjs(selectedTask.start_date).add(totalM, "minute");
                                                    patch.due_date = target.format("YYYY-MM-DD");
                                                    patch.due_time = target.format("HH:mm:ss");
                                                }
                                                handleUpdateTaskField(selectedTask.id, patch);
                                            }}
                                            style={{ width: "50%" }}
                                        />
                                    </div>
                                </div>

                                {/* SCREENSHOT 3: START DATE */}
                                <div>
                                    <div style={{ marginBottom: 4 }}>
                                        <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.5px", color: "#334155", textTransform: "uppercase" }}>
                                            <span style={{ color: "#ef4444", marginRight: 3 }}>*</span>START DATE
                                        </span>
                                    </div>
                                    <DatePicker
                                        value={selectedTask.start_date ? dayjs(selectedTask.start_date) : null}
                                        format="DD MMM YYYY"
                                        onChange={(_d, ds) => {
                                            const dateStr = typeof ds === "string" && ds ? dayjs(_d).format("YYYY-MM-DD") : null;
                                            const patch: Record<string, any> = { start_date: dateStr };
                                            const totalM = Math.round(Number(selectedTask.allotted_time || 0) * 60);
                                            if (dateStr && totalM > 0) {
                                                const target = dayjs(_d).add(totalM, "minute");
                                                patch.due_date = target.format("YYYY-MM-DD");
                                                patch.due_time = target.format("HH:mm:ss");
                                            }
                                            handleUpdateTaskField(selectedTask.id, patch);
                                        }}
                                        style={{ width: "100%", borderRadius: 6 }}
                                    />
                                </div>

                                {/* SCREENSHOT 3: DUE DATE */}
                                <div>
                                    <div style={{ marginBottom: 4 }}>
                                        <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.5px", color: "#334155", textTransform: "uppercase" }}>
                                            <span style={{ color: "#ef4444", marginRight: 3 }}>*</span>DUE DATE
                                        </span>
                                    </div>
                                    <DatePicker
                                        value={selectedTask.due_date ? dayjs(selectedTask.due_date) : null}
                                        format="DD MMM YYYY"
                                        placeholder="Select date"
                                        onChange={(_d, ds) =>
                                            handleUpdateTaskField(selectedTask.id, {
                                                due_date: typeof ds === "string" && ds ? dayjs(_d).format("YYYY-MM-DD") : null,
                                            })
                                        }
                                        style={{ width: "100%", borderRadius: 6 }}
                                    />
                                </div>

                                {/* SCREENSHOT 3: DEADLINE TIME */}
                                <div>
                                    <div style={{ marginBottom: 4 }}>
                                        <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.5px", color: "#334155", textTransform: "uppercase" }}>
                                            DEADLINE TIME
                                        </span>
                                    </div>
                                    <TimePicker
                                        value={selectedTask.due_time ? dayjs(selectedTask.due_time, ["HH:mm:ss", "HH:mm", "hh:mm A", "hh:mmA"]) : null}
                                        format="hh:mm A"
                                        use12Hours
                                        placeholder="e.g. 03:00 PM"
                                        onChange={(_t) =>
                                            handleUpdateTaskField(selectedTask.id, {
                                                due_time: _t ? _t.format("HH:mm:ss") : null,
                                            })
                                        }
                                        style={{ width: "100%", borderRadius: 6 }}
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
                                        <span>Logged: <b>{formatDuration(selectedTask.total_time_taken ?? 0)}</b></span>
                                        <span>Allotted: <b>{formatDuration(selectedTask.allotted_time)}</b></span>
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
            <PauseTaskModal
                open={pauseModalOpen}
                task={pauseTarget}
                onClose={() => setPauseModalOpen(false)}
                onSuccess={() => {
                    setActiveTimerTaskId(null);
                    setPauseTarget(null);
                    fetchTasks();
                }}
            />
            {/* ── SUBMIT MODAL (Task Submit Concept) ── */}
            <Modal
                title={
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <CheckCircleOutlined style={{ color: "#16a34a" }} />
                        <span>{submitTarget && ["submitted", "under_review", "resubmitted"].includes(submitTarget.task_status) ? "Resubmit Deliverable" : "Submit Deliverable"}: {submitTarget?.sub_task_id || submitTarget?.task_id}</span>
                    </div>
                }
                open={submitModalOpen}
                onCancel={() => setSubmitModalOpen(false)}
                onOk={handleConfirmSubmit}
                okText={submitTarget && ["submitted", "under_review", "resubmitted"].includes(submitTarget.task_status) ? "Resubmit Task" : "Submit Task"}
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
                    {existingSubmitAttachments.length > 0 && (
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Existing Attachments</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {existingSubmitAttachments.map((attachment) => {
                                    const canRemove = !attachment.is_creation_attachment && attachment.uploaded_by === myId;
                                    return (
                                        <div key={attachment.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                                            <a href={getAttachmentUrl(attachment.file)} target="_blank" rel="noreferrer" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {attachment.name || "Attachment"}
                                            </a>
                                            {canRemove ? (
                                                <Button
                                                    type="text"
                                                    danger
                                                    size="small"
                                                    icon={<CloseOutlined />}
                                                    aria-label={`Remove ${attachment.name || "attachment"}`}
                                                    onClick={() => {
                                                        setDeletedSubmitAttachmentIds((ids) => ids.includes(attachment.id) ? ids : [...ids, attachment.id]);
                                                        setExistingSubmitAttachments((items) => items.filter((item) => item.id !== attachment.id));
                                                    }}
                                                >
                                                    Remove
                                                </Button>
                                            ) : <span style={{ color: "#94a3b8", fontSize: 11 }}>Not removable</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
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

            {/* ── CREATE TASK MODAL (Screenshots 2 & 3 Inputs) ── */}
            <Modal
                title={
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18, color: "#D14E9A" }}>✦</span>
                        <span style={{ fontWeight: 700, fontSize: 16 }}>{mode === "recurring" ? "Create Recurring Task" : "Create Task"}</span>
                    </div>
                }
                open={createTaskModalOpen}
                onCancel={() => {
                    setCreateTaskModalOpen(false);
                    createTaskForm.resetFields();
                }}
                footer={null}
                width={650}
                destroyOnClose
                centered
            >
                <Form
                    form={createTaskForm}
                    layout="vertical"
                    onFinish={handleCreateTaskSubmit}
                    initialValues={{
                        priority: "medium",
                        start_date: dayjs(),
                        allotted_hours: 0,
                        allotted_minutes: 0,
                        department: department.name,
                        project_name: project?.project_name || "",
                        reporter: reporters[0]?.key,
                        recurring_start_date: dayjs(),
                    }}
                    style={{ marginTop: 14 }}
                >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Form.Item
                            name="department"
                            label={<span style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: "0.5px", color: "#1e293b", textTransform: "uppercase" }}><span style={{ color: "#ef4444", marginRight: 4 }}>*</span>DEPARTMENT</span>}
                            rules={[{ required: true, message: "Department is required" }]}
                        >
                            <Input disabled style={{ borderRadius: 6, color: "#475569" }} />
                        </Form.Item>
                        <Form.Item
                            name="project_name"
                            label={<span style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: "0.5px", color: "#1e293b", textTransform: "uppercase" }}>PROJECT NAME</span>}
                        >
                            <Input placeholder="e.g. Website Redesign" style={{ borderRadius: 6 }} />
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="task_name"
                        label={<span style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: "0.5px", color: "#1e293b", textTransform: "uppercase" }}><span style={{ color: "#ef4444", marginRight: 4 }}>*</span>TASK NAME</span>}
                        rules={[{ required: true, message: "Task name is required" }]}
                    >
                        <Input placeholder="What needs to be done?" style={{ borderRadius: 6 }} />
                    </Form.Item>

                    <Form.Item
                        name="task_details"
                        label={<span style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: "0.5px", color: "#1e293b", textTransform: "uppercase" }}>TASK DETAILS / DESCRIPTION</span>}
                    >
                        <Input.TextArea rows={3} placeholder="Add detailed instructions, specs, or context..." style={{ borderRadius: 6 }} />
                    </Form.Item>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Form.Item
                            name="assigned_to"
                            label={<span style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: "0.5px", color: "#1e293b", textTransform: "uppercase" }}>ASSIGNEE</span>}
                        >
                            <Select
                                placeholder={mode === "recurring" ? "Assign now or later" : "Select assignee"}
                                allowClear
                                options={employees.map((e) => ({ value: e.id, label: e.name }))}
                                style={{ borderRadius: 6 }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="priority"
                            label={<span style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: "0.5px", color: "#1e293b", textTransform: "uppercase" }}><span style={{ color: "#ef4444", marginRight: 4 }}>*</span>PRIORITY</span>}
                            rules={[{ required: true }]}
                        >
                            <Select
                                options={[
                                    { value: "critical", label: "Highest / Critical" },
                                    { value: "high", label: "High" },
                                    { value: "medium", label: "Medium" },
                                    { value: "low", label: "Low" },
                                ]}
                                style={{ borderRadius: 6 }}
                            />
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="reporter"
                        label={<span style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: "0.5px", color: "#1e293b", textTransform: "uppercase" }}>REPORTER</span>}
                    >
                        <Select
                            placeholder="Select reporter"
                            allowClear
                            options={reporters.map((r) => ({ value: r.key, label: r.label }))}
                            style={{ borderRadius: 6 }}
                        />
                    </Form.Item>

                    {/* ── SCREENSHOT 2: ALLOTTED TIME ── */}
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ marginBottom: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: "0.5px", color: "#1e293b", textTransform: "uppercase" }}>
                                <span style={{ color: "#ef4444", marginRight: 4 }}>*</span>ALLOTTED TIME
                            </span>
                        </div>
                        <div style={{ display: "flex", gap: 12 }}>
                            <Form.Item name="allotted_hours" noStyle>
                                <InputNumber
                                    min={0}
                                    max={999999}
                                    step={1}
                                    placeholder="0"
                                    addonAfter="hrs"
                                    style={{ width: "50%" }}
                                    onChange={(h) => handleDurationChange(h, createTaskForm.getFieldValue("allotted_minutes"), createTaskForm.getFieldValue("start_date"))}
                                />
                            </Form.Item>
                            <Form.Item name="allotted_minutes" noStyle>
                                <InputNumber
                                    min={0}
                                    max={59}
                                    step={5}
                                    placeholder="0"
                                    addonAfter="mins"
                                    style={{ width: "50%" }}
                                    onChange={(m) => handleDurationChange(createTaskForm.getFieldValue("allotted_hours"), m, createTaskForm.getFieldValue("start_date"))}
                                />
                            </Form.Item>
                        </div>
                    </div>

                    {/* ── SCREENSHOT 3: START DATE, DUE DATE, DEADLINE TIME ── */}
                    {mode === "recurring" ? (
                        <>
                            <Form.Item label="REPEAT ON" required>
                                <Checkbox.Group
                                    value={recurringWeekdays}
                                    onChange={(values) => setRecurringWeekdays(values as number[])}
                                    options={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, value) => ({ label, value }))}
                                />
                            </Form.Item>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
                                <Form.Item name="recurring_start_date" label="START DATE" rules={[{ required: true, message: "Required" }]}>
                                    <DatePicker disabledDate={(date) => date.isBefore(dayjs(), "day")} format="DD MMM YYYY" style={{ width: "100%" }} />
                                </Form.Item>
                                <Form.Item name="recurring_end_date" label="END DATE (OPTIONAL)" help="Leave blank to repeat until stopped manually">
                                    <DatePicker format="DD MMM YYYY" style={{ width: "100%" }} />
                                </Form.Item>
                            </div>
                        </>
                    ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 8 }}>
                        <Form.Item
                            name="start_date"
                            label={<span style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: "0.5px", color: "#1e293b", textTransform: "uppercase" }}><span style={{ color: "#ef4444", marginRight: 4 }}>*</span>START DATE</span>}
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <DatePicker
                                format="DD MMM YYYY"
                                style={{ width: "100%" }}
                                onChange={(d) => handleDurationChange(createTaskForm.getFieldValue("allotted_hours"), createTaskForm.getFieldValue("allotted_minutes"), d)}
                            />
                        </Form.Item>

                        <Form.Item
                            name="due_date"
                            label={<span style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: "0.5px", color: "#1e293b", textTransform: "uppercase" }}><span style={{ color: "#ef4444", marginRight: 4 }}>*</span>DUE DATE</span>}
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <DatePicker
                                format="DD MMM YYYY"
                                placeholder="Select date"
                                style={{ width: "100%" }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="due_time"
                            label={<span style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: "0.5px", color: "#1e293b", textTransform: "uppercase" }}>DEADLINE TIME</span>}
                        >
                            <TimePicker
                                format="hh:mm A"
                                use12Hours
                                placeholder="e.g. 03:00 PM"
                                style={{ width: "100%" }}
                            />
                        </Form.Item>
                    </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
                        <Button
                            onClick={() => {
                                setCreateTaskModalOpen(false);
                                createTaskForm.resetFields();
                            }}
                            style={{ borderRadius: 6 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={createTaskLoading}
                            style={{ background: "#D14E9A", borderColor: "#D14E9A", borderRadius: 6, fontWeight: 600 }}
                        >
                            {mode === "recurring" ? "Schedule Recurring Task" : "Create Task"}
                        </Button>
                    </div>
                </Form>
            </Modal>

            <Modal
                open={approveReviewOpen}
                onCancel={() => setApproveReviewOpen(false)}
                onOk={handleApproveReviewedTask}
                confirmLoading={approveReviewLoading}
                title="Approve Task"
                okText="Approve & Complete"
                width={520}
                centered
                destroyOnClose
            >
                {reviewTarget && (
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 16, background: "#f1f5f9", borderRadius: 8 }}>
                            <Tag color="blue" style={{ margin: 0 }}>{reviewTarget.sub_task_id || reviewTarget.task_id}</Tag>
                            <span style={{ fontWeight: 600, color: "#172b4d" }}>{reviewTarget.task_name}</span>
                        </div>
                        <Form form={approveReviewForm} layout="vertical">
                            <Form.Item name="quality_of_task" label="Quality of Task" rules={[{ required: true, message: "Select a quality rating." }]}>
                                <Select
                                    placeholder="Select quality"
                                    options={REVIEW_QUALITY_OPTIONS.map((option) => ({
                                        value: option.value,
                                        label: option.label,
                                    }))}
                                    optionRender={(option) => {
                                        const quality = REVIEW_QUALITY_OPTIONS.find((item) => item.value === option.value);
                                        return (
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                                                <span>{quality?.label}</span>
                                                <span aria-label={`${quality?.rating ?? 0} stars`} style={{ color: "#f5c400", letterSpacing: 2, whiteSpace: "nowrap" }}>
                                                    {"★".repeat(quality?.rating ?? 0)}
                                                </span>
                                            </div>
                                        );
                                    }}
                                />
                            </Form.Item>
                            <Form.Item name="admin_remarks" label="Admin Remarks">
                                <Input.TextArea rows={3} placeholder="Optional notes for the employee" />
                            </Form.Item>
                        </Form>
                    </>
                )}
            </Modal>

            <Modal
                open={reworkReviewOpen}
                onCancel={() => setReworkReviewOpen(false)}
                onOk={handleRequestTaskRework}
                confirmLoading={reworkReviewLoading}
                title="Request Rework"
                okText="Send Back for Rework"
                okButtonProps={{ danger: true }}
                width={520}
                centered
                destroyOnClose
            >
                {reviewTarget && (
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 16, background: "#f1f5f9", borderRadius: 8 }}>
                            <Tag color="blue" style={{ margin: 0 }}>{reviewTarget.sub_task_id || reviewTarget.task_id}</Tag>
                            <span style={{ fontWeight: 600, color: "#172b4d" }}>{reviewTarget.task_name}</span>
                        </div>
                        <Form form={reworkReviewForm} layout="vertical">
                            <Form.Item name="admin_remarks" label="Reason for Rework" rules={[{ required: true, message: "Explain what needs to be changed." }]}>
                                <Input.TextArea rows={4} placeholder="Explain what needs to be fixed or redone" />
                            </Form.Item>
                        </Form>
                    </>
                )}
            </Modal>

            <Modal
                open={!!previewAttachment}
                title={previewAttachment?.name || "Attachment Preview"}
                onCancel={closeAttachmentPreview}
                footer={[
                    <Button key="close" onClick={closeAttachmentPreview}>Close</Button>,
                    <Button
                        key="download"
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={() => previewAttachment && downloadAttachmentFile(
                            previewAttachment.file,
                            previewAttachment.name,
                            previewAttachment.attachmentId,
                            previewAttachment.taskId,
                        )}
                    >
                        Download
                    </Button>,
                ]}
                width={1000}
                centered
                destroyOnClose
            >
                {previewAttachment && previewAttachment.mimeType.startsWith("image/") ? (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 240, maxHeight: "75vh", overflow: "auto", background: "#111827", borderRadius: 8, padding: 8 }}>
                        <img src={previewAttachment.url} alt={previewAttachment.name} style={{ display: "block", maxWidth: "100%", maxHeight: "72vh", objectFit: "contain" }} />
                    </div>
                ) : previewAttachment?.mimeType === "application/pdf" ? (
                    <iframe title={previewAttachment.name} src={previewAttachment.url} style={{ width: "100%", height: "72vh", border: 0 }} />
                ) : (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                        This file type cannot be previewed in the browser. Download it to view the file.
                    </div>
                )}
            </Modal>
        </div>
    );
}
