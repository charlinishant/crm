import { Icon } from '@iconify/react/dist/iconify.js';
import React from 'react';
import { Link } from 'react-router-dom';
import { useUsers } from "../hook/useUsers.js";

const UsersListLayer = () => {

    const { users, loading, error } = useUsers();

    if (loading) return <div className="p-5 text-center">Data is Fetching...</div>;
    if (error) return <div className="p-5 text-danger text-center">{error}</div>;

    return (
        <div className="users-list-wrapper">
            <div className="list-header">
                <h3>System Users</h3>
                <p>Total Registered Users: {users.length}</p>
            </div>

            <div className="table-responsive">
                <table className="table table-custom">
                    <thead>
                        <tr>
                            <th>User Name</th>
                            <th>Email Address</th>
                            <th>Contact</th>
                            <th>Role</th>
                            <th>Department</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length > 0 ? (
                            users.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <strong>{user.firstName} {user.lastName}</strong>
                                        <br />
                                        <small className="text-muted">@{user.username || 'n/a'}</small>
                                    </td>
                                    <td>{user.email}</td>
                                    <td>{user.phone || 'N/A'}</td>
                                    <td>
                                        <span className={`badge badge-${user.role?.toLowerCase()}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>{user.department}</td>
                                    <td>
                                        <button className="">Edit</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center"></td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};



export default UsersListLayer;