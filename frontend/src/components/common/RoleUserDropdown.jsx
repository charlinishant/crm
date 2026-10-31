import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

// Global cache for role-scoped users to prevent redundant requests across multiple pickers on the same page
const userCache = new Map();
const cacheTimestamps = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Format a user's display name consistently across all CRM dropdowns.
 */
export const getUserDisplayName = (user) => {
  if (!user) return "";
  if (typeof user === "string") return user;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.name || user.displayName || user.username || user.email || (user.id ? `User #${user.id}` : "");
};

/**
 * Custom hook to fetch and cache users strictly scoped by role.
 * Role is required: 'SALES', 'CHANNEL_PARTNER', 'MANAGER', 'ADMIN'.
 * Filters strictly server-side — never returns users of other roles.
 */
export const useRoleUsers = (role, options = {}) => {
  const { includeAdmin = false, isActive = true, autoFetch = true } = options;
  const normalizedRole = String(role || "").trim().toUpperCase();

  const [users, setUsers] = useState(() => {
    if (!normalizedRole) return [];
    return userCache.get(`${normalizedRole}_${includeAdmin}`) || [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async (force = false) => {
    if (!normalizedRole) {
      console.warn("[useRoleUsers] Role parameter is required (e.g. 'SALES', 'CHANNEL_PARTNER').");
      setUsers([]);
      return [];
    }

    const cacheKey = `${normalizedRole}_${includeAdmin}`;
    const cached = userCache.get(cacheKey);
    const lastTime = cacheTimestamps.get(cacheKey) || 0;
    const now = Date.now();

    if (!force && cached && (now - lastTime < CACHE_TTL_MS)) {
      setUsers(cached);
      return cached;
    }

    try {
      setLoading(true);
      setError(null);
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5002/api";
      const token = localStorage.getItem("authToken");

      const queryParams = new URLSearchParams({
        role: normalizedRole,
        includeAdmin: includeAdmin ? "true" : "false",
        isActive: isActive ? "true" : "false",
      });

      const response = await fetch(`${apiUrl}/users/by-role?${queryParams.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        // Fallback to legacy GET /users?role=... if by-role endpoint had any network issue
        const fallbackUrl = `${apiUrl}/users?role=${encodeURIComponent(normalizedRole)}&limit=1000`;
        const fallbackResp = await fetch(fallbackUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!fallbackResp.ok) throw new Error(`Failed to fetch ${normalizedRole} users: ${response.status}`);
        const fallbackJson = await fallbackResp.json();
        const list = Array.isArray(fallbackJson) ? fallbackJson : fallbackJson?.data || fallbackJson?.users || [];
        userCache.set(cacheKey, list);
        cacheTimestamps.set(cacheKey, now);
        setUsers(list);
        return list;
      }

      const json = await response.json();
      const list = Array.isArray(json) ? json : json?.data || json?.users || [];
      userCache.set(cacheKey, list);
      cacheTimestamps.set(cacheKey, now);
      setUsers(list);
      return list;
    } catch (err) {
      console.error(`[useRoleUsers] Error loading ${normalizedRole} users:`, err);
      setError(err.message || "Failed to load users");
      return [];
    } finally {
      setLoading(false);
    }
  }, [normalizedRole, includeAdmin, isActive]);

  useEffect(() => {
    if (autoFetch && normalizedRole) {
      fetchUsers();
    }
  }, [autoFetch, normalizedRole, fetchUsers]);

  return { users, loading, error, refetch: () => fetchUsers(true) };
};

/**
 * Reusable Role-Aware User Dropdown.
 *
 * Guarantees server-side role scoping:
 * - When role="SALES": lists ONLY SALES and PRE_SALES users. Excludes CHANNEL_PARTNER and ADMIN.
 * - When role="CHANNEL_PARTNER": lists ONLY registered Channel Partners.
 *
 * Supported modes:
 * - "menu": In-table popover menu with search input and button options (as seen in lead assignment cells).
 * - "select": Standard HTML <select> form control (for modals and create forms).
 * - "searchable-select": Custom trigger button with floating searchable dropdown.
 */
const RoleUserDropdown = ({
  role,
  value,
  onChange,
  mode = "select",
  placeholder,
  searchPlaceholder,
  includeUnassigned = false,
  unassignedLabel = "Unassigned",
  unassignedValue = "",
  disabled = false,
  className = "",
  style = {},
  id,
  name,
  required = false,
  autoFocus = false,
  filterFn,
  onClose,
  isOpen = false,
  includeAdmin = false,
}) => {
  if (!role) {
    console.error(
      "[RoleUserDropdown] The 'role' prop is strictly required. Pass role='SALES' or role='CHANNEL_PARTNER' to prevent role leaks."
    );
  }

  const { users, loading } = useRoleUsers(role, { includeAdmin });
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef(null);

  const normalizedRole = String(role || "").toUpperCase();
  const defaultPlaceholder =
    placeholder ||
    (normalizedRole === "CHANNEL_PARTNER"
      ? "Select Channel Partner"
      : normalizedRole === "SALES"
      ? "Select Sales Executive"
      : "Select User");

  const defaultSearchPlaceholder =
    searchPlaceholder ||
    (normalizedRole === "CHANNEL_PARTNER"
      ? "Search Channel Partner..."
      : normalizedRole === "SALES"
      ? "Search team..."
      : "Search user...");

  // Filter users based on optional custom filterFn and local search query
  const filteredUsers = useMemo(() => {
    let list = Array.isArray(users) ? users : [];
    if (typeof filterFn === "function") {
      list = list.filter(filterFn);
    }
    const q = searchTerm.trim().toLowerCase();
    if (!q) return list;
    return list.filter((user) => {
      const name = getUserDisplayName(user).toLowerCase();
      const email = String(user?.email || "").toLowerCase();
      const phone = String(user?.phone || "");
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [users, filterFn, searchTerm]);

  // Selected user lookup
  const selectedUser = useMemo(() => {
    if (value === null || value === undefined || value === "") return null;
    return (
      users.find(
        (u) =>
          String(u.id) === String(value) ||
          String(u._id) === String(value) ||
          (u.username && u.username === value) ||
          (u.name && u.name === value)
      ) || null
    );
  }, [users, value]);

  // Close when clicking outside in searchable-select mode
  useEffect(() => {
    if (mode !== "searchable-select" || !dropdownOpen) return;
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [dropdownOpen, mode]);

  // ==========================================
  // MODE 1: "menu" (In-table popover dropdown)
  // Matches exact CSS classes: .lead-team-menu, .lead-team-search, .lead-team-options
  // ==========================================
  if (mode === "menu") {
    return (
      <div
        className={`lead-team-menu ${className}`.trim()}
        style={style}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          type="search"
          className="lead-team-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={defaultSearchPlaceholder}
          autoFocus={autoFocus}
        />
        <div className="lead-team-options">
          {includeUnassigned && (
            <button
              type="button"
              className={!value ? "active" : ""}
              onClick={() => {
                if (onChange) onChange(unassignedValue, null);
                if (onClose) onClose();
              }}
            >
              {unassignedLabel}
            </button>
          )}

          {loading ? (
            <div className="lead-team-empty">Loading {normalizedRole.toLowerCase()}...</div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const userId = String(user.id);
              const isSelected = String(value) === userId;
              return (
                <button
                  type="button"
                  key={user.id || user.email || user.username}
                  className={isSelected ? "active" : ""}
                  onClick={() => {
                    if (onChange) onChange(userId, user);
                    if (onClose) onClose();
                  }}
                >
                  {getUserDisplayName(user)}
                </button>
              );
            })
          ) : (
            <div className="lead-team-empty">
              {searchTerm ? "No matching users" : `No ${normalizedRole.toLowerCase()} users found`}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // MODE 2: "searchable-select" (Custom input trigger + popover)
  // ==========================================
  if (mode === "searchable-select") {
    const displayText = selectedUser
      ? getUserDisplayName(selectedUser)
      : value
      ? String(value)
      : defaultPlaceholder;

    return (
      <div
        ref={containerRef}
        className={`role-user-dropdown-container position-relative ${className}`.trim()}
        style={{ width: "100%", ...style }}
      >
        <button
          type="button"
          disabled={disabled || loading}
          className="form-select text-start d-flex justify-content-between align-items-center"
          onClick={() => setDropdownOpen((prev) => !prev)}
        >
          <span className={!selectedUser && !value ? "text-muted" : "text-dark"}>
            {loading ? "Loading..." : displayText}
          </span>
          <span className="dropdown-caret ms-2" style={{ fontSize: "10px" }}>
            ▼
          </span>
        </button>

        {dropdownOpen && (
          <div
            className="lead-team-menu"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              width: "100%",
              zIndex: 3000,
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              borderRadius: "4px",
              background: "#fff",
            }}
          >
            <input
              type="search"
              className="lead-team-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={defaultSearchPlaceholder}
              autoFocus
            />
            <div className="lead-team-options" style={{ maxHeight: "240px", overflowY: "auto" }}>
              {includeUnassigned && (
                <button
                  type="button"
                  className={!value ? "active" : ""}
                  onClick={() => {
                    if (onChange) onChange(unassignedValue, null);
                    setDropdownOpen(false);
                  }}
                >
                  {unassignedLabel}
                </button>
              )}
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const userId = String(user.id);
                  const isSelected = String(value) === userId;
                  return (
                    <button
                      type="button"
                      key={user.id || user.email}
                      className={isSelected ? "active" : ""}
                      onClick={() => {
                        if (onChange) onChange(userId, user);
                        setDropdownOpen(false);
                      }}
                    >
                      {getUserDisplayName(user)}
                    </button>
                  );
                })
              ) : (
                <div className="lead-team-empty">No users found</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // MODE 3: "select" (Standard HTML <select> element)
  // ==========================================
  return (
    <select
      id={id}
      name={name}
      required={required}
      disabled={disabled || loading}
      className={`form-select ${className}`.trim()}
      style={style}
      value={value || ""}
      onChange={(e) => {
        const selectedId = e.target.value;
        const matched = users.find((u) => String(u.id) === String(selectedId)) || null;
        if (onChange) onChange(selectedId, matched);
      }}
    >
      <option value="">{loading ? "Loading..." : defaultPlaceholder}</option>
      {includeUnassigned && <option value={unassignedValue}>{unassignedLabel}</option>}
      {filteredUsers.map((user) => (
        <option key={user.id || user.email || user.username} value={user.id}>
          {getUserDisplayName(user)}
        </option>
      ))}
    </select>
  );
};

export default RoleUserDropdown;

