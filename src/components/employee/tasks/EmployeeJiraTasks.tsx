import { useEffect, useState } from "react";
import JiraProjectView from "../../admin/JiraProjectView";
import { useAuth } from "../../AuthContext";
import { Spin } from "antd";

interface EmployeeJiraTasksProps {
    mode: "normal" | "recurring";
    pageTitle?: string;
}

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function EmployeeJiraTasks({ mode, pageTitle }: EmployeeJiraTasksProps) {
    const { user } = useAuth();
    const [departmentName, setDepartmentName] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchUserDept = async () => {
            try {
                const tokenRaw = localStorage.getItem("task_tracker_auth");
                const token = tokenRaw ? JSON.parse(tokenRaw).token : null;
                const headers: HeadersInit = token ? { Authorization: `Token ${token}` } : {};

                const res = await fetch(`${BASE_URL}/api/auth/me/`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        const dept = data?.department || (user as any)?.department || "";
                        setDepartmentName(dept);
                    }
                } else if (isMounted) {
                    setDepartmentName((user as any)?.department || "");
                }
            } catch {
                if (isMounted) {
                    setDepartmentName((user as any)?.department || "");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchUserDept();
        return () => {
            isMounted = false;
        };
    }, [(user as any)?.department]);

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
                <Spin size="large" tip="Loading workspace..." />
            </div>
        );
    }

    return (
        <JiraProjectView
            project={{ project_name: "", department: departmentName }}
            department={{ name: departmentName }}
            mode={mode}
            userRole="employee"
            initialTab={mode === "recurring" ? "list" : "trello"}
            customTitle={pageTitle || (mode === "recurring" ? "Recurring Tasks" : "Normal Tasks")}
        />
    );
}
