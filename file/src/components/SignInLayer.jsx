import React from "react";
import { Icon } from "@iconify/react";
import { Link, useNavigate } from "react-router-dom";

const SignInLayer = () => {
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    // 👉 Later: add API validation here
    // For now: direct redirect
    navigate("/index-11");
  };

  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f7fa",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#fff",
          padding: "30px",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h2>Sign In</h2>
          <p style={{ fontSize: "14px", color: "#666" }}>
            Enter your details to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          {/* Email */}
          <div style={{ marginBottom: "15px", position: "relative" }}>
            <Icon
              icon="mage:email"
              style={{
                position: "absolute",
                top: "50%",
                left: "10px",
                transform: "translateY(-50%)",
              }}
            />
            <input
              type="email"
              placeholder="Email"
              required
              style={{
                width: "100%",
                padding: "12px 12px 12px 35px",
                borderRadius: "8px",
                border: "1px solid #ddd",
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "15px", position: "relative" }}>
            <Icon
              icon="solar:lock-password-outline"
              style={{
                position: "absolute",
                top: "50%",
                left: "10px",
                transform: "translateY(-50%)",
              }}
            />
            <input
              type="password"
              placeholder="Password"
              required
              style={{
                width: "100%",
                padding: "12px 12px 12px 35px",
                borderRadius: "8px",
                border: "1px solid #ddd",
              }}
            />
          </div>

          {/* Remember + Forgot */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "15px",
              fontSize: "14px",
            }}
          >
            <label>
              <input type="checkbox" /> Remember
            </label>

            <Link to="#" style={{ color: "#007bff" }}>
              Forgot?
            </Link>
          </div>

          {/* Button */}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              background: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            Sign In
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "14px" }}>
          Don’t have an account?{" "}
          <Link to="/sign-up" style={{ color: "#007bff" }}>
            Sign Up
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SignInLayer;