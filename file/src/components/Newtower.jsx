import React, { useState } from 'react'
import { Icon } from '@iconify/react/dist/iconify.js'
import MasterLayout from '../masterLayout/MasterLayout'
import Breadcrumb from './Breadcrumb'

const Newtower = ({ onClose }) => {
    const [formData, setFormData] = useState({
        towerName: '',
        project: '',
        totalFloors: '',
        reraTowerId: ''
    })

    const projects = [
        { value: '', label: 'Select Project' },
        { value: 'binghatti-hills', label: 'Binghatti Hills' },
        { value: 'nyati-baner', label: 'Nyati Baner' },
        { value: 'default-project', label: 'Default Project' }
    ]

    const handleChange = (event) => {
        const { name, value } = event.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = (event) => {
        event.preventDefault()
        console.log('Save tower', formData)
        // TODO: submit form data to backend
        if (onClose) onClose()
    }

    return (
        <MasterLayout>
            <div className="container-fluid px-0">
                <Breadcrumb title="New Tower" />

                <div className="row gx-4">
                    <div className="col-12 mb-4">
                        <div className="d-flex align-items-center gap-3">
                            <span className="text-uppercase fw-semibold text-secondary">Step 1</span>
                            <h4 className="mb-0">All Project Towers</h4>
                        </div>
                    </div>
                </div>

                <div className="row gx-4">
                    <div className="col-12">
                        <div className="card radius-12 shadow-sm border-0">
                            <div className="card-body p-30">
                                <form onSubmit={handleSubmit}>
                                    <div className="d-flex justify-content-between align-items-center mb-4">
                                        <div>
                                            <h5 className="mb-0">Add New Tower</h5>
                                        </div>
                                        {onClose && (
                                            <button type="button" className="btn btn-icon btn-soft-dark" onClick={onClose}>
                                                <Icon icon="radix-icons:cross-2" className="icon" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="row gy-4">
                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label className="form-label fw-semibold text-dark">Tower Name <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                name="towerName"
                                                value={formData.towerName}
                                                onChange={handleChange}
                                                className="form-control form-control-lg"
                                                placeholder="Name"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label className="form-label fw-semibold text-dark">Project <span className="text-danger">*</span></label>
                                            <select
                                                name="project"
                                                value={formData.project}
                                                onChange={handleChange}
                                                className="form-control form-control-lg"
                                                required
                                            >
                                                {projects.map((project) => (
                                                    <option key={project.value} value={project.value} disabled={!project.value}>
                                                        {project.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label className="form-label fw-semibold text-dark">Total Floors <span className="text-danger">*</span></label>
                                            <input
                                                type="number"
                                                name="totalFloors"
                                                value={formData.totalFloors}
                                                onChange={handleChange}
                                                className="form-control form-control-lg"
                                                placeholder="Total Floors"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label className="form-label fw-semibold text-dark">RERA Tower ID</label>
                                            <input
                                                type="text"
                                                name="reraTowerId"
                                                value={formData.reraTowerId}
                                                onChange={handleChange}
                                                className="form-control form-control-lg"
                                                placeholder="Rera Tower Id"
                                            />
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <button type="submit" className="btn btn-primary px-30 py-12 radius-12">
                                            Save
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </MasterLayout>
    )
}

export default Newtower
