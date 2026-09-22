import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { useLocation, useNavigate } from "react-router-dom";

const SignInLayer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/+$/, "");

  const getInitialError = () => {
    if (location.state?.accessDenied) {
      return {
        show: true,
        message: "Access denied. Your account does not have permission to use this CRM.",
      };
    }

    if (location.state?.sessionExpired) {
      return {
        show: true,
        message: "Your session has expired. Please sign in again.",
      };
    }

    return {
      show: false,
      message: "",
    };
  };

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errorModal, setErrorModal] = useState(getInitialError);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errorModal.show) {
      setErrorModal({
        show: false,
        message: "",
      });
    }
  };

  const showErrorModal = (message) => {
    setErrorModal({
      show: true,
      message,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorModal({
      show: false,
      message: "",
    });

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const contentType = res.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? await res.json()
        : { message: "The login service returned an invalid response." };

      if (res.ok) {
        const role = String(result.data?.role || "").trim().toUpperCase();
        const isSalesRole = ["SALES", "PRE_SALES", "POST_SALES", "AGENT", "USER"].includes(role);
        const isAdminRole = ["ADMIN", "SUPER_ADMIN", "SUPERADMIN", "MANAGER", "ADMINISTRATOR"].includes(role);

        if (!isSalesRole && !isAdminRole) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("authUser");
          showErrorModal("Access denied. Your account does not have permission to use this CRM.");
          return;
        }

        const loggedInUser = result.data;
        localStorage.setItem("authToken", result.token);
        localStorage.setItem("authUser", JSON.stringify(loggedInUser));
        if (isSalesRole) {
          navigate("/user/sales");
        } else {
          navigate("/dashboard");
        }
        return;
      }

      if (result?.message === "Invalid password") {
        showErrorModal("Username or password is wrong. Please check your credentials.");
      } else {
        showErrorModal(result?.message || "Username or password is wrong. Please check your credentials.");
      }
    } catch (err) {
      showErrorModal("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      style={{
        alignItems: "center",
        background: "#2f7df2",
        display: "flex",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "475px",
          background: "rgba(255, 255, 255, 0.12)",
          padding: "clamp(36px, 7vw, 56px) clamp(24px, 7vw, 50px) clamp(34px, 7vw, 50px)",
          borderRadius: "24px",
          boxShadow: "0 22px 45px rgba(15, 70, 145, 0.22)",
          border: "1px solid white",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "42px" }}>
          <div className="signin-project-logo-wrap">
            <img className="signin-project-logo" src="/assets/images/logo.png" alt="SWAMI" />
          </div>
          <h2
            style={{
              color: "#fff",
              fontSize: "34px",
              fontWeight: 800,
              lineHeight: 1.1,
              margin: "0 0 10px",
            }}
          >
            Welcome
          </h2>
          <p style={{ color: "rgba(255, 255, 255, 0.84)", fontSize: "18px", margin: 0 }}>
            Sign in to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          {errorModal.show && (
            <div
              role="alert"
              style={{
                alignItems: "center",
                background: "rgba(254, 226, 226, 0.96)",
                border: "1px solid rgba(248, 113, 113, 0.75)",
                borderRadius: "10px",
                color: "#b91c1c",
                display: "flex",
                fontSize: "14px",
                fontWeight: 600,
                gap: "8px",
                lineHeight: 1.4,
                marginBottom: "22px",
                padding: "10px 12px",
              }}
            >
              <Icon icon="mdi:alert-circle-outline" style={{ flexShrink: 0, fontSize: "18px" }} />
              <span>{errorModal.message}</span>
            </div>
          )}

          {/* Email or Username */}
          <div style={{ marginBottom: "30px", position: "relative" }}>
            <input
              className="signin-blue-input"
              type="text"
              placeholder="Email or Username"
              required
              style={{
                background: "transparent",
                border: "none",
                borderBottom: "2px solid rgba(255, 255, 255, 0.48)",
                borderRadius: 0,
                color: "#fff",
                fontSize: "18px",
                outline: "none",
                padding: "0 0 12px",
                width: "100%",
              }}
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "18px", position: "relative" }}>
            <input
              className="signin-blue-input"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              required
              style={{
                background: "transparent",
                border: "none",
                borderBottom: "2px solid rgba(255, 255, 255, 0.48)",
                borderRadius: 0,
                color: "#fff",
                fontSize: "18px",
                outline: "none",
                padding: "0 40px 12px 0",
                width: "100%",
              }}
              name="password"
              value={formData.password}
              onChange={handleChange}
            />
            <Icon
              icon={showPassword ? "mdi:eye-off-outline" : "mdi:eye-outline"}
              onClick={() => setShowPassword((current) => !current)}
              style={{
                color: "rgba(255, 255, 255, 0.78)",
                cursor: "pointer",
                fontSize: "18px",
                position: "absolute",
                right: 0,
                top: "3px",
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            className="signin-submit-btn"
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "15px",
              background: "#ffffff",
              color: "#1268ea",
              border: "none",
              borderRadius: "999px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: 800,
              marginTop: "24px",
              transition: "opacity 0.2s ease",
              opacity: isSubmitting ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <span style={{ width: "100%", textAlign: "center", display: "block" }}>
              {isSubmitting ? "Signing in..." : "Sign In"}
            </span>
          </button>
        </form>
      </div>
    </section>
  );
};

export default SignInLayer;
