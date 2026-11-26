// App.tsx
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Review_Tasks from "./components/admin/tasks/Employee_Tasks/Review_Tasks";
import Approved_Request_Admin from "./components/admin/requests/Approved_Request_Admin";
import Rejected_Request_Admin from "./components/admin/requests/Rejected_Request_Admin";
import Reports_Admin from "./components/admin/insights/Reports_Admin";
import Audit_History_Admin from "./components/admin/insights/Audit_History_Admin";
import Approved_Request_Employee from "./components/employee/requests/Approved_Request_Employee";
import Rejected_Request_Employee from "./components/employee/requests/Rejected_Request_Employee";
import Reports_Employee from "./components/employee/insights/Reports_Employee";
import Audit_History_Employee from "./components/employee/insights/Audit_History_Employee";
import Pending_Time_Correction_Request from "./components/admin/requests/Pending_Time_Correction_Request";
import All_Task_Admin from "./components/admin/tasks/Employee_Tasks/All_Task_Admin";
import Completed_Task_Admin from "./components/admin/tasks/Employee_Tasks/Completed_Task_Admin";
import Cancel_Task_Admin from "./components/admin/tasks/Employee_Tasks/Cancel_Task_Admin";
import Admin_Dashboard from "./components/admin/Admin_Dashboard";
import Departments_Admin from "./components/admin/Departments_Admin";
import Employee_Dashboard from "./components/employee/Employee_Dashboard";
import Team_Access from "./components/admin/Team_Access";
import Rework_Tasks from "./components/admin/tasks/Employee_Tasks/Rework_Tasks";
import Open_Tasks from "./components/admin/tasks/Employee_Tasks/Open_Tasks";
import Overdue_Tasks from "./components/admin/tasks/Employee_Tasks/Overdue_Tasks";
import Completed_Tasks_Employee from "./components/employee/tasks/Completed_Tasks_Employee";
import Submitted_Tasks_Employee from "./components/employee/tasks/Submitted_Tasks_Employee";
import All_Task_Employee from "./components/employee/tasks/All_Task_Employee";
import EmployeeJiraTasks from "./components/employee/tasks/EmployeeJiraTasks";
import My_Task_Admin from "./components/admin/tasks/My_Tasks/My_Task_Admin";
import My_Submitted_Task_Admin from "./components/admin/tasks/My_Tasks/My_Submitted_Task_Admin";
import My_Completed_Task_Admin from "./components/admin/tasks/My_Tasks/My_Completed_Task_Admin";
import Upcoming_Scheduled_Tasks_Admin from "./components/admin/tasks/Employee_Tasks/Upcoming_Scheduled_Tasks_Admin";
import My_Upcoming_Task_Admin from "./components/admin/tasks/My_Tasks/My_Upcoming_Task_Admin";
import Employee_Upcoming_Tasks from "./components/employee/tasks/Employee_Upcoming_Tasks";
import Attendance_Admin from "./components/admin/attendance/Attendance_Admin";
import Attendance_Employee from "./components/employee/attendance/Attendance_Employee";
import EmployeeRequests from "./components/requests/EmployeeRequests";
import AdminRequests from "./components/requests/AdminRequests";
import Performance_Report from "./components/common/Performance_Report";
import Header from "./components/common/Header";


// Shared shell: Sidebar on the left, page content on the right.
// Every admin page and every employee page renders inside this.
function DashboardLayout({ role }: { role: "admin" | "employee" }) {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("hrms_sidebar_collapsed") === "true";
  });

  useEffect(() => {
    try {
      if (location.pathname.toLowerCase().replace(/\/$/, "") !== "/admin/departments") {
        sessionStorage.removeItem("admin-departments-board-view-v2");
      }
    } catch { /* Ignore storage restrictions; department navigation should still work. */ }
  }, [location.pathname]);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("hrms_sidebar_collapsed", String(next));
      return next;
    });
  };

  if (!user) return null; // ProtectedRoute guarantees this won't render without a user, but satisfies TS

  return (
    <div className={`db-root ${collapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        role={role}
        userName={user.name}
        collapsed={collapsed}
        onToggle={toggleSidebar}
      />
      <div className="db-main">
        <Header
          role={role}
          userName={user.name}
          sidebarCollapsed={collapsed}
          onToggleSidebar={toggleSidebar}
        />
        <main className="db-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
// Decides where "/" sends someone, based on whether they're logged in and their role.
function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/employee/dashboard"} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Admin-only */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route element={<DashboardLayout role="admin" />}>
              <Route path="/admin/dashboard" element={<Admin_Dashboard />} />
              <Route path="/admin/departments" element={<Departments_Admin />} />
              <Route path="/admin/attendance" element={<Attendance_Admin />} />
              <Route path="/admin/requests" element={<AdminRequests />} />
              <Route path="/admin/my_tasks" element={<My_Task_Admin />} />
              <Route path="/admin/my_upcoming_tasks" element={<My_Upcoming_Task_Admin />} /> {/* <-- ADD THIS */}
              <Route path="/admin/my_submitted_tasks" element={<My_Submitted_Task_Admin />} />
              <Route path="/admin/my_completed_tasks" element={<My_Completed_Task_Admin />} />
              <Route path="/admin/all_tasks" element={<All_Task_Admin />} />
              <Route path="admin/open_tasks" element={<Open_Tasks />} />
              <Route path="admin/overdue_tasks" element={<Overdue_Tasks />} />
              <Route path="/admin/rework_tasks" element={<Rework_Tasks />} />
              <Route path="/admin/review_tasks" element={<Review_Tasks />} />
              <Route path="/admin/completed_tasks" element={<Completed_Task_Admin />} />
              <Route path="/admin/cancel_tasks" element={<Cancel_Task_Admin />} />

              <Route path="/admin/approved_requests" element={<Approved_Request_Admin />} />
              <Route path="/admin/rejected_requests" element={<Rejected_Request_Admin />} />
              <Route path="/admin/pending_time_correction_requests" element={<Pending_Time_Correction_Request />} />
              <Route path="/admin/reports" element={<Reports_Admin />} />
              <Route path="/admin/performance" element={<Performance_Report role="admin" />} />
              <Route path="/admin/audit_history" element={<Audit_History_Admin />} />
              <Route path="/admin/team_access" element={<Team_Access />} />
              <Route path="/admin/upcoming_scheduled_tasks" element={<Upcoming_Scheduled_Tasks_Admin />} /> {/* <-- ADD THIS */}

            </Route>
          </Route>

          {/* Employee-only */}
          <Route element={<ProtectedRoute allowedRoles={["employee"]} />}>
            <Route element={<DashboardLayout role="employee" />}>
              <Route path="/employee/dashboard" element={<Employee_Dashboard />} />
              <Route path="/employee/normal_tasks" element={<EmployeeJiraTasks mode="normal" pageTitle="Normal Tasks" />} />
              <Route path="/employee/recurring_tasks" element={<EmployeeJiraTasks mode="recurring" pageTitle="Recurring Tasks" />} />
              <Route path="/employee/attendance" element={<Attendance_Employee />} />
              <Route path="/employee/requests" element={<EmployeeRequests />} />
              <Route path="/employee/all_tasks" element={<All_Task_Employee />} />
              <Route path="/employee/my_upcoming_tasks" element={<Employee_Upcoming_Tasks />} /> {/* <-- ADD THIS */}
              <Route path="/employee/submitted_tasks" element={<Submitted_Tasks_Employee />} />
              <Route path="/employee/completed_tasks" element={<Completed_Tasks_Employee />} />
              <Route path="/employee/approved_requests" element={<Approved_Request_Employee />} />
              <Route path="/employee/rejected_requests" element={<Rejected_Request_Employee />} />
              <Route path="/employee/reports" element={<Reports_Employee />} />
              <Route path="/employee/performance" element={<Performance_Report role="employee" />} />
              <Route path="/employee/audit_history" element={<Audit_History_Employee />} />
            </Route>
          </Route>

          {/* "/" and unknown URLs */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

