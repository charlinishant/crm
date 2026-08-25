import { Icon } from '@iconify/react/dist/iconify.js';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

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

const departmentByRole = {
    PRE_SALES: 'PRE_SALES',
    SALES: 'SALES',
    POST_SALES: 'POST_SALES',
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
                setImagePreviewUrl(result.profilePhoto || '');
            } catch (err) {
                setError(err.message || 'Unable to load user details');
            } finally {
                setIsLoadingUser(false);
            }
        };

        loadUser();
    }, [API_URL, editUserId, isEditMode]);

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
            const payload = {
                ...formData,
                department: departmentByRole[formData.role] || null,
                profilePhoto: imagePreviewUrl || null,
            };

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

            window.alert(isEditMode ? 'User updated successfully!' : 'User created successfully! They can now sign in with this email and password.');
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
                                    <option value="CHANNEL_PARTNER">Channel Partner</option>
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
