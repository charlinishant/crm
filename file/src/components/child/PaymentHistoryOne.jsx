import React from "react";
import { Link } from "react-router-dom";

const PaymentHistoryOne = ({ leads = [] }) => {
  return (
    <div className="table-section">
      <p>Lead Data</p>

      <table>
        <thead>
          <tr>
            <th>Lead</th>
            <th>origin</th>
            <th>Dialler</th>
            <th>Lead Owner</th>
            <th>Stage</th>
            <th>Product</th>
          </tr>
        </thead>

        <tbody>
          {leads.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: "center" }}>
                No Data Available
              </td>
            </tr>
          ) : (
            leads.map((lead, i) => (
              <tr key={i}>
                <td>{lead.name || "-"}</td>
                <td>{lead.mobile || "-"}</td>
                <td>{lead.email || "-"}</td>
                <td>{lead.project || "-"}</td>
                <td>{lead.status || "-"}</td>
                <td>{lead.city || "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
         <div className='card radius-16 mt-24'>
      <div className='card-header'>
        <div className='d-flex align-items-center flex-wrap gap-2 justify-content-between'>
          <Link
            to='#'
            className='text-primary-600 hover-text-primary d-flex align-items-center gap-1'
          >
            View All
            <iconify-icon
              icon='solar:alt-arrow-right-linear'
              className='icon'
            />
          </Link>
        </div>
      </div>
      <div className='card-body'>
        <div className='table-responsive scroll-sm'>
          <table className='table bordered-table sm-table mb-0'>
            <thead>
              <tr>
                <th scope='col'>Lead </th>
                <th scope='col' className='text-center'>
                  Origin
                </th>
                <th scope='col' className='text-center'>
                  Dialler
                </th>
                <th scope='col' className='text-center'>
                  Lead Owner
                </th>
                <th scope='col' className='text-center'>
                  Payment Method
                </th>
                <th scope='col' className='text-center'>
                  Date
                </th>
                <th scope='col' className='text-center'>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className=''>
                  <div className='d-flex align-items-center'>
                    <img
                      src='assets/images/users/user1.png'
                      alt=''
                      className='w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden'
                    />
                    <div className='flex-grow-1'>
                      <h6 className='text-md mb-0 fw-medium'>Dianne Russell</h6>
                    </div>
                  </div>
                </td>
                <td className='text-center'>osgoodwy@gmail.com</td>
                <td className='text-center'>9562415412263</td>
                <td className='text-center'>$29.00</td>
                <td className='text-center'>Bank</td>
                <td className='text-center'>24 Jun 2024</td>
                <td className='text-center'>
                  <span className='bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm'>
                    Active
                  </span>
                </td>
              </tr>
              <tr>
                <td className=''>
                  <div className='d-flex align-items-center'>
                    <img
                      src='assets/images/users/user2.png'
                      alt=''
                      className='w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden'
                    />
                    <div className='flex-grow-1'>
                      <h6 className='text-md mb-0 fw-medium'>Wade Warren</h6>
                    </div>
                  </div>
                </td>
                <td className='text-center'>redaniel@gmail.com</td>
                <td className='text-center'>9562415412263</td>
                <td className='text-center'>$29.00</td>
                <td className='text-center'>Bank</td>
                <td className='text-center'>24 Jun 2024</td>
                <td className='text-center'>
                  <span className='bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm'>
                    Active
                  </span>
                </td>
              </tr>
              <tr>
                <td className=''>
                  <div className='d-flex align-items-center'>
                    <img
                      src='assets/images/users/user3.png'
                      alt=''
                      className='w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden'
                    />
                    <div className='flex-grow-1'>
                      <h6 className='text-md mb-0 fw-medium'>Albert Flores</h6>
                    </div>
                  </div>
                </td>
                <td className='text-center'>seema@gmail.com</td>
                <td className='text-center'>9562415412263</td>
                <td className='text-center'>$29.00</td>
                <td className='text-center'>Bank</td>
                <td className='text-center'>24 Jun 2024</td>
                <td className='text-center'>
                  <span className='bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm'>
                    Active
                  </span>
                </td>
              </tr>
              <tr>
                <td className=''>
                  <div className='d-flex align-items-center'>
                    <img
                      src='assets/images/users/user4.png'
                      alt=''
                      className='w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden'
                    />
                    <div className='flex-grow-1'>
                      <h6 className='text-md mb-0 fw-medium'>Bessie Cooper </h6>
                    </div>
                  </div>
                </td>
                <td className='text-center'>hamli@gmail.com</td>
                <td className='text-center'>9562415412263</td>
                <td className='text-center'>$29.00</td>
                <td className='text-center'>Bank</td>
                <td className='text-center'>24 Jun 2024</td>
                <td className='text-center'>
                  <span className='bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm'>
                    Active
                  </span>
                </td>
              </tr>
              <tr>
                <td className=''>
                  <div className='d-flex align-items-center'>
                    <img
                      src='assets/images/users/user5.png'
                      alt=''
                      className='w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden'
                    />
                    <div className='flex-grow-1'>
                      <h6 className='text-md mb-0 fw-medium'>Arlene McCoy</h6>
                    </div>
                  </div>
                </td>
                <td className='text-center'>zitka@mail.ru</td>
                <td className='text-center'>9562415412263</td>
                <td className='text-center'>$29.00</td>
                <td className='text-center'>Bank</td>
                <td className='text-center'>24 Jun 2024</td>
                <td className='text-center'>
                  <span className='bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm'>
                    Active
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
    
  );
};

export default PaymentHistoryOne;