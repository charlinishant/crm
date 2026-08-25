import TableHeader from "./TableHeader"

const CallLater = ()=>{
    return(
    <>
   <div className="table-container">
    <TableHeader/>

  <table className="lead-table">
    <thead>
      <tr>
        <th></th>
        <th className="col-lead-id">LEAD ID</th>
        <th className="col-name">NAME</th>
        <th className="col-source">LAST SOURCE</th>
        <th className="col-stage">STAGE</th>
        <th className="col-date">RECEIVED ON</th>
        <th className="col-requirement">REQUIREMENT</th>
        <th className="col-tags">TAGS</th>
        <th className="col-action">ACTIONS</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><input type="checkbox"/></td>
        <td className="col-lead-id"># 10244</td>
        <td className="col-name">
          <span className="user-name">Nandhakumar</span>
          <span className="user-subtext">Tejas Sales</span>
        </td>
        <td className="col-source">Website_</td>
        <td className="col-stage"></td>
        <td className="col-date">
          Mar 22, 2026
          <span className="date-subtext">at 5:03 PM</span>
        </td>
        <td className="col-requirement">N/A</td>
        <td className="col-tags">Sell.Do Project Launch Campaign, website_, Website Searc...</td>
        <td className="col-action"><span className="action-icon">&#8942;</span></td>
      </tr>
      
      <tr>
        <td><input type="checkbox"/></td>
        <td className="col-lead-id"># 10166</td>
        <td className="col-name">
          <span className="user-name">Savyasachi</span>
          <span className="user-subtext">Tejas Sales</span>
        </td>
        <td className="col-source">Website_</td>
        <td className="col-stage"></td>
        <td className="col-date">
          Feb 23, 2026
          <span className="date-subtext">at 6:55 PM</span>
        </td>
        <td className="col-requirement">N/A</td>
        <td className="col-tags">Sell.Do Project Launch Campaign, website_, Website Searc...</td>
        <td className="col-action"><span className="action-icon">&#8942;</span></td>
      </tr>

      <tr>
        <td><input type="checkbox"/></td>
        <td className="col-lead-id"># 10128</td>
        <td className="col-name">
          <span className="user-name">Chetan Garg</span>
          <span className="user-subtext">Tejas Sales</span>
        </td>
        <td className="col-source">Website_</td>
        <td className="col-stage">Prospect</td>
        <td className="col-date">
          Feb 5, 2026
          <span className="date-subtext">at 3:25 PM</span>
        </td>
        <td className="col-requirement">N/A</td>
        <td className="col-tags">Sell.Do Project Launch Campaign, website_, Website Searc...</td>
        <td className="col-action"><span className="action-icon">&#8942;</span></td>
      </tr>
    </tbody>
  </table>

  <div className="pagination-container">
    <button className="pagination-btn">First</button>
    <button className="pagination-btn">Next &raquo;</button>
    <button className="pagination-btn">Last</button>
  </div>
</div>
    </>
    )
}
export default CallLater