import { Icon } from '@iconify/react/dist/iconify.js'
import React from 'react'

const UnitCountFour = () => {
  return (
    <div className="row g-4 align-items-stretch">
      {[
        { title: "Missed Calls", subtitle: "Traker", count: 1 },
        { title: "Todays Incoming Calls", subtitle: "Tracker", count: 738 },
        { title: "Past Incoming Calls", subtitle: "Tracker", count: 7 },
      ].map((item, index) => (
        <div className="col-xl-3 col-md-4 col-sm-6" key={index}>
          <div className="card dashboard-card shadow-sm border-0">
            <div className="card-body d-flex justify-content-between align-items-center">

              {/* LEFT TEXT */}
              <div className="text-content">
                <p className="custom-title">{item.title}</p>
                <small className="text-secondary">{item.subtitle}</small>
              </div>

              {/* RIGHT COUNT */}
              <div className="count-box">
                {item.count}
              </div>

            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default UnitCountFour