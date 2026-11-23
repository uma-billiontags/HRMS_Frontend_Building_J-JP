import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, DatePicker, Input, message, Select, Space, Tag, TimePicker, Typography } from "antd";
import {
    MailOutlined,
    SendOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "../AuthContext";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const { TextArea } = Input;
const { Title, Text } = Typography;

type RequestType = "leave" | "permission" | "custom";

interface RequestRow {
    id: number;
    request_type: RequestType;
    sender_email: string;
    recipient_email: string;
    cc_email?: string;
    subject: string;
    body: string;
    start_date: string | null;
    end_date: string | null;
    start_time: string | null;
    end_time: string | null;
    status: "pending" | "approved" | "rejected";
    decision_note: string;
    decided_by_name?: string;
    created_at: string;
    employee_name: string;
}

function authHeaders(): HeadersInit {
    try {
        const raw = localStorage.getItem("task_tracker_auth");
        const token = raw ? JSON.parse(raw).token : null;
        return token ? { Authorization: `Token ${token}` } : {};
    } catch {
        return {};
    }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Standard email chips input (like Gmail / Outlook):
 * - No popup dropdowns.
 * - Typing an email and pressing Enter, Comma, Semicolon, Space, or Tab converts it into an email chip and clears the input.
 * - Pasting multiple comma/space/newline-separated emails automatically converts all into chips.
 * - Backspace on an empty input removes the last chip.
 * - Clickable '×' on each chip removes it.
 */
function EmailChipsInput({
    label,
    required = false,
    emails,
    onChange,
    placeholder = "Enter email address and press Enter",
}: {
    label: string;
    required?: boolean;
    emails: string[];
    onChange: (emails: string[]) => void;
    placeholder?: string;
}) {
    const [inputVal, setInputVal] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const addEmailsFromText = (text: string) => {
        if (!text.trim()) return;
        const tokens = text
            .split(/[,;\s\n]+/)
            .map((t) => t.trim())
            .filter(Boolean);
        if (tokens.length === 0) return;

        const next = [...emails];
        for (const token of tokens) {
            if (!next.includes(token)) {
                next.push(token);
            }
        }
        onChange(next);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === "," || e.key === ";" || e.key === "Tab") {
            if (inputVal.trim()) {
                e.preventDefault();
                addEmailsFromText(inputVal);
                setInputVal("");
            } else if (e.key === "Enter") {
                e.preventDefault();
            }
        } else if (e.key === " " && inputVal.trim()) {
            e.preventDefault();
            addEmailsFromText(inputVal);
            setInputVal("");
        } else if (e.key === "Backspace" && !inputVal && emails.length > 0) {
            onChange(emails.slice(0, -1));
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData.getData("text");
        if (
            pasted &&
            (pasted.includes(",") ||
                pasted.includes(";") ||
                pasted.includes(" ") ||
                pasted.includes("\n") ||
                pasted.includes("@"))
        ) {
            e.preventDefault();
            addEmailsFromText(pasted);
            setInputVal("");
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (inputVal.trim()) {
            addEmailsFromText(inputVal);
            setInputVal("");
        }
    };

    const removeChip = (idxToRemove: number) => {
        onChange(emails.filter((_, idx) => idx !== idxToRemove));
        inputRef.current?.focus();
    };

    return (
        <div
            onClick={() => inputRef.current?.focus()}
            style={{
                display: "flex",
                alignItems: "flex-start",
                border: isFocused ? "1px solid #3b82f6" : "1px solid #d9d9d9",
                borderRadius: 8,
                background: "#fff",
                boxShadow: isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.15)" : "none",
                transition: "all 0.15s ease",
                cursor: "text",
                minHeight: 40,
                overflow: "hidden",
            }}
        >
            {/* Left addon label */}
            <div
                style={{
                    padding: "9px 14px",
                    background: "#f8fafc",
                    borderRight: isFocused ? "1px solid #93c5fd" : "1px solid #d9d9d9",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: 13,
                    minWidth: 64,
                    textAlign: "center",
                    userSelect: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    alignSelf: "stretch",
                }}
            >
                {label} {required && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
            </div>

            {/* Email chips and active typing area */}
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px",
                }}
            >
                {emails.map((email, idx) => {
                    const isValid = EMAIL_REGEX.test(email);
                    return (
                        <span
                            key={`${email}-${idx}`}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "3px 10px",
                                borderRadius: 16,
                                fontSize: 13,
                                background: isValid ? "#f1f5f9" : "#fef2f2",
                                border: isValid ? "1px solid #cbd5e1" : "1px solid #fca5a5",
                                color: isValid ? "#1e293b" : "#b91c1c",
                                lineHeight: 1.4,
                            }}
                        >
                            <span>{email}</span>
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeChip(idx);
                                }}
                                style={{
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    fontSize: 14,
                                    color: isValid ? "#64748b" : "#ef4444",
                                    lineHeight: 1,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 14,
                                    height: 14,
                                    borderRadius: "50%",
                                }}
                                title="Remove"
                            >
                                ×
                            </span>
                        </span>
                    );
                })}

                <input
                    ref={inputRef}
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onFocus={() => setIsFocused(true)}
                    onBlur={handleBlur}
                    placeholder={emails.length === 0 ? placeholder : ""}
                    style={{
                        border: "none",
                        outline: "none",
                        flex: "1 1 180px",
                        minWidth: 140,
                        fontSize: 13,
                        padding: "4px 2px",
                        background: "transparent",
                        color: "#1e293b",
                        fontFamily: "inherit",
                    }}
                />
            </div>
        </div>
    );
}

export default function EmployeeRequests() {
    const { user } = useAuth();

    // Form state
    const [requestType, setRequestType] = useState<RequestType>("leave");
    const [recipients, setRecipients] = useState<string[]>([]);
    const [ccRecipients, setCcRecipients] = useState<string[]>([]);
    const [subject, setSubject] = useState("Leave Request");
    const [body, setBody] = useState("");
    const [startDate, setStartDate] = useState<Dayjs | null>(null);
    const [endDate, setEndDate] = useState<Dayjs | null>(null);
    const [startTime, setStartTime] = useState<Dayjs | null>(null);
    const [endTime, setEndTime] = useState<Dayjs | null>(null);
    const [sending, setSending] = useState(false);

    // Personal requests state
    const [rows, setRows] = useState<RequestRow[]>([]);
    const [loading, setLoading] = useState(false);

    // Load personal requests
    const loadRequests = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/requests/mine/`, { headers: authHeaders() });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.detail || "Could not load requests");
            setRows(payload);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "Could not load requests");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRequests();
        const timer = window.setInterval(loadRequests, 15_000);
        return () => window.clearInterval(timer);
    }, [loadRequests]);

    const changeType = (value: RequestType) => {
        setRequestType(value);
        setSubject(value === "leave" ? "Leave Request" : value === "permission" ? "Permission Request" : "");
    };

    const submit = async () => {
        if (recipients.length === 0) {
            message.warning("Please provide at least one recipient email address in To.");
            return;
        }

        const invalidTo = recipients.filter((email) => !EMAIL_REGEX.test(email));
        if (invalidTo.length > 0) {
            message.error(`Invalid recipient email address: ${invalidTo.join(", ")}`);
            return;
        }

        const invalidCc = ccRecipients.filter((email) => !EMAIL_REGEX.test(email));
        if (invalidCc.length > 0) {
            message.error(`Invalid CC email address: ${invalidCc.join(", ")}`);
            return;
        }

        if (!subject.trim() || !body.trim()) {
            message.warning("Fill in the subject and message.");
            return;
        }
        if (requestType === "leave" && (!startDate || !endDate || endDate.isBefore(startDate, "day"))) {
            message.warning("Choose a valid leave start and end date.");
            return;
        }
        if (requestType === "permission" && (!startDate || !startTime || !endTime)) {
            message.warning("Choose the permission date and time range.");
            return;
        }

        setSending(true);
        try {
            const response = await fetch(`${BASE_URL}/api/requests/create/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({
                    request_type: requestType,
                    recipient_email: recipients.join(", "),
                    cc_email: ccRecipients.join(", "),
                    subject: subject.trim(),
                    body: body.trim(),
                    start_date: startDate?.format("YYYY-MM-DD") ?? null,
                    end_date: endDate?.format("YYYY-MM-DD") ?? null,
                    start_time: startTime?.format("HH:mm:ss") ?? null,
                    end_time: endTime?.format("HH:mm:ss") ?? null,
                }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.detail || "Request could not be sent");
            message.success("Request email sent successfully.");
            setRecipients([]);
            setCcRecipients([]);
            setBody("");
            setStartDate(null);
            setEndDate(null);
            setStartTime(null);
            setEndTime(null);
            await loadRequests();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "Request could not be sent");
        } finally {
            setSending(false);
        }
    };

    const statusColor = (status: RequestRow["status"]) =>
        status === "approved" ? "green" : status === "rejected" ? "red" : "gold";

    return (
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div>
                <Card
                    title={
                        <Space>
                            <MailOutlined />
                            <span>Compose Request</span>
                        </Space>
                    }
                    style={{ marginBottom: 24, borderRadius: 12 }}
                >
                        <Space direction="vertical" size={14} style={{ width: "100%" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                <Select
                                    value={requestType}
                                    onChange={changeType}
                                    options={[
                                        { value: "leave", label: "Leave template" },
                                        { value: "permission", label: "Permission template" },
                                        { value: "custom", label: "Custom request" },
                                    ]}
                                />
                                <Input addonBefore="From" value={user?.email || "Your account email"} readOnly />
                            </div>

                            {/* Standard Email To Field */}
                            <EmailChipsInput
                                label="To"
                                required
                                emails={recipients}
                                onChange={setRecipients}
                                placeholder="Type approver email and press Enter (or comma / space)"
                            />

                            {/* Standard Email Cc Field */}
                            <EmailChipsInput
                                label="Cc"
                                emails={ccRecipients}
                                onChange={setCcRecipients}
                                placeholder="Type CC email and press Enter (optional)"
                            />

                            <Input
                                addonBefore="Subject"
                                value={subject}
                                onChange={(event) => setSubject(event.target.value)}
                                maxLength={200}
                                placeholder="Request subject"
                            />

                            {requestType === "leave" && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                                    <DatePicker value={startDate} onChange={setStartDate} placeholder="Leave start date" />
                                    <DatePicker value={endDate} onChange={setEndDate} placeholder="Leave end date" />
                                </div>
                            )}

                            {requestType === "permission" && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                                    <DatePicker value={startDate} onChange={setStartDate} placeholder="Permission date" />
                                    <TimePicker value={startTime} onChange={setStartTime} format="HH:mm" placeholder="From time" />
                                    <TimePicker value={endTime} onChange={setEndTime} format="HH:mm" placeholder="To time" />
                                </div>
                            )}

                            <TextArea
                                value={body}
                                onChange={(event) => setBody(event.target.value)}
                                rows={7}
                                placeholder={
                                    requestType === "leave"
                                        ? "Dear Manager,\n\nI would like to request leave because...\n\nThank you"
                                        : "Write your request message..."
                                }
                            />

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    gap: 12,
                                }}
                            >
                                <Text type="secondary">
                                    The email is sent by HRMS to all recipients and CCs. Approvers can decide directly from the email.
                                </Text>
                                <Button type="primary" icon={<SendOutlined />} onClick={submit} loading={sending}>
                                    Send request
                                </Button>
                            </div>
                        </Space>
                    </Card>

                    <Title level={4}>My requests</Title>
                    <Space direction="vertical" size={12} style={{ width: "100%" }}>
                        {rows.map((row) => (
                            <Card key={row.id} size="small" style={{ borderRadius: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                    <div>
                                        <Text strong style={{ fontSize: 15 }}>{row.subject}</Text>
                                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                                            <span style={{ fontSize: 13, color: "#475569" }}>
                                                <strong>To:</strong> {row.recipient_email}
                                            </span>
                                            {row.cc_email && (
                                                <span style={{ fontSize: 13, color: "#475569" }}>
                                                    • <strong>Cc:</strong> {row.cc_email}
                                                </span>
                                            )}
                                            <span style={{ fontSize: 12, color: "#94a3b8" }}>
                                                • {dayjs(row.created_at).format("DD MMM YYYY, HH:mm")}
                                            </span>
                                        </div>
                                    </div>
                                    <Tag color={statusColor(row.status)}>{row.status.toUpperCase()}</Tag>
                                </div>

                                {(row.start_date || row.start_time) && (
                                    <div style={{ marginTop: 8 }}>
                                        <Text type="secondary">
                                            {row.start_date}
                                            {row.end_date && row.end_date !== row.start_date ? ` — ${row.end_date}` : ""}
                                            {row.start_time ? ` • ${row.start_time.slice(0, 5)}—${row.end_time?.slice(0, 5)}` : ""}
                                        </Text>
                                    </div>
                                )}

                                <p style={{ whiteSpace: "pre-wrap", margin: "10px 0 0" }}>{row.body}</p>

                                {row.status === "rejected" && (
                                    <div
                                        style={{
                                            marginTop: 10,
                                            padding: "9px 13px",
                                            background: "#FEF2F2",
                                            border: "1px solid #FCA5A5",
                                            borderRadius: 8,
                                        }}
                                    >
                                        <Text strong style={{ color: "#DC2626", display: "block", marginBottom: 2 }}>
                                            Reason for Rejection:
                                        </Text>
                                        <Text style={{ color: "#991B1B", whiteSpace: "pre-wrap" }}>
                                            {row.decision_note || "No reason specified."}
                                        </Text>
                                    </div>
                                )}

                                {row.status === "approved" && row.decision_note && (
                                    <div
                                        style={{
                                            marginTop: 10,
                                            padding: "9px 13px",
                                            background: "#F0FDF4",
                                            border: "1px solid #86EFAC",
                                            borderRadius: 8,
                                        }}
                                    >
                                        <Text strong style={{ color: "#16A34A", display: "block", marginBottom: 2 }}>
                                            Approval Note:
                                        </Text>
                                        <Text style={{ color: "#166534", whiteSpace: "pre-wrap" }}>
                                            {row.decision_note}
                                        </Text>
                                    </div>
                                )}
                            </Card>
                        ))}
                        {!loading && rows.length === 0 && <Text type="secondary">No requests sent yet.</Text>}
                    </Space>
                </div>
            </div>
    );
}
