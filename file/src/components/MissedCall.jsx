
import './MissedCall.css';
import TableHeader from "./TableHeader"

const MissedCall = () => {

  
  return (


  <div className="table-container">
   <TableHeader/>

    <div className="table-info">
      <p>1 items. Sorted by Most recent missed call</p>
    </div>

    <div className="table-columns">
      <div className="checkbox-col">
        <input type="checkbox" disabled />
      </div>
      <div className="table-th">LEAD ID</div>
      <div className="table-th">NAME</div>
      <div className="table-th">LAST SOURCE</div>
      <div className="table-th">STAGE</div>
      <div className="table-th">RECEIVED ON</div>
      <div className="table-th">REQUIREMENT</div>
      <div className="table-th">TAGS</div>
      <div className="table-th actions-th">
        ACTIONS
        <div className="sort-icons">
          <span>▲</span>
          <span>▼</span>
        </div>
      </div>
    </div>

    <div className="table-row">
      <div className="checkbox-col">
        <input type="checkbox" />
      </div>
      <div className="table-td lead-id"># 10150</div>
      <div className="table-td name-col">
        <span className="name-bold">Akhila</span>
        <span className="name-sub">Tejas Sales</span>
      </div>
      <div className="table-td">Website_</div>
      <div className="table-td stage-val">Booked</div>
      <div className="table-td">
        <div className="date-time">
          <div>Feb 16, 2026</div>
          <div className="time-sub">at 3:17 PM</div>
        </div>
      </div>
      <div className="table-td">N/A</div>
      <div className="table-td tags-col">
        Sell.Do Project Launch Campaign, website_, Website Search, ...
      </div>
      <div className="table-td actions-col">
        <i className="fa-solid fa-ellipsis-vertical more-icon"></i>
      </div>
    </div>

    <div className="pagination-bottom-wrapper">
      <div className="left-controls">
        <div className="pagination-arrows">
          <i className="fa-solid fa-chevron-left arrow-icon"></i>
        </div>
        <div className="pagination-arrows right-arrow">
          <i className="fa-solid fa-chevron-right arrow-icon"></i>
        </div>
      </div>
      <div className="pagination-buttons">
        <button className="page-btn">First</button>
        <button className="page-btn">Last</button>
      </div>
    </div>
  </div>
  )
}
export default MissedCall;