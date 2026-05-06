import React, { useState } from 'react';
import { Plus, Filter, MoreVertical, Layers, Building, Trash2 } from 'lucide-react';
import './Projecttower.css';

const initialTowerData = [
  { id: 1, name: 'TOWER D', project: 'Binghatti Hills', floorPlans: 27, totalFloors: 36 },
  { id: 2, name: 'TOWER E', project: 'Binghatti Hills', floorPlans: 5, totalFloors: 30 },
  { id: 3, name: 'Aa', project: 'Binghatti Hills', floorPlans: 2, totalFloors: 1 },
  { id: 4, name: 'A', project: 'Binghatti Hills', floorPlans: 3, totalFloors: 1 },
  { id: 5, name: 'Default Tower', project: 'Nyati Baner', floorPlans: 1, totalFloors: 1 },
  { id: 6, name: 'Towe', project: 'Binghatti Hills', floorPlans: 1, totalFloors: 1 },
  { id: 7, name: 'Default Tower', project: 'Lodha Greens', floorPlans: 2, totalFloors: 1 },
  { id: 8, name: 'Default Tower', project: 'ABC', floorPlans: 1, totalFloors: 1 },
  { id: 9, name: 'Default Tower', project: 'Vasant utsav', floorPlans: 1, totalFloors: 1 },
  { id: 10, name: 'T1', project: 'Binghatti Hills', floorPlans: 1, totalFloors: 22 },
  { id: 11, name: 'Default Tower', project: 'Adhinn PG', floorPlans: 2, totalFloors: 1 },
];

export default function Projecttower() {
  const [towers, setTowers] = useState(initialTowerData);
  const [name, setName] = useState('');
  const [project, setProject] = useState('');
  const [floorPlans, setFloorPlans] = useState('');
  const [totalFloors, setTotalFloors] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !project) return;

    const newTower = {
      id: Date.now(),
      name,
      project,
      floorPlans: parseInt(floorPlans) || 1,
      totalFloors: parseInt(totalFloors) || 1,
    };

    setTowers([newTower, ...towers]);
    
    // Reset individual fields after adding
    setName('');
    setProject('');
    setFloorPlans('');
    setTotalFloors('');
  };

  const handleDelete = (id) => {
    const updatedTowers = towers.filter((tower) => tower.id !== id);
    setTowers(updatedTowers);
  };

  return (
    <div className="tower-dashboard">
      <div className="dashboard-container">
        
        {/* Left Side: Tower List Grid */}
        <div className="list-column">
          <div className="list-header">
            <div>
              <h2>Towers</h2>
              <span className="item-count">{towers.length} active projects and towers available.</span>
            </div>
            <div className="action-wrapper">
              <button className="btn-filter" title="Filter Towers">
                <Filter size={18} />
              </button>
            </div>
          </div>

          <div className="tower-grid">
            {towers.map((tower) => (
              <div key={tower.id} className="tower-item-card">
                <div className="tower-item-header">
                  <div className="tower-title-section">
                    <Building className="building-icon" size={20} />
                    <div>
                      <h4 className="tower-name">{tower.name}</h4>
                      <p className="tower-project">{tower.project}</p>
                    </div>
                  </div>
                  
                  <div className="card-actions">
                    <button className="btn-action" onClick={() => handleDelete(tower.id)} title="Delete Tower">
                      <Trash2 size={16} />
                    </button>
                    <button className="btn-action">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>

                <div className="tower-metrics">
                  <div className="metric-box">
                    <Layers size={16} className="metric-icon" />
                    <div>
                      <span className="metric-label">Floor Plans</span>
                      <span className="metric-value">{tower.floorPlans}</span>
                    </div>
                  </div>
                  <div className="metric-box">
                    <Building size={16} className="metric-icon" />
                    <div>
                      <span className="metric-label">Total Floors</span>
                      <span className="metric-value">{tower.totalFloors}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Form Fields Section */}
        <div className="form-column">
          <div className="card-header">
            <h3>Add New Tower</h3>
            <p>Create a new tower and map it to a project.</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Tower Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. TOWER F"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Project Name *</label>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="e.g. Binghatti Hills"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label>Floor Plans</label>
                <input
                  type="number"
                  value={floorPlans}
                  onChange={(e) => setFloorPlans(e.target.value)}
                  placeholder="1"
                />
              </div>
              
              <div className="form-group half">
                <label>Total Floors</label>
                <input
                  type="number"
                  value={totalFloors}
                  onChange={(e) => setTotalFloors(e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="form-footer">
              <button type="submit" className="btn-primary">
                <Plus size={16} /> Save Tower
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}