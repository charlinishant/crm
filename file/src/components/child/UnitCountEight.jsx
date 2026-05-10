import React, { useEffect, useMemo, useState } from "react";

const UnitCountEight = () => {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [dashboardData, setDashboardData] = useState({
    leads: [],
    bookings: [],
    tasks: [],
    projects: [],
  });
  const [loading, setLoading] = useState(true);

  const normalizeList = (result) => {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.tasks)) return result.tasks;
    if (Array.isArray(result?.bookings)) return result.bookings;
    if (Array.isArray(result?.leads)) return result.leads;
    if (Array.isArray(result?.projects)) return result.projects;
    return [];
  };

  useEffect(() => {
    const fetchList = async (endpoint) => {
      try {
        const response = await fetch(`${API_URL}${endpoint}`);
        if (!response.ok) return [];

        const result = await response.json();
        return normalizeList(result);
      } catch (error) {
        console.error(`Unable to load ${endpoint}:`, error);
        return [];
      }
    };

    const loadCounts = async () => {
      setLoading(true);
      const [leads, bookings, tasks, projects] = await Promise.all([
        fetchList("/leads"),
        fetchList("/bookings?limit=1000"),
        fetchList("/tasks"),
        fetchList("/projects/list"),
      ]);

      setDashboardData({ leads, bookings, tasks, projects });
      setLoading(false);
    };

    loadCounts();
  }, [API_URL]);

  const counts = useMemo(() => {
    const { leads, bookings, tasks, projects } = dashboardData;
    const nextSevenDays = new Date();
    nextSevenDays.setDate(nextSevenDays.getDate() + 7);

    const isBookedLead = (lead) =>
      String(lead?.status || "").toLowerCase().includes("book") ||
      (Array.isArray(lead?.bookings) && lead.bookings.length > 0);

    const isDropOffLead = (lead) => {
      const value = String(lead?.status || lead?.stage || "").toLowerCase();
      return value.includes("lost") || value.includes("drop") || value.includes("closed") || value.includes("unqualified");
    };

    const isHotLead = (lead) => {
      const value = `${lead?.tags || ""} ${lead?.priority || ""} ${lead?.status || ""}`.toLowerCase();
      return value.includes("hot") || value.includes("priority");
    };

    const hasVisitExpiringSoon = (lead) => {
      if (!lead?.conductSiteDate) return false;
      const visitDate = new Date(lead.conductSiteDate);
      if (Number.isNaN(visitDate.getTime())) return false;
      return visitDate >= new Date() && visitDate <= nextSevenDays;
    };

    const duplicateKeys = new Set();
    const seenKeys = new Set();
    leads.forEach((lead) => {
      const emails = Array.isArray(lead?.emails) ? lead.emails : [];
      const phones = Array.isArray(lead?.phones) ? lead.phones : [];
      const keys = [
        ...emails.map((email) => email?.value || email).filter(Boolean).map((value) => `email:${String(value).toLowerCase()}`),
        ...phones.map((phone) => phone?.value || phone).filter(Boolean).map((value) => `phone:${String(value).replace(/\D/g, "")}`),
      ];

      keys.forEach((key) => {
        if (seenKeys.has(key)) duplicateKeys.add(key);
        seenKeys.add(key);
      });
    });

    return {
      activeTasks: tasks.filter((task) => !["completed", "archived"].includes(String(task?.status || "").toLowerCase())).length,
      mfa: projects.length,
      visitExpiry: leads.filter(hasVisitExpiringSoon).length,
      leadMerge: duplicateKeys.size,
      hotLeads: leads.filter(isHotLead).length,
      newLeads: leads.filter((lead) => String(lead?.status || "").toLowerCase() === "fresh_lead").length,
      bookedLeads: Math.max(bookings.length, leads.filter(isBookedLead).length),
      dropOffLeads: leads.filter(isDropOffLead).length,
    };
  }, [dashboardData]);

  const cards = [
    { title: "Active Tasks", subtitle: "Open Tasks", count: counts.activeTasks },
    { title: "MFA", subtitle: "Projects", count: counts.mfa },
    { title: "Visit Expiry", subtitle: "Soon", count: counts.visitExpiry },
    { title: "Lead Merge", subtitle: "Duplicates", count: counts.leadMerge },
    { title: "Hot Leads", subtitle: "Priority", count: counts.hotLeads },
    { title: "New Leads", subtitle: "Fresh", count: counts.newLeads },
    { title: "Booked Leads", subtitle: "Confirmed", count: counts.bookedLeads },
    { title: "Drop Off Leads", subtitle: "Closed", count: counts.dropOffLeads },
  ];

  return (
    // <div className='row gy-4'>
    //   <div className='col-xxl-3 col-sm-6'>
    //     <div className='card p-3 shadow-2 radius-8 h-100 gradient-deep-two-1 border border-white'>
    //       <div className='card-body p-0'>
    //         <div className='d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8'>
    //           <div className='d-flex align-items-center gap-10'>
    //             <span className='mb-0 w-48-px h-48-px bg-cyan-600 flex-shrink-0 text-white d-flex justify-content-center align-items-center rounded-circle h6 mb-0'>
    //               <img
    //                 src='assets/images/home-eleven/icons/home-eleven-icon1.svg'
    //                 alt=''
    //               />
    //             </span>
    //             <div>
    //               <span className='fw-medium text-secondary-light text-md'>
    //                 Active Task
    //               </span>
    //               <h6 className='fw-semibold mt-2'>Calls Today</h6>
    //             </div>
    //           </div>
    //         </div>
    //         {/* <p className='text-sm mb-0 d-flex align-items-center flex-wrap gap-12 mt-12 text-secondary-light'>
    //           <span className='bg-success-focus px-6 py-2 rounded-2 fw-medium text-success-main text-sm d-flex align-items-center gap-1'>
    //             <i className='ri-arrow-right-up-line' /> 95%
    //           </span>{" "}
    //           Last month $24,000.00
    //         </p> */}
    //       </div>
    //     </div>
    //   </div>
    //   <div className='col-xxl-3 col-sm-6'>
    //     <div className='card p-3 shadow-2 radius-8 h-100 gradient-deep-two-2 border border-white'>
    //       <div className='card-body p-0'>
    //         <div className='d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8'>
    //           <div className='d-flex align-items-center gap-10'>
    //             <span className='mb-0 w-48-px h-48-px bg-warning-600 flex-shrink-0 text-white d-flex justify-content-center align-items-center rounded-circle h6 mb-0'>
    //               <img
    //                 src='assets/images/home-eleven/icons/home-eleven-icon2.svg'
    //                 alt=''
    //               />
    //             </span>
    //             <div>
    //               <span className='fw-medium text-secondary-light text-md'>
    //                 Total Period Expenses
    //               </span>
    //               <h6 className='fw-semibold mt-2'>$35,000</h6>
    //             </div>
    //           </div>
    //         </div>
    //         <p className='text-sm mb-0 d-flex align-items-center flex-wrap gap-12 mt-12 text-secondary-light'>
    //           <span className='bg-success-focus px-6 py-2 rounded-2 fw-medium text-success-main text-sm d-flex align-items-center gap-1'>
    //             <i className='ri-arrow-right-up-line' /> 95%
    //           </span>{" "}
    //           Last month $1,600.00
    //         </p>
    //       </div>
    //     </div>
    //   </div>
    //   <div className='col-xxl-3 col-sm-6'>
    //     <div className='card p-3 shadow-2 radius-8 h-100 gradient-deep-two-3 border border-white'>
    //       <div className='card-body p-0'>
    //         <div className='d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8'>
    //           <div className='d-flex align-items-center gap-10'>
    //             <span className='mb-0 w-48-px h-48-px bg-lilac-600 flex-shrink-0 text-white d-flex justify-content-center align-items-center rounded-circle h6 mb-0'>
    //               <img
    //                 src='assets/images/home-eleven/icons/home-eleven-icon3.svg'
    //                 alt=''
    //               />
    //             </span>
    //             <div>
    //               <span className='fw-medium text-secondary-light text-md'>
    //                 Net Profit
    //               </span>
    //               <h6 className='fw-semibold mt-2'>$50,000</h6>
    //             </div>
    //           </div>
    //         </div>
    //         <p className='text-sm mb-0 d-flex align-items-center flex-wrap gap-12 mt-12 text-secondary-light'>
    //           <span className='bg-danger-focus px-6 py-2 rounded-2 fw-medium text-danger-main text-sm d-flex align-items-center gap-1'>
    //             <i className='ri-arrow-right-down-line' /> 70%
    //           </span>{" "}
    //           Last month $24,000.00
    //         </p>
    //       </div>
    //     </div>
    //   </div>
    //   <div className='col-xxl-3 col-sm-6'>
    //     <div className='card p-3 shadow-2 radius-8 h-100 gradient-deep-two-4 border border-white'>
    //       <div className='card-body p-0'>
    //         <div className='d-flex flex-wrap align-items-center justify-content-between gap-1 mb-8'>
    //           <div className='d-flex align-items-center gap-10'>
    //             <span className='mb-0 w-48-px h-48-px bg-success-600 flex-shrink-0 text-white d-flex justify-content-center align-items-center rounded-circle h6 mb-0'>
    //               <img
    //                 src='assets/images/home-eleven/icons/home-eleven-icon4.svg'
    //                 alt=''
    //               />
    //             </span>
    //             <div>
    //               <span className='fw-medium text-secondary-light text-md'>
    //                 Total Saving
    //               </span>
    //               <h6 className='fw-semibold mt-2'>$50,000</h6>
    //             </div>
    //           </div>
    //         </div>
    //         <p className='text-sm mb-0 d-flex align-items-center flex-wrap gap-12 mt-12 text-secondary-light'>
    //           <span className='bg-success-focus px-6 py-2 rounded-2 fw-medium text-success-main text-sm d-flex align-items-center gap-1'>
    //             <i className='ri-arrow-right-up-line' /> 95%
    //           </span>{" "}
    //           Last month $2,500.00
    //         </p>
    //       </div>
    //     </div>
    //   </div>
    // </div>
    <div className="row g-4 align-items-stretch">
  {cards.map((item, index) => (
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
            {loading ? "..." : item.count}
          </div>

        </div>
      </div>
    </div>
  ))}
</div>
  );
};

export default UnitCountEight;
