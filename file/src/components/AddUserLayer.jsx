import { Icon } from '@iconify/react/dist/iconify.js';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const userFormStyles = `
.add-user-panel .user-card {
  max-width: 800px;
  margin: auto;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.add-user-panel .user-card-header {
  background: linear-gradient(135deg, #0d6efd, #3b82f6);
  color: white;
  padding: 20px;
}

.add-user-panel .user-card-header h5 {
  color: white;
  margin: 0 0 4px;
}

.add-user-panel .user-card-header p {
  color: rgba(255, 255, 255, 0.82);
  margin: 0;
}

.add-user-panel .user-card-body {
  padding: 24px;
}

.add-user-panel .avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.add-user-panel .avatar-wrapper {
  position: relative;
}

.add-user-panel .avatar-preview {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background-color: #f8fbff;
  background-size: cover;
  background-position: center;
  border: 4px solid #e6f0ff;
}

.add-user-panel .avatar-edit-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  background: #0d6efd;
  color: white;
  padding: 6px;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
}

.add-user-panel .form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.add-user-panel .form-group {
  display: flex;
  flex-direction: column;
}

.add-user-panel .form-group.full {
  grid-column: span 2;
}

.add-user-panel label {
  color: #25314c;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.add-user-panel input,
.add-user-panel select,
.add-user-panel textarea {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #dbeafe;
  outline: none;
  transition: 0.2s;
  width: 100%;
}

.add-user-panel textarea {
  min-height: 96px;
  resize: vertical;
}

.add-user-panel input:focus,
.add-user-panel select:focus,
.add-user-panel textarea:focus {
  border-color: #0d6efd;
  box-shadow: 0 0 0 2px rgba(13,110,253,0.1);
}

.add-user-panel .form-actions {
  grid-column: span 2;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.add-user-panel .btn-primary {
  background: #0d6efd;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
}

.add-user-panel .btn-primary:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.add-user-panel .btn-outline {
  border: 1px solid #0d6efd;
  color: #0d6efd;
  background: transparent;
  padding: 10px 20px;
  border-radius: 8px;
}

.add-user-panel .alert.success {
  background: #e6f4ea;
  color: #1e7e34;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 10px;
}

.add-user-panel .alert.error {
  background: #fdecea;
  color: #c82333;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 10px;
}

@media (max-width: 680px) {
  .add-user-panel .form-grid {
    grid-template-columns: 1fr;
  }

  .add-user-panel .form-group.full,
  .add-user-panel .form-actions {
    grid-column: span 1;
  }
}
`;

const emptyUserFormData = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    department: 'SALES',
    role: 'SALES',
    description: '',
};

const AddUserLayer = () => {

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editUserId = searchParams.get('id');
    const isEditMode = Boolean(editUserId);
    const [imagePreviewUrl, setImagePreviewUrl] = useState('');
    const [formData, setFormData] = useState(emptyUserFormData);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingUser, setIsLoadingUser] = useState(false);

    useEffect(() => {
        if (!isEditMode) {
            setFormData(emptyUserFormData);
            setImagePreviewUrl('');
            setMessage('');
            setError('');
            return;
        }

        const loadUser = async () => {
            setIsLoadingUser(true);
            setMessage('');
            setError('');

            try {
                const response = await fetch(`${API_URL}/users/${editUserId}`);
                const result = await response.json();

                if (!response.ok || !result || result === 'User not found') {
                    throw new Error(result?.message || result || 'Unable to load user details');
                }

                const emailKey = result.email?.trim().toLowerCase();
                const profilePhotos = JSON.parse(localStorage.getItem('userProfilePhotos') || '{}');

                setFormData({
                    firstName: result.firstName || '',
                    lastName: result.lastName || '',
                    username: result.username || '',
                    email: result.email || '',
                    phone: result.phone || '',
                    password: '',
                    department: result.department || 'SALES',
                    role: result.role || 'SALES',
                    description: result.description || '',
                });
                setImagePreviewUrl(profilePhotos[emailKey] || result.profilePhoto || '');
            } catch (err) {
                setError(err.message || 'Unable to load user details');
            } finally {
                setIsLoadingUser(false);
            }
        };

        loadUser();
    }, [API_URL, editUserId, isEditMode]);

    const saveProfilePhoto = (email, photo) => {
        if (!email || !photo) return;

        const photos = JSON.parse(localStorage.getItem('userProfilePhotos') || '{}');
        photos[email.trim().toLowerCase()] = photo;
        localStorage.setItem('userProfilePhotos', JSON.stringify(photos));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsSubmitting(true);

        try {
            const payload = { ...formData };

            if (isEditMode && !payload.password) {
                delete payload.password;
            }

            const response = await fetch(`${API_URL}/users${isEditMode ? `/${editUserId}` : ''}`, {
                method: isEditMode ? 'PATCH' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result?.message || result || 'Unable to create user');
            }

            saveProfilePhoto(payload.email, imagePreviewUrl);
            setMessage(isEditMode ? 'User updated successfully.' : 'User created successfully. They can now sign in with this email and password.');
            setFormData(emptyUserFormData);
            setImagePreviewUrl('');
            if (isEditMode) {
                navigate('/all-users');
            }
        } catch (err) {
            setError(err.message || 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <style>{userFormStyles}</style>
            <div className="add-user-panel">
                <div className="user-card">
                    <div className="user-card-header">
                        <h5>{isEditMode ? 'Update User' : 'Create User'}</h5>
                        <p>{isEditMode ? 'Edit system user details.' : 'Add admin, sales, pre-sales, or post-sales users.'}</p>
                    </div>
                    <div className="user-card-body">
                        <div className="avatar-section">
                            <div className="avatar-wrapper">
                                <input
                                    type="file"
                                    id="imageUpload"
                                    accept=".png, .jpg, .jpeg"
                                    hidden
                                    onChange={handleImageChange}
                                />
                                <div
                                    className="avatar-preview"
                                    style={{
                                        backgroundImage: imagePreviewUrl ? `url(${imagePreviewUrl})` : '',
                                    }}
                                />
                                <label htmlFor="imageUpload" className="avatar-edit-btn">
                                    <Icon icon="solar:camera-outline" className="icon" />
                                </label>
                            </div>
                        </div>

                        {message && (
                            <div className="alert success" role="alert">
                                {message}
                            </div>
                        )}
                        {error && (
                            <div className="alert error" role="alert">
                                {error}
                            </div>
                        )}

                        {isLoadingUser ? (
                            <div className="p-4 text-center">Loading user details...</div>
                        ) : (
                        <form className="form-grid" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="firstName">
                                    First Name <span className="text-danger-600">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    placeholder="Enter first name"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="lastName">Last Name</label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    placeholder="Enter last name"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="username">Username</label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Enter username"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">
                                    Email <span className="text-danger-600">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter email address"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="number">Phone</label>
                                <input
                                    type="tel"
                                    id="number"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Enter phone number"
                                    maxLength="10"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password">
                                    Password <span className="text-danger-600">*</span>
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Enter login password"
                                    minLength="8"
                                    required={!isEditMode}
                                />
                            </div>
                            {/* <div className="form-group">
                                <label htmlFor="depart">
                                    Department <span className="text-danger-600">*</span>
                                </label>
                                <select
                                    id="depart"
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                >
                                    <option value="PRE_SALES">Pre Sales</option>
                                    <option value="SALES">Sales</option>
                                    <option value="POST_SALES">Post Sales</option>
                                </select>
                            </div> */}
                            <div className="form-group">
                                <label htmlFor="desig">
                                    Designation <span className="text-danger-600">*</span>
                                </label>
                                <select
                                    id="desig"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                >
                                    <option value="SALES">Sales</option>
                                    <option value="PRE_SALES">Pre Sales</option>
                                    <option value="POST_SALES">Post Sales</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="AGENCY_USER">Agency User</option>
                                    <option value="AGENT">Agent</option>
                                </select>
                            </div>
                            <div className="form-group full">
                                <label htmlFor="desc">Description</label>
                                <textarea
                                    name="description"
                                    id="desc"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Write description..."
                                />
                            </div>
                            <div className="form-actions">
                                <button
                                    type="reset"
                                    className="btn-outline"
                                    onClick={() => {
                                        setMessage('');
                                        setError('');
                                        setFormData(emptyUserFormData);
                                        setImagePreviewUrl('');
                                        if (isEditMode) {
                                            navigate('/all-users');
                                        }
                                    }}
                                >
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary">
                                    {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AddUserLayer;
