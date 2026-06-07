import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUsers } from "../hook/useUsers.js";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const adminUserStyles = `
.admin-users-access {
  color: #1f2937;
  font-family: inherit;
}

.admin-users-access * {
  box-sizing: border-box;
}

.admin-users-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.admin-users-head h2 {
  margin: 0;
  color: #1f2937;
  font-size: 24px;
  font-weight: 800;
}

.admin-users-head p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}

.admin-users-search {
  width: min(360px, 100%);
  height: 44px;
  border: 1px solid #d9e2ef;
  border-radius: 8px;
  padding: 0 14px;
  color: #1f2937;
  outline: none;
  background: #ffffff;
}

.admin-users-search:focus {
  border-color: #6f42c1;
  box-shadow: 0 0 0 3px rgba(111, 66, 193, 0.12);
}

.admin-users-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.admin-user-stat {
  border: 1px solid #d9e2ef;
  border-radius: 10px;
  background: #ffffff;
  padding: 16px;
  box-shadow: 0 10px 28px rgba(31, 41, 55, 0.06);
}

.admin-user-stat span {
  display: block;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.admin-user-stat strong {
  display: block;
  margin-top: 6px;
  color: #1f2937;
  font-size: 26px;
  line-height: 1;
}

.admin-user-stat small {
  display: block;
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
}

.admin-users-card {
  border: 1px solid #d9e2ef;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(31, 41, 55, 0.06);
  overflow: hidden;
}

.admin-users-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid #d9e2ef;
}

.admin-users-card-head h3 {
  margin: 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 800;
}

.admin-users-card-head p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 13px;
}

.admin-status-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 16px 20px 4px;
}

.admin-status-tabs button {
  min-height: 40px;
  border: 1px solid #d9e2ef;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2937;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 600;
}

.admin-status-tabs button.active {
  border-color: #6f42c1;
  background: rgba(111, 66, 193, 0.1);
  color: #6f42c1;
}

.admin-users-table-wrap {
  padding: 10px 20px 20px;
  overflow-x: auto;
}

.admin-users-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 860px;
}

.admin-users-table th {
  border-bottom: 1px solid #d9e2ef;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  padding: 12px 10px;
  text-align: left;
  text-transform: uppercase;
}

.admin-users-table td {
  border-bottom: 1px solid #edf2f7;
  padding: 14px 10px;
  vertical-align: middle;
}

.admin-user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-user-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #eaf4ff;
  color: #2563eb;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex: 0 0 auto;
}

.admin-user-cell strong {
  display: block;
  color: #1f2937;
  font-size: 14px;
}

.admin-user-cell small,
.admin-users-muted {
  display: block;
  color: #64748b;
  font-size: 13px;
}

.admin-user-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 800;
}

.admin-user-badge.active {
  background: #eaf4ff;
  color: #2563eb;
}

.admin-user-badge.inactive {
  background: #f1f5f9;
  color: #64748b;
}

.admin-user-badge.role {
  background: rgba(111, 66, 193, 0.1);
  color: #6f42c1;
}

.admin-user-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.admin-user-btn {
  min-height: 38px;
  border: 1px solid #6f42c1;
  border-radius: 8px;
  background: #ffffff;
  color: #6f42c1;
  padding: 8px 13px;
  font-size: 13px;
  font-weight: 800;
}

.admin-user-btn.primary {
  background: #6f42c1;
  color: #ffffff;
}

.admin-user-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.admin-users-empty {
  padding: 34px;
  text-align: center;
  color: #64748b;
}

.admin-user-message {
  margin: 0 20px 12px;
  border: 1px solid rgba(37, 99, 235, 0.25);
  border-radius: 8px;
  background: #eff6ff;
  color: #1f2937;
  padding: 10px 12px;
  font-size: 13px;
}

.admin-user-drawer-wrap {
  position: fixed;
  inset: 0;
  z-index: 1050;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 42, 0.34);
}

.admin-user-drawer {
  width: min(760px, 100%);
  height: 100%;
  overflow-y: auto;
  background: #ffffff;
  box-shadow: -20px 0 45px rgba(15, 23, 42, 0.18);
}

.admin-user-detail-head {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 18px;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #d9e2ef;
}

.admin-user-avatar.large {
  width: 72px;
  height: 72px;
  font-size: 22px;
}

.admin-user-detail-head h3 {
  margin: 0;
  color: #1f2937;
  font-size: 24px;
  font-weight: 800;
}

.admin-user-detail-head p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}

.admin-user-close {
  width: 38px;
  height: 38px;
  border: 1px solid #d9e2ef;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2937;
  font-size: 22px;
  line-height: 1;
}

.admin-user-detail-body {
  padding: 24px;
}

.admin-user-score-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.admin-user-score-card {
  border: 1px solid #d9e2ef;
  border-radius: 10px;
  padding: 14px;
  background: #ffffff;
}

.admin-user-score-card span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.admin-user-score-card strong {
  display: block;
  margin-top: 6px;
  color: #1f2937;
  font-size: 18px;
}

.admin-user-section {
  border: 1px solid #d9e2ef;
  border-radius: 10px;
  background: #ffffff;
  margin-top: 16px;
  overflow: hidden;
}

.admin-user-section h4 {
  margin: 0;
  padding: 14px 16px;
  border-bottom: 1px solid #d9e2ef;
  color: #1f2937;
  font-size: 15px;
  font-weight: 800;
}

.admin-user-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  background: #d9e2ef;
}

.admin-user-detail-item {
  min-height: 76px;
  background: #ffffff;
  padding: 14px 16px;
}

.admin-user-detail-item span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.admin-user-detail-item strong {
  display: block;
  margin-top: 6px;
  color: #1f2937;
  font-size: 14px;
  word-break: break-word;
}

.admin-user-detail-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

@media (max-width: 900px) {
  .admin-users-head,
  .admin-users-card-head,
  .admin-user-detail-head {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .admin-users-stats,
  .admin-user-score-row,
  .admin-user-detail-grid {
    grid-template-columns: 1fr;
  }

  .admin-user-drawer {
    width: 100%;
  }
}
`;

const formatText = (value, fallback = "-") => {
  if (value === undefined || value === null || value === "") return fallback;

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getUserName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  `User #${user?.id || ""}`;

const getInitials = (name) =>
  String(name || "User")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

const getRoleKey = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/_/g, "-");

const getStatusLabel = (user) => (user?.isActive === false ? "Inactive" : "Active");

const UsersListLayer = () => {
  const { users, loading, error } = useUsers();
  const navigate = useNavigate();
  const [adminUsers, setAdminUsers] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [savingStatusId, setSavingStatusId] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    setAdminUsers(Array.isArray(users) ? users : []);
  }, [users]);

  useEffect(() => {
    if (!selectedUser) return;

    const latestUser = adminUsers.find((user) => user.id === selectedUser.id);
    if (latestUser) setSelectedUser(latestUser);
  }, [adminUsers, selectedUser]);

  const stats = useMemo(() => {
    const active = adminUsers.filter((user) => user.isActive !== false).length;
    const inactive = adminUsers.length - active;
    const sales = adminUsers.filter((user) => getRoleKey(user.role) === "sales").length;
    const admin = adminUsers.filter((user) => getRoleKey(user.role) === "admin").length;

    return {
      total: adminUsers.length,
      active,
      inactive,
      sales,
      admin,
    };
  }, [adminUsers]);

  const statusFilters = useMemo(
    () => [
      { key: "all", label: "All Users", count: stats.total },
      { key: "active", label: "Active", count: stats.active },
      { key: "inactive", label: "Inactive", count: stats.inactive },
      { key: "role-admin", label: "Admin", count: stats.admin },
      { key: "role-sales", label: "Sales", count: stats.sales },
      { key: "role-manager", label: "Manager", count: adminUsers.filter((user) => getRoleKey(user.role) === "manager").length },
      { key: "role-pre-sales", label: "Pre Sales", count: adminUsers.filter((user) => getRoleKey(user.role) === "pre-sales").length },
      { key: "role-post-sales", label: "Post Sales", count: adminUsers.filter((user) => getRoleKey(user.role) === "post-sales").length },
      { key: "role-agency-user", label: "Agency User", count: adminUsers.filter((user) => getRoleKey(user.role) === "agency-user").length },
      { key: "role-agent", label: "Agent", count: adminUsers.filter((user) => getRoleKey(user.role) === "agent").length },
    ],
    [adminUsers, stats]
  );

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return adminUsers.filter((user) => {
      const matchesFilter =
        selectedFilter === "all" ||
        (selectedFilter === "active" && user.isActive !== false) ||
        (selectedFilter === "inactive" && user.isActive === false) ||
        (selectedFilter.startsWith("role-") && getRoleKey(user.role) === selectedFilter.replace("role-", ""));

      if (!matchesFilter) return false;

      if (!query) return true;

      return [
        getUserName(user),
        user.email,
        user.phone,
        user.username,
        user.role,
        user.department,
        getStatusLabel(user),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [adminUsers, searchTerm, selectedFilter]);

  const updateUserStatus = async (user, nextStatus) => {
    setSavingStatusId(user.id);
    setStatusMessage("");

    try {
      const response = await fetch(`${API_URL}/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: nextStatus }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to update user status");

      const updatedUser = { ...user, ...result, isActive: result.isActive ?? nextStatus };
      setAdminUsers((current) =>
        current.map((item) => (item.id === user.id ? updatedUser : item))
      );
      setSelectedUser((current) =>
        current?.id === user.id ? { ...current, ...updatedUser } : current
      );
      setStatusMessage(`${getUserName(user)} status updated to ${nextStatus ? "Active" : "Inactive"}.`);
    } catch (err) {
      setStatusMessage(err.message || "Unable to update user status.");
    } finally {
      setSavingStatusId(null);
    }
  };

  const getUserDetailRows = (user) => [
    ["User ID", user.id],
    ["Status", getStatusLabel(user)],
    ["Role", formatText(user.role)],
    ["Department", formatText(user.department)],
    ["Username", user.username || "-"],
    ["Email", user.email || "-"],
    ["Primary Phone", user.phone || "-"],
    ["Secondary Phone", user.secondaryPhone || "-"],
    ["Time Zone", user.timeZone || "-"],
    ["Team ID", user.teamId || "-"],
    ["Linked URL", user.linkedUrl || "-"],
    ["Description", user.description || "-"],
  ];

  const getAccessRows = (user) => [
    ["Default Routing", user.defaultRouting ? "Enabled" : "Disabled"],
    ["Default Routing Rule", user.defaultRoutingRule ? "Enabled" : "Disabled"],
    ["Auto Roster", user.autoRoster ? "Enabled" : "Disabled"],
    ["Push Notification", user.pushNotification ? "Enabled" : "Disabled"],
    ["GPS Tracking", user.gpsTracking ? "Enabled" : "Disabled"],
  ];

  if (loading) return <div className="p-5 text-center">Data is Fetching...</div>;
  if (error) return <div className="p-5 text-danger text-center">{error}</div>;

  return (
    <div className="admin-users-access">
      <style>{adminUserStyles}</style>

      <div className="admin-users-head">
        <div>
          <h2>Admin Access Users</h2>
          <p>View all users, roles, departments, and access status in one clean admin view.</p>
        </div>
        <input
          className="admin-users-search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search users, roles, status..."
        />
      </div>

      <div className="admin-users-stats">
        <div className="admin-user-stat">
          <span>Total Users</span>
          <strong>{stats.total}</strong>
          <small>All admin access users</small>
        </div>
        <div className="admin-user-stat">
          <span>Active Users</span>
          <strong>{stats.active}</strong>
          <small>Can access CRM</small>
        </div>
        <div className="admin-user-stat">
          <span>Sales Users</span>
          <strong>{stats.sales}</strong>
          <small>Sales access role</small>
        </div>
        <div className="admin-user-stat">
          <span>Admin Users</span>
          <strong>{stats.admin}</strong>
          <small>Admin access role</small>
        </div>
      </div>

      <section className="admin-users-card">
        <div className="admin-users-card-head">
          <div>
            <h3>All User Details</h3>
            <p>{filteredUsers.length} users showing from {adminUsers.length} registered users</p>
          </div>
          <button
            type="button"
            className="admin-user-btn primary"
            onClick={() => navigate("/add-user")}
          >
            Add User
          </button>
        </div>

        <div className="admin-status-tabs" aria-label="Admin user status filters">
          {statusFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={selectedFilter === filter.key ? "active" : ""}
              onClick={() => setSelectedFilter(filter.key)}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        {statusMessage && <div className="admin-user-message">{statusMessage}</div>}

        <div className="admin-users-table-wrap">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Status</th>
                <th>Role</th>
                <th>Department</th>
                <th>Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <button
                        type="button"
                        className="admin-user-cell border-0 bg-transparent p-0 text-start"
                        onClick={() => setSelectedUser(user)}
                      >
                        <span className="admin-user-avatar">{getInitials(getUserName(user))}</span>
                        <span>
                          <strong>{getUserName(user)}</strong>
                          <small>@{user.username || "n/a"}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <span className={`admin-user-badge ${user.isActive === false ? "inactive" : "active"}`}>
                        {getStatusLabel(user)}
                      </span>
                    </td>
                    <td>
                      <span className="admin-user-badge role">{formatText(user.role)}</span>
                    </td>
                    <td>
                      <strong>{formatText(user.department)}</strong>
                    </td>
                    <td>
                      <span className="admin-users-muted">{user.email || "-"}</span>
                      <span className="admin-users-muted">{user.phone || "N/A"}</span>
                    </td>
                    <td>
                      <div className="admin-user-actions">
                        <button
                          type="button"
                          className="admin-user-btn"
                          onClick={() => setSelectedUser(user)}
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          className="admin-user-btn primary"
                          onClick={() => navigate(`/add-user?id=${user.id}`)}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">
                    <div className="admin-users-empty">No users match this filter.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedUser && (
        <div className="admin-user-drawer-wrap" onClick={() => setSelectedUser(null)}>
          <aside className="admin-user-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="admin-user-detail-head">
              <span className="admin-user-avatar large">{getInitials(getUserName(selectedUser))}</span>
              <div>
                <h3>{getUserName(selectedUser)}</h3>
                <p>{selectedUser.email || "-"} | {formatText(selectedUser.role)} | {getStatusLabel(selectedUser)}</p>
              </div>
              <button
                type="button"
                className="admin-user-close"
                aria-label="Close user details"
                onClick={() => setSelectedUser(null)}
              >
                x
              </button>
            </div>

            <div className="admin-user-detail-body">
              <div className="admin-user-score-row">
                <div className="admin-user-score-card">
                  <span>User Status</span>
                  <strong>{getStatusLabel(selectedUser)}</strong>
                </div>
                <div className="admin-user-score-card">
                  <span>Role</span>
                  <strong>{formatText(selectedUser.role)}</strong>
                </div>
                <div className="admin-user-score-card">
                  <span>Department</span>
                  <strong>{formatText(selectedUser.department)}</strong>
                </div>
              </div>

              <section className="admin-user-section">
                <h4>User Details</h4>
                <div className="admin-user-detail-grid">
                  {getUserDetailRows(selectedUser).map(([label, value]) => (
                    <div className="admin-user-detail-item" key={label}>
                      <span>{label}</span>
                      <strong>{value || "-"}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="admin-user-section">
                <h4>Access Status</h4>
                <div className="admin-user-detail-grid">
                  {getAccessRows(selectedUser).map(([label, value]) => (
                    <div className="admin-user-detail-item" key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <div className="admin-user-detail-actions">
                <button
                  type="button"
                  className="admin-user-btn"
                  disabled={savingStatusId === selectedUser.id}
                  onClick={() => updateUserStatus(selectedUser, selectedUser.isActive === false)}
                >
                  {savingStatusId === selectedUser.id
                    ? "Saving..."
                    : selectedUser.isActive === false
                      ? "Mark Active"
                      : "Mark Inactive"}
                </button>
                <button
                  type="button"
                  className="admin-user-btn primary"
                  onClick={() => navigate(`/add-user?id=${selectedUser.id}`)}
                >
                  Edit User
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default UsersListLayer;
