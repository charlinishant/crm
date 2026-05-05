import React, { useEffect, useState } from 'react'
import { Icon } from '@iconify/react/dist/iconify.js'
import { useNavigate } from 'react-router-dom'

const Projecttower = () => {
    const navigate = useNavigate()
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000'
    const [towers, setTowers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchTowers = async () => {
            try {
                const response = await fetch(`${API_URL}/projects`)
                if (!response.ok) {
                    throw new Error('Unable to fetch tower data')
                }
                const data = await response.json()
                const mapped = data.map((project) => ({
                    id: project.id,
                    name: project.name || 'Unknown',
                    project: project.locality || project.city || project.state || project.country || project.projectType || 'Unknown',
                    floorPlans: project.noOfTowers ?? 0,
                    totalFloors: project.reraProjectId ?? project.noOfTowers ?? 0,
                }))
                setTowers(mapped)
            } catch (err) {
                console.error(err)
                setError(err.message || 'Failed to load towers')
            } finally {
                setLoading(false)
            }
        }

        fetchTowers()
    }, [API_URL])

    return (
        <div>
            <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
                <div>
                    <h6 className="text-lg fw-semibold mb-0">Project Towers</h6>
                    <p className="text-sm text-secondary mb-0">Manage all towers with project, floor plans, and total floors.</p>
                </div>
                <button type="button" className="btn btn-primary text-sm btn-sm px-16 py-10 radius-8 d-flex align-items-center gap-2" onClick={() => navigate('/new-tower')}>
                    <Icon icon="ic:baseline-add" className="icon text-xl line-height-1" />
                    New Tower
                </button>
            </div>
            <div className="card-body p-0">
                <table className="table bordered-table sm-table mb-0" style={{ width: '100%' }}>
                    <thead style={{ backgroundColor: '#0d6efd', color: '#ffffff' }}>
                        <tr>
                            <th scope="col" className="text-uppercase fw-semibold text-white" style={{ backgroundColor: '#0d6efd', color: '#ffffff' }}>NAME</th>
                            <th scope="col" className="text-uppercase fw-semibold text-white" style={{ backgroundColor: '#0d6efd', color: '#ffffff' }}>PROJECT</th>
                            <th scope="col" className="text-uppercase fw-semibold text-white" style={{ backgroundColor: '#0d6efd', color: '#ffffff' }}>FLOOR PLANS</th>
                            <th scope="col" className="text-uppercase fw-semibold text-white" style={{ backgroundColor: '#0d6efd', color: '#ffffff' }}>TOTAL FLOORS</th>
                            <th scope="col" className="text-uppercase fw-semibold text-white text-end" style={{ backgroundColor: '#0d6efd', color: '#ffffff' }}>ACTIONS</th>
                        </tr>
                    </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-20 text-secondary">
                                        Loading tower data...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-20 text-danger">
                                        {error}
                                    </td>
                                </tr>
                            ) : towers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-20 text-secondary">
                                        No towers found.
                                    </td>
                                </tr>
                            ) : (
                                towers.map((tower) => (
                                    <tr key={tower.id}>
                                        <td className="fw-semibold">{tower.name}</td>
                                        <td className="fw-semibold">{tower.project}</td>
                                        <td className="fw-semibold">{tower.floorPlans}</td>
                                        <td className="fw-semibold">{tower.totalFloors}</td>
                                        <td className="text-end">
                                            <button type="button" className="btn btn-soft-dark btn-sm px-12 py-8 radius-8">
                                                <Icon icon="lucide:more-vertical" className="icon text-lg" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
    )
}

export default Projecttower