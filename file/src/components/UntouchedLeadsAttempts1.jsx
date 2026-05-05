
import './NewEnquiries.css';
import TableHeader from './TableHeader';

const UntouchedLeadsAttempts1 = () => {
  return (
   <div className="missed-call-container">
    <TableHeader/>

  <div className="info-panel">
    <p>0 items. Sorted by Lead received on</p>
  </div>

  <div className="table-header-row">
    <div className="col-checkbox"><input type="checkbox" disabled /></div>
    <div className="col-item">LEAD ID</div>
    <div className="col-item">NAME</div>
    <div className="col-item">LAST SOURCE</div>
    <div className="col-item">STAGE</div>
    <div className="col-item">RECEIVED ON</div>
    <div className="col-item">REQUIREMENT</div>
    <div className="col-item">TAGS</div>
    <div className="col-item actions-header">
      ACTIONS
      <div className="sort-icons">
        <span>▲</span>
        <span>▼</span>
      </div>
    </div>
  </div>

  <div className="empty-data-row">
    We couldn't find anything relevant for you.
  </div>

  <div className="pagination-wrapper">
    <div className="arrow-group">
      <div className="page-arrow"><i className="fa fa-chevron-left"></i></div>
      <div className="page-arrow right-arrow"><i className="fa fa-chevron-right"></i></div>
    </div>
    <div className="nav-buttons">
      <button className="nav-btn">First</button>
      <button className="nav-btn">Last</button>
    </div>
  </div>
</div>
  );
};

export default UntouchedLeadsAttempts1;