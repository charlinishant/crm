import React, {useState} from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";

const SignInLayer = () => {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [formData, setFormData] = useState({
    email:"",
    password:""
  })
  const [errorModal, setErrorModal] = useState({
    show: false,
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = e =>{
    const {name, value} = e.target
    setFormData({...formData, [name]:value})
    if (errorModal.show) {
      setErrorModal({
        show: false,
        message: ""
      });
    }
  }

  const showErrorModal = (message) => {
    setErrorModal({
      show: true,
      message
    });
  };

  const handleLogin = async(e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorModal({
      show: false,
      message: ""
    });

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method:"POST",
        headers:{
          "Content-Type": "application/json"
        },
        body:JSON.stringify(formData)
      });

      const result = await res.json();

      if(res.ok){
        const profilePhotos = JSON.parse(localStorage.getItem("userProfilePhotos") || "{}");
        const emailKey = result.data?.email?.trim().toLowerCase();
        const loggedInUser = {
          ...result.data,
          profilePhoto: profilePhotos[emailKey] || result.data?.profilePhoto || "",
        };
        localStorage.setItem("authToken", result.token);
        localStorage.setItem("authUser", JSON.stringify(loggedInUser));
        const role = loggedInUser?.role;
        if (role === "SALES" || role === "PRE_SALES" || role === "POST_SALES") {
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
      <style>
        {`
          .signin-blue-input::placeholder {
            color: rgba(255, 255, 255, 0.76);
            opacity: 1;
          }

          .signin-blue-input:focus {
            border-bottom-color: rgba(255, 255, 255, 0.9) !important;
          }
        `}
      </style>
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

          {/* Email */}
          <div style={{ marginBottom: "30px", position: "relative" }}>
            <input
              className="signin-blue-input"
              type="email"
              placeholder="Email"
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

          {/* Show Password */}
          {/* <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              marginBottom: "28px",
              fontSize: "14px",
              color: "#fff",
            }}
          >
            <label
              style={{
                alignItems: "center",
                cursor: "pointer",
                display: "inline-flex",
                gap: "8px",
              }}
            >
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                style={{ accentColor: "#fff", cursor: "pointer" }}
              />
              Show Password
            </label>
          </div> */}

          {/* Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "15px",
              background: "#f8fafc",
              color: "#1268ea",
              border: "none",
              borderRadius: "999px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: 800,
              opacity: isSubmitting ? 0.72 : 1,
              textAlign: "center",
            }}
          >
            {isSubmitting ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        {/* <div
          style={{
            alignItems: "center",
            display: "flex",
            fontSize: "14px",
            justifyContent: "space-between",
            marginTop: "28px",
          }}
        >
          <Link
            to="/forgot-password"
            style={{ color: "#fff", fontSize: "14px", textDecoration: "none" }}
          >
            Forgot your password?
          </Link>
          {" "}
          <Link to="/sign-up" style={{ color: "#fff", fontSize: "14px", textDecoration: "none" }}>
            Sign Up
          </Link>
        </div> */}
      </div>

    </section>
  );
};

export default SignInLayer;
