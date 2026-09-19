import React from "react";
import { Link, useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { ArrowLeft, Home, Users } from "lucide-react";

const salesRoles = new Set([
  "SALES",
  "PRE_SALES",
  "POST_SALES",
  "AGENT",
  "AGENCY_USER",
  "CHANNEL_PARTNER",
]);
const adminRoles = new Set(["ADMIN", "SUPER_ADMIN", "MANAGER"]);

const getAuthUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "null");
  } catch {
    return null;
  }
};

const ErrorPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("authToken");
  const authUser = getAuthUser();
  const role = String(authUser?.role || authUser?.department || "").trim().toUpperCase();

  const isSales = token && (salesRoles.has(role) || (!adminRoles.has(role) && role !== ""));
  const isAdmin = token && adminRoles.has(role);

  // If the user is a sales/agent user, render inside a sales-workspace bounded error UI (NEVER MasterLayout)
  if (isSales) {
    return (
      <div className="sales-app-shell d-flex flex-column min-vh-100 bg-light">
        <header className="navbar navbar-expand navbar-light bg-white border-bottom px-4 py-3 shadow-sm">
          <div className="d-flex align-items-center gap-3">
            <img
              src="/assets/images/logo.png"
              alt="SWAMI"
              style={{ height: "36px", objectFit: "contain" }}
            />
            <span className="badge bg-primary-subtle text-primary px-3 py-2 rounded-pill fw-semibold">
              Sales Workspace
            </span>
          </div>
          <div className="ms-auto d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <Link
              to="/user/sales"
              className="btn btn-primary btn-sm d-flex align-items-center gap-2"
            >
              <Home size={16} /> Workspace Home
            </Link>
          </div>
        </header>

        <main className="flex-grow-1 d-flex align-items-center justify-content-center p-4">
          <div
            className="card shadow-sm border-0 rounded-4 text-center p-5"
            style={{ maxWidth: "540px", width: "100%", background: "#fff" }}
          >
            <div className="mb-4">
              <img
                src="/assets/images/error-img.png"
                alt="Page Not Found"
                style={{ maxWidth: "220px", height: "auto" }}
              />
            </div>
            <h3 className="fw-bold text-dark mb-2">Page Not Found</h3>
            <p className="text-muted mb-4">
              The page or resource you are looking for doesn't exist or has been moved.
            </p>
            <div className="d-flex flex-wrap justify-content-center gap-3">
              <Link
                to="/user/sales"
                className="btn btn-primary px-4 py-2 rounded-3 d-flex align-items-center gap-2"
              >
                <Home size={16} /> Go to My Workspace
              </Link>
              <Link
                to="/user/sales/leads"
                className="btn btn-outline-primary px-4 py-2 rounded-3 d-flex align-items-center gap-2"
              >
                <Users size={16} /> View My Leads
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If the user is an admin or manager, render within MasterLayout
  if (isAdmin) {
    return (
      <MasterLayout>
        <Breadcrumb title="404" />
        <div className="card basic-data-table border-0 shadow-sm rounded-4">
          <div className="card-body py-80 px-32 text-center">
            <img
              src="/assets/images/error-img.png"
              alt="Page Not Found"
              className="mb-24"
              style={{ maxWidth: "240px" }}
            />
            <h4 className="mb-16 fw-bold">Page not Found</h4>
            <p className="text-secondary-light mb-24">
              Sorry, the page you are looking for doesn’t exist or you don't have access.
            </p>
            <Link to="/dashboard" className="btn btn-primary-600 radius-8 px-24 py-12">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </MasterLayout>
    );
  }

  // Unauthenticated fallback
  return (
    <div className="d-flex flex-column min-vh-100 align-items-center justify-content-center bg-light p-4">
      <div
        className="card shadow-sm border-0 rounded-4 text-center p-5"
        style={{ maxWidth: "480px", width: "100%", background: "#fff" }}
      >
        <img
          src="/assets/images/error-img.png"
          alt="Page Not Found"
          className="mb-4 mx-auto"
          style={{ maxWidth: "200px" }}
        />
        <h4 className="fw-bold text-dark mb-2">Page Not Found</h4>
        <p className="text-muted mb-4">Please log in to access your CRM workspace.</p>
        <Link to="/sign-in" className="btn btn-primary px-4 py-2 rounded-3">
          Sign In
        </Link>
      </div>
    </div>
  );
};

export default ErrorPage;
