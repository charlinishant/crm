import { Phone, Grid3X3, Filter} from 'lucide-react';
import "./TableHeader.css"
const TableHeader = ()=>{
    return(
      
    <>
      {/* Header Section */}
        <div className="header-section">
          <div className="select-wrapper">
            <select className="select-dropdown">
              <option>Missed Followups</option>
              <option>Today's Followups</option>
              <option>All Leads</option>
              <option>New Enquiries</option>
              <option>Missed Followups</option>
              <option>Missed Call</option>
              <option>Unread Emails</option>
            </select>
            <span className="select-arrow">▼</span>
          </div>

          <div className="actions-group">
            <button className="action-btn">
              <Phone className="w-5 h-5" />
            </button>
            <button className="new-lead-btn">
              New Lead
            </button>
            <button className="action-btn">
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button className="action-btn badge-wrapper">
              <Filter className="w-5 h-5" />
              <span className="badge">1</span>
            </button>
          </div>
        </div>
    </>
    )
}
export default TableHeader;