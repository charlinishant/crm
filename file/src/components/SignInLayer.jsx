import React, {useState} from "react";
import { Icon } from "@iconify/react";
import { Link, useNavigate } from "react-router-dom";

const SignInLayer = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email:"",
    password:""
  })
  const [errorModal, setErrorModal] = useState({
    show: false,
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = e =>{
    const {name, value} = e.target
    setFormData({...formData, [name]:value})
  }

  const showErrorModal = (message) => {
    setErrorModal({
      show: true,
      message
    });
  };

  const closeErrorModal = () => {
    setErrorModal({
      show: false,
      message: ""
    });
  };

  const handleLogin = async(e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/auth/login`, {
        method:"POST",
        headers:{
          "Content-Type": "application/json"
        },
        body:JSON.stringify(formData)
      });

      const result = await res.json();

      if(res.ok){
        localStorage.setItem("authToken", result.token);
        localStorage.setItem("authUser", JSON.stringify(result.data));
        const role = result.data?.role;
        if (role === "SALES" || role === "PRE_SALES" || role === "POST_SALES") {
          navigate("/user/sales");
        } else {
          navigate("/index-11");
        }
        return;
      }

      if (result?.message === "Invalid password") {
        showErrorModal("Password is wrong. Please check your credentials.");
      } else {
        showErrorModal(result?.message || "Please check your credentials and try again.");
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
              name="email"
              value={formData.email}
              onChange={handleChange}
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
              name="password"
              value={formData.password}
              onChange={handleChange}
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
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "12px",
              background: isSubmitting ? "#6ea8fe" : "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            {isSubmitting ? "Signing In..." : "Sign In"}
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

      {errorModal.show && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="signin-error-title"
          style={{
            alignItems: "center",
            background: "rgba(15, 23, 42, 0.45)",
            bottom: 0,
            display: "flex",
            justifyContent: "center",
            left: 0,
            padding: "16px",
            position: "fixed",
            right: 0,
            top: 0,
            zIndex: 1050,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "10px",
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.2)",
              maxWidth: "380px",
              padding: "24px",
              textAlign: "center",
              width: "100%",
            }}
          >
            <div
              style={{
                alignItems: "center",
                background: "#fee2e2",
                borderRadius: "50%",
                color: "#dc2626",
                display: "inline-flex",
                fontSize: "32px",
                height: "58px",
                justifyContent: "center",
                marginBottom: "14px",
                width: "58px",
              }}
            >
              <Icon icon="mdi:alert-circle-outline" />
            </div>
            <h3
              id="signin-error-title"
              style={{
                color: "#111827",
                fontSize: "20px",
                margin: "0 0 8px",
              }}
            >
              Login Failed
            </h3>
            <p
              style={{
                color: "#4b5563",
                fontSize: "15px",
                lineHeight: 1.5,
                margin: "0 0 20px",
              }}
            >
              {errorModal.message}
            </p>
            <button
              type="button"
              onClick={closeErrorModal}
              style={{
                background: "#007bff",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "bold",
                padding: "10px 24px",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default SignInLayer;
