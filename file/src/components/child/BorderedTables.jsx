import React, { useEffect, useRef, useState } from 'react'

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const getUserName = (user) =>
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.email ||
    (user?.id ? `User #${user.id}` : "");

const BorderedTables = () => {
    const fileInputRef = useRef(null)
    const [attachments, setAttachments] = useState([])
    const [users, setUsers] = useState([])
    const [isLoadingUsers, setIsLoadingUsers] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState("")
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        dueDate: "",
        dueTime: "2:00 PM",
        assigneeId: "",
        remark: "",
        priority: "Medium",
    })

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setIsLoadingUsers(true)
                const response = await fetch(`${API_URL}/users?limit=100`)
                if (!response.ok) throw new Error("Unable to load users")

                const result = await response.json()
                const userList = Array.isArray(result) ? result : result?.data || result?.users || []
                setUsers(userList)
                setFormData((current) => ({
                    ...current,
                    assigneeId: current.assigneeId || (userList[0]?.id ? String(userList[0].id) : ""),
                }))
            } catch (error) {
                console.error("Unable to load users:", error)
                setUsers([])
            } finally {
                setIsLoadingUsers(false)
            }
        }

        fetchUsers()
    }, [])

    const handleChange = (event) => {
        const { name, value } = event.target
        setFormData((current) => ({ ...current, [name]: value }))
    }

    const handleUploadClick = () => {
        fileInputRef.current?.click()
    }

    const handleAttachmentChange = (event) => {
        setAttachments(Array.from(event.target.files || []))
    }

    const handleRemoveAttachment = (fileName) => {
        setAttachments((currentAttachments) =>
            currentAttachments.filter((file) => file.name !== fileName)
        )

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleSave = async () => {
        if (!formData.title.trim() || !formData.assigneeId) {
            setMessage("Please add title and assignee.")
            return
        }

        const authUser = JSON.parse(window.localStorage.getItem("authUser") || "null")
        const assignedBy = getUserName(authUser) || "Admin"
        const selectedUser = users.find((user) => String(user.id) === String(formData.assigneeId))

        const newTask = {
            title: formData.title.trim(),
            description: formData.description.trim(),
            remark: formData.remark.trim(),
            type: "Follow up",
            assigneeId: Number(formData.assigneeId),
            assigneeName: getUserName(selectedUser),
            assignedById: authUser?.id || null,
            assignedByName: assignedBy,
            status: "Open",
            priority: formData.priority,
            dueDate: formData.dueDate || null,
            dueTime: formData.dueTime,
            attachments: attachments.map((file) => file.name),
        }

        setIsSaving(true)
        setMessage("")

        try {
            const response = await fetch(`${API_URL}/tasks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newTask),
            })

            let result = {}
            try {
                result = await response.json()
            } catch {
                result = {}
            }

            if (!response.ok) {
                throw new Error(result?.message || "Unable to save task")
            }

            setMessage(`Task assigned to ${getUserName(selectedUser)}.`)
            setAttachments([])
            setFormData({
                title: "",
                description: "",
                dueDate: "",
                dueTime: "2:00 PM",
                assigneeId: users[0]?.id ? String(users[0].id) : "",
                remark: "",
                priority: "Medium",
            })

            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        } catch (error) {
            console.error("Unable to save task:", error)
            setMessage(error.message || "Unable to save task.")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="col-12">
            <div className="new-task-panel">
                <div className="new-task-header">
                    <h5 className="new-task-title">New Task</h5>
                </div>

                <form className="new-task-form">
                    <div className="new-task-field">
                        <label htmlFor="taskTitle">
                            TITLE <span>*</span>
                        </label>
                        <input
                            id="taskTitle"
                            name="title"
                            type="text"
                            value={formData.title}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="new-task-field">
                        <label htmlFor="taskDescription">DESCRIPTION</label>
                        <textarea
                            id="taskDescription"
                            name="description"
                            rows="5"
                            value={formData.description}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="new-task-field">
                        <label>DUE ON</label>
                        <div className="new-task-date-row">
                            <input
                                type="date"
                                name="dueDate"
                                value={formData.dueDate}
                                onChange={handleChange}
                            />
                            <input
                                type="text"
                                name="dueTime"
                                value={formData.dueTime}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="new-task-field">
                        <label htmlFor="taskAssignee">
                            ASSIGNEE <span>*</span>
                        </label>
                        <select
                            id="taskAssignee"
                            name="assigneeId"
                            value={formData.assigneeId}
                            onChange={handleChange}
                            disabled={isLoadingUsers}
                        >
                            <option value="">
                                {isLoadingUsers ? "Loading users..." : "Select user"}
                            </option>
                            {users.map((user) => (
                                <option key={user.id || user.email} value={user.id}>
                                    {getUserName(user)}
                                    {user.role ? ` (${user.role})` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="new-task-field">
                        <label htmlFor="taskRemark">REMARK</label>
                        <textarea
                            id="taskRemark"
                            name="remark"
                            rows="5"
                            value={formData.remark}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="new-task-field">
                        <label htmlFor="taskPriority">
                            PRIORITY <span>*</span>
                        </label>
                        <select
                            id="taskPriority"
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                        >
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        className="new-task-file-input"
                        multiple
                        onChange={handleAttachmentChange}
                    />

                    <button
                        type="button"
                        className="new-task-upload"
                        onClick={handleUploadClick}
                    >
                        Upload attachments
                    </button>

                    {attachments.length > 0 && (
                        <div className="new-task-attachments">
                            {attachments.map((file) => (
                                <div className="new-task-attachment" key={file.name}>
                                    <span>{file.name}</span>
                                    <button
                                        type="button"
                                        aria-label={`Remove ${file.name}`}
                                        onClick={() => handleRemoveAttachment(file.name)}
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </form>

                <div className="new-task-footer">
                    {message && <span className="new-task-message">{message}</span>}
                    <button type="button" className="new-task-save" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>

            <style>{`
                .new-task-panel {
                    background: #fff;
                    border: 1px solid #d7dde4;
                    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
                    max-width: 925px;
                    overflow: hidden;
                }

                .new-task-header {
                    align-items: center;
                    background: #487fff;
                    display: flex;
                    height: 61px;
                    justify-content: flex-start;
                    padding: 0 10px;
                }

                .new-task-title {
                    color: #fff;
                    font-size: 25px;
                    font-weight: 400;
                    line-height: 1;
                    margin: 0;
                }

                .new-task-form {
                    padding: 18px 34px 46px 9px;
                }

                .new-task-field {
                    margin-bottom: 36px;
                }

                .new-task-field label {
                    color: #7d8792;
                    display: block;
                    font-size: 14px;
                    font-weight: 400;
                    line-height: 1;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                }

                .new-task-field label span {
                    color: #ff3b30;
                }

                .new-task-field input,
                .new-task-field select,
                .new-task-field textarea {
                    background-color: #fff;
                    border: 1px solid #cbd3dc;
                    border-radius: 4px;
                    color: #3d4651;
                    font-size: 18px;
                    outline: none;
                    padding: 0 15px;
                    width: 100%;
                }

                .new-task-field input,
                .new-task-field select {
                    height: 54px;
                }

                .new-task-field textarea {
                    min-height: 148px;
                    padding-bottom: 12px;
                    padding-top: 12px;
                    resize: vertical;
                }

                .new-task-field input:focus,
                .new-task-field select:focus,
                .new-task-field textarea:focus {
                    border-color: #9aa8b8;
                    box-shadow: 0 0 0 3px rgba(102, 102, 102, 0.1);
                }

                .new-task-date-row {
                    display: grid;
                    gap: 38px;
                    grid-template-columns: 1fr 1fr;
                }

                .new-task-date-row input {
                    background-color: #e9edf2;
                }

                .new-task-date-row input::placeholder {
                    color: #8a939e;
                    opacity: 1;
                }

                .new-task-field select {
                    appearance: auto;
                    background-color: #fff;
                }

                .new-task-upload {
                    background: #fff;
                    border: 1px solid #6b2ee6;
                    border-radius: 4px;
                    color: #4f22bd;
                    font-size: 14px;
                    height: 30px;
                    line-height: 1;
                    padding: 0 20px;
                }

                .new-task-file-input {
                    display: none;
                }

                .new-task-attachments {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: 12px;
                }

                .new-task-attachment {
                    align-items: center;
                    background: #f2f5ff;
                    border: 1px solid #d7e0ff;
                    border-radius: 4px;
                    color: #3d4651;
                    display: inline-flex;
                    font-size: 13px;
                    gap: 8px;
                    max-width: 100%;
                    min-height: 30px;
                    padding: 4px 8px 4px 10px;
                }

                .new-task-attachment span {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .new-task-attachment button {
                    align-items: center;
                    background: transparent;
                    border: 0;
                    color: #6b2ee6;
                    display: inline-flex;
                    font-size: 18px;
                    height: 20px;
                    justify-content: center;
                    line-height: 1;
                    padding: 0;
                    width: 20px;
                }

                .new-task-footer {
                    align-items: center;
                    background: #666;
                    display: flex;
                    height: 61px;
                    justify-content: flex-end;
                    gap: 14px;
                    padding: 0 18px;
                }

                .new-task-message {
                    color: #fff;
                    font-size: 14px;
                }

                .new-task-save {
                    background: #6b2ee6;
                    border: 0;
                    border-radius: 4px;
                    color: #fff;
                    font-size: 14px;
                    height: 30px;
                    line-height: 1;
                    padding: 0 20px;
                }

                @media (max-width: 767px) {
                    .new-task-panel {
                        max-width: none;
                    }

                    .new-task-form {
                        padding: 16px;
                    }

                    .new-task-date-row {
                        gap: 16px;
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    )
}

export default BorderedTables
