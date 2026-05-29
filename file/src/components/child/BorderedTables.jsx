import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import '../../pages/addLead.css';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const getUserName = (user) =>
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.email ||
    (user?.id ? `User #${user.id}` : "");

const BorderedTables = () => {
    const navigate = useNavigate()
    const fileInputRef = useRef(null)
    const [attachments, setAttachments] = useState([])
    const [users, setUsers] = useState([])
    const [isLoadingUsers, setIsLoadingUsers] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState("")
    const [formData, setFormData] = useState({
        "title":"",
        "description":"",
        "remark":"",
        "type":"",
        "status":"",
        "priority":"",
        "dueDate":null,
        "dueTime":"",
        "assigneeId":"",
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

    const handleSave = async (event) => {
        event?.preventDefault()
        if (!formData.title.trim() || !formData.assigneeId) {
            setMessage("Please add title and assignee.")
            return
        }

        const authUser = JSON.parse(window.localStorage.getItem("authUser") || "null")
        const selectedUser = users.find((user) => String(user.id) === String(formData.assigneeId))

        const newTask = {
            title: formData.title.trim(),
            description: formData.description.trim(),
            remark: formData.remark.trim(),
            status: "Open",
            priority: formData.priority,
            dueDate: formData.dueDate || null,
            dueTime: formData.dueTime,
            attachments: attachments.map((file) => file.name),
            assigneeId: Number(formData.assigneeId),
            assignedById: authUser?.id || null,
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
                dueTime: "",
                assigneeId: "",
                remark: "",
                priority: "Medium",
            })

            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
            navigate("/all-tasks")
        } catch (error) {
            console.error("Unable to save task:", error)
            setMessage(error.message || "Unable to save task.")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="col-12">
            <div className="lead-page task-lead-page">
                <div className="lead-container">
                    <p className="lead-title">New Task</p>

                    <div className="lead-tabs">
                        <button type="button" className="active">Task Details</button>
                    </div>

                    {message && <div className="unit-alert">{message}</div>}

                    <form className="lead-form" onSubmit={handleSave}>
                        <div className="section-wrapper">
                            <div className="section-header">
                                <span className="section-header-label">Basic Details</span>
                            </div>

                            <div className="section-card">
                                <div className="lead-grid">
                                    <div className="lead-group">
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

                                    <div className="lead-group">
                                        <label>DUE DATE</label>
                                        <input
                                            type="date"
                                            name="dueDate"
                                            value={formData.dueDate || ""}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="lead-group">
                                        <label>DUE TIME</label>
                                        <input
                                            type="time"
                                            name="dueTime"
                                            value={formData.dueTime}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="lead-group">
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

                                    <div className="lead-group">
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
                                </div>
                            </div>
                        </div>

                        <div className="section-wrapper">
                            <div className="section-header">
                                <span className="section-header-label">Notes</span>
                            </div>

                            <div className="section-card">
                                <div className="lead-group lead-full">
                                    <label htmlFor="taskDescription">DESCRIPTION</label>
                                    <textarea
                                        id="taskDescription"
                                        name="description"
                                        rows="5"
                                        value={formData.description}
                                        onChange={handleChange}
                                        className="lead-comment task-comment"
                                    />
                                </div>

                                <div className="lead-group lead-full">
                                    <label htmlFor="taskRemark">REMARK</label>
                                    <textarea
                                        id="taskRemark"
                                        name="remark"
                                        rows="5"
                                        value={formData.remark}
                                        onChange={handleChange}
                                        className="lead-comment task-comment"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="section-wrapper">
                            <div className="section-header">
                                <span className="section-header-label">Attachments</span>
                                <button
                                    type="button"
                                    className="section-add-btn"
                                    onClick={handleUploadClick}
                                >
                                    Upload attachments
                                </button>
                            </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                                className="task-file-input"
                        multiple
                        onChange={handleAttachmentChange}
                    />

                    {attachments.length > 0 && (
                                <div className="section-card task-attachments">
                            {attachments.map((file) => (
                                        <div className="task-attachment" key={file.name}>
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
                        </div>

                        <div className="lead-buttons">
                            <button type="submit" className="lead-save" disabled={isSaving}>
                                {isSaving ? "Saving..." : "Save"}
                            </button>
                            <button type="button" className="lead-cancel" onClick={() => navigate("/all-tasks")}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>

        </div>
    )
}

export default BorderedTables
