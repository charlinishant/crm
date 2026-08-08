import React, { useEffect, useMemo, useState } from "react";
import { Camera, Save } from "lucide-react";
import { getCurrentUserProfile, updateCurrentUserProfile } from "../services/userSalesApi";

const normalizePhoto = (value) => {
  if (!value) return "/assets/images/user.png";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return value.startsWith("/") ? value : `/${value}`;
};

const getName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  "Sales User";

const UserSalesProfile = ({ onProfileUpdated }) => {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({});
  const [photoPreview, setPhotoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    getCurrentUserProfile()
      .then((result) => {
        if (!isMounted) return;
        const nextUser = result.user || {};
        setUser(nextUser);
        setForm({
          firstName:nextUser.firstName || "",
          lastName:nextUser.lastName || "",
          username:nextUser.username || "",
          secondaryPhone:nextUser.secondaryPhone || "",
          timeZone:nextUser.timeZone || "",
          description:nextUser.description || "",
          linkedUrl:nextUser.linkedUrl || "",
          profilePhoto:nextUser.profilePhoto || "",
        });
        setPhotoPreview(normalizePhoto(nextUser.profilePhoto));
      })
      .catch((profileError) => setError(profileError.message || "Unable to load profile"))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const protectedFields = useMemo(() => ([
    ["User ID", user?.id ? `#${user.id}` : "-"],
    ["Primary email", user?.email || "-"],
    ["Primary phone", user?.phone || "-"],
    ["Role", user?.role || "-"],
    ["Department", user?.department || "-"],
    ["Team", user?.team?.name || (user?.teamId ? `Team #${user.teamId}` : "-")],
    ["Account status", user?.isActive === false ? "Inactive" : "Active"],
  ]), [user]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]:value }));
    setMessage("");
    setError("");
  };

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Profile photo must be PNG, JPG, or WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Profile photo must be 2 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateField("profilePhoto", reader.result);
      setPhotoPreview(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await updateCurrentUserProfile(form);
      const nextUser = result.user || {};
      setUser(nextUser);
      setForm((current) => ({ ...current, profilePhoto:nextUser.profilePhoto || current.profilePhoto }));
      setPhotoPreview(normalizePhoto(nextUser.profilePhoto));
      localStorage.setItem("authUser", JSON.stringify({ ...(JSON.parse(localStorage.getItem("authUser") || "null") || {}), ...nextUser }));
      onProfileUpdated?.(nextUser);
      setMessage("Profile updated successfully.");
    } catch (saveError) {
      setError(saveError.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <section className="sales-card"><div className="sales-empty">Loading profile...</div></section>;

  return (
    <section className="sales-card sales-profile-page">
      <div className="sales-card-head">
        <div>
          <h2>Profile</h2>
          <p>Personal details for {getName(user)}</p>
        </div>
      </div>

      {error && <div className="sales-visit-message error">{error}</div>}
      {message && <div className="sales-visit-message success">{message}</div>}

      <form className="sales-profile-form" onSubmit={submitProfile}>
        <div className="sales-profile-photo-panel">
          <img src={photoPreview || "/assets/images/user.png"} alt={getName(user)} />
          <label className="sales-profile-photo-btn">
            <Camera size={16} />
            Change photo
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhoto} />
          </label>
        </div>

        <div className="sales-profile-grid">
          <label><span>First name</span><input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} /></label>
          <label><span>Last name</span><input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} /></label>
          <label><span>Username</span><input value={form.username} onChange={(event) => updateField("username", event.target.value)} /></label>
          <label><span>Secondary phone</span><input value={form.secondaryPhone} onChange={(event) => updateField("secondaryPhone", event.target.value)} maxLength={10} /></label>
          <label><span>Time zone</span><input value={form.timeZone} onChange={(event) => updateField("timeZone", event.target.value)} placeholder="Asia/Kolkata" /></label>
          <label><span>Profile link</span><input value={form.linkedUrl} onChange={(event) => updateField("linkedUrl", event.target.value)} /></label>
          <label className="wide"><span>Description / bio</span><textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={4} /></label>
        </div>

        <div className="sales-profile-protected">
          {protectedFields.map(([label, value]) => (
            <div key={label}><span>{label}</span><strong>{value}</strong></div>
          ))}
        </div>

        <div className="sales-profile-actions">
          <button type="submit" className="sales-card-primary-btn" disabled={saving}>
            <Save size={15} /> {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default UserSalesProfile;
