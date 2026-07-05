import { Icon } from "@iconify/react/dist/iconify.js";
import React, { useMemo, useState } from "react";

const getStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem("authUser") || "null") || {};
    } catch {
        return {};
    }
};

const getDisplayName = (user) =>
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    user?.email ||
    "User";

const getInitials = (name) =>
    String(name || "U")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "U";

const getProfilePhoto = (user) => {
    if (user?.profilePhoto) return user.profilePhoto;
    if (!user?.email) return "";

    try {
        const profilePhotos = JSON.parse(localStorage.getItem("userProfilePhotos") || "{}");
        return profilePhotos[String(user.email).trim().toLowerCase()] || "";
    } catch {
        return "";
    }
};

const ViewProfileLayer = () => {
    const storedUser = useMemo(getStoredUser, []);
    const displayName = getDisplayName(storedUser);
    const [imagePreview, setImagePreview] = useState(getProfilePhoto(storedUser));
    const [formData, setFormData] = useState({
        fullName: displayName,
        email: storedUser.email || "",
        phone: storedUser.phone || "",
        department: storedUser.department || "",
        designation: storedUser.role || "",
    });
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({ ...current, [name]: value }));
    };

    const readURL = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            const nextImage = readerEvent.target.result;
            setImagePreview(nextImage);

            if (storedUser.email) {
                const emailKey = String(storedUser.email).trim().toLowerCase();
                const profilePhotos = JSON.parse(localStorage.getItem("userProfilePhotos") || "{}");
                localStorage.setItem(
                    "userProfilePhotos",
                    JSON.stringify({ ...profilePhotos, [emailKey]: nextImage })
                );
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="profile-modern-layout">
            <aside className="profile-modern-summary">
                <div className="profile-modern-avatar">
                    {imagePreview ? (
                        <img src={imagePreview} alt={displayName} />
                    ) : (
                        <span>{getInitials(displayName)}</span>
                    )}
                    <label htmlFor="profileImageUpload" className="profile-modern-camera">
                        <Icon icon="solar:camera-outline" className="icon" />
                    </label>
                    <input
                        type="file"
                        id="profileImageUpload"
                        accept=".png, .jpg, .jpeg"
                        hidden
                        onChange={readURL}
                    />
                </div>

                <h3>{displayName}</h3>
                <p>{storedUser.email || "No email added"}</p>

                <div className="profile-modern-badges">
                    <span>{storedUser.role || "Team Member"}</span>
                    <span>{storedUser.department || "CRM"}</span>
                </div>

                <div className="profile-modern-info">
                    <div>
                        <span>Email</span>
                        <strong>{storedUser.email || "-"}</strong>
                    </div>
                    <div>
                        <span>Phone</span>
                        <strong>{storedUser.phone || "-"}</strong>
                    </div>
                    <div>
                        <span>Department</span>
                        <strong>{storedUser.department || "-"}</strong>
                    </div>
                    <div>
                        <span>Role</span>
                        <strong>{storedUser.role || "-"}</strong>
                    </div>
                </div>
            </aside>

            <section className="profile-modern-card">
                <ul className="nav profile-modern-tabs nav-pills" id="pills-tab" role="tablist">
                    <li className="nav-item" role="presentation">
                        <button
                            className="nav-link active"
                            id="pills-edit-profile-tab"
                            data-bs-toggle="pill"
                            data-bs-target="#pills-edit-profile"
                            type="button"
                            role="tab"
                            aria-controls="pills-edit-profile"
                            aria-selected="true"
                        >
                            Edit Profile
                        </button>
                    </li>
                    <li className="nav-item" role="presentation">
                        <button
                            className="nav-link"
                            id="pills-change-password-tab"
                            data-bs-toggle="pill"
                            data-bs-target="#pills-change-password"
                            type="button"
                            role="tab"
                            aria-controls="pills-change-password"
                            aria-selected="false"
                            tabIndex={-1}
                        >
                            Change Password
                        </button>
                    </li>
                </ul>

                <div className="tab-content" id="pills-tabContent">
                    <div
                        className="tab-pane fade show active"
                        id="pills-edit-profile"
                        role="tabpanel"
                        aria-labelledby="pills-edit-profile-tab"
                        tabIndex={0}
                    >
                        <div className="profile-modern-header">
                            <div>
                                <h4>Profile Details</h4>
                                <p>Manage your CRM account information.</p>
                            </div>
                        </div>

                        <form action="#" className="profile-modern-form">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label htmlFor="fullName">Full Name</label>
                                    <input
                                        type="text"
                                        id="fullName"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        placeholder="Enter full name"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label htmlFor="email">Email</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="Enter email address"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label htmlFor="phone">Phone</label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="Enter phone number"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label htmlFor="department">Department</label>
                                    <input
                                        type="text"
                                        id="department"
                                        name="department"
                                        value={formData.department}
                                        onChange={handleInputChange}
                                        placeholder="Enter department"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label htmlFor="designation">Designation</label>
                                    <input
                                        type="text"
                                        id="designation"
                                        name="designation"
                                        value={formData.designation}
                                        onChange={handleInputChange}
                                        placeholder="Enter designation"
                                    />
                                </div>
                            </div>
                            <div className="profile-modern-actions">
                                <button type="button" className="profile-modern-secondary">
                                    Cancel
                                </button>
                                <button type="button" className="profile-modern-primary">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>

                    <div
                        className="tab-pane fade"
                        id="pills-change-password"
                        role="tabpanel"
                        aria-labelledby="pills-change-password-tab"
                        tabIndex={0}
                    >
                        <div className="profile-modern-header">
                            <div>
                                <h4>Security</h4>
                                <p>Update your account password.</p>
                            </div>
                        </div>
                        <div className="profile-modern-form">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label htmlFor="your-password">New Password</label>
                                    <div className="profile-modern-password">
                                        <input
                                            type={passwordVisible ? "text" : "password"}
                                            id="your-password"
                                            placeholder="Enter new password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setPasswordVisible((current) => !current)}
                                            aria-label="Toggle new password visibility"
                                        >
                                            <Icon icon={passwordVisible ? "ri:eye-off-line" : "ri:eye-line"} />
                                        </button>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <label htmlFor="confirm-password">Confirm Password</label>
                                    <div className="profile-modern-password">
                                        <input
                                            type={confirmPasswordVisible ? "text" : "password"}
                                            id="confirm-password"
                                            placeholder="Confirm password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setConfirmPasswordVisible((current) => !current)}
                                            aria-label="Toggle confirm password visibility"
                                        >
                                            <Icon icon={confirmPasswordVisible ? "ri:eye-off-line" : "ri:eye-line"} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="profile-modern-actions">
                                <button type="button" className="profile-modern-primary">
                                    Update Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ViewProfileLayer;
