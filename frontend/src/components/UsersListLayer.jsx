import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUsers } from "../hook/useUsers.js";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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
  const RECORDS_PER_PAGE = 10;
  const { users, loading, error } = useUsers();
  const navigate = useNavigate();
  const [adminUsers, setAdminUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [savingStatusId, setSavingStatusId] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionUserId, setOpenActionUserId] = useState(null);

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

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return adminUsers.filter((user) => {
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
  }, [adminUsers, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / RECORDS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (activePage - 1) * RECORDS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(pageStartIndex, pageStartIndex + RECORDS_PER_PAGE);
  const pageEndIndex = Math.min(pageStartIndex + paginatedUsers.length, filteredUsers.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, adminUsers.length]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    const closeMenu = () => setOpenActionUserId(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

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

  const deleteUser = async (user) => {
    setOpenActionUserId(null);
    if (!window.confirm(`Delete ${getUserName(user)}?`)) return;
    setStatusMessage("");

    try {
      const response = await fetch(`${API_URL}/users/${user.id}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => "");
      if (!response.ok) throw new Error(result?.message || result || "Unable to delete user");

      if (result?.user) {
        setAdminUsers((current) => current.map((item) => item.id === user.id ? result.user : item));
        setSelectedUser((current) => current?.id === user.id ? result.user : current);
        setStatusMessage(result.message || `${getUserName(user)} deactivated successfully.`);
      } else {
        setAdminUsers((current) => current.filter((item) => item.id !== user.id));
        setSelectedUser((current) => current?.id === user.id ? null : current);
        setStatusMessage(`${getUserName(user)} deleted successfully.`);
      }
    } catch (err) {
      setStatusMessage(err.message || "Unable to delete user.");
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
      
      
      {/* <div className="admin-users-head">
        <div>
          <h2>Admin Access Users</h2>
          <p>View all users, roles, departments, and access status in one clean admin view.</p>
        </div>
      </div> */}

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

        {statusMessage && <div className="admin-user-message">{statusMessage}</div>}

        <label className="crm-table-search">
          <span aria-hidden="true">🔍</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search users, roles, status..."
            aria-label="Search users"
          />
        </label>

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
                paginatedUsers.map((user) => (
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
                          className="admin-user-action-menu-btn"
                          aria-label={`Actions for ${getUserName(user)}`}
                          aria-expanded={openActionUserId === user.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenActionUserId((current) => current === user.id ? null : user.id);
                          }}
                        >
                          ⋮
                        </button>
                        {openActionUserId === user.id && (
                          <div className="admin-user-action-menu" onClick={(event) => event.stopPropagation()}>
                            <button type="button" onClick={() => {
                              setSelectedUser(user);
                              setOpenActionUserId(null);
                            }}>
                              Details
                            </button>
                            <button type="button" onClick={() => navigate(`/add-user?id=${user.id}`)}>
                              Edit
                            </button>
                            <button type="button" className="danger" onClick={() => deleteUser(user)}>
                              Delete
                            </button>
                          </div>
                        )}
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

        {filteredUsers.length > 0 && (
          <div className="admin-users-pagination">
            <div className="admin-users-pagination-info">
              Showing <strong>{pageStartIndex + 1}</strong> to <strong>{pageEndIndex}</strong> of{" "}
              <strong>{filteredUsers.length}</strong> users
            </div>
            <div className="admin-users-pagination-actions">
              <button
                type="button"
                className="admin-users-pagination-btn"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={activePage === 1}
              >
                Previous
              </button>
              <span className="admin-users-pagination-page">
                {activePage} / {totalPages}
              </span>
              <button
                type="button"
                className="admin-users-pagination-btn"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={activePage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
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
                  {getUserDetailRows(selectedUser).map(([label,value]) => (
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
