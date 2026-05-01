import { Icon } from "@iconify/react/dist/iconify.js";
import React from "react";
import { Link } from "react-router-dom";

const SignUpLayer = () => {
  return (
    <section className="auth bg-base d-flex align-items-center justify-content-center min-vh-100">
      <div className="auth-box py-32 px-24 w-100" style={{ maxWidth: "420px" }}>
        
        <div className="text-center">
          <Link to="/" className="mb-40 d-inline-block">
            <img src="assets/images/logo.png" alt="logo" />
          </Link>

          <h4 className="mb-12">Sign Up to your Account</h4>
          <p className="mb-32 text-secondary-light text-lg">
            Welcome! Please enter your details
          </p>
        </div>

        <form>
          {/* Username */}
          <div className="icon-field mb-16">
            <span className="icon top-50 translate-middle-y">
              <Icon icon="f7:person" />
            </span>
            <input
              type="text"
              className="form-control h-56-px bg-neutral-50 radius-12"
              placeholder="Username"
            />
          </div>

          {/* Email */}
          <div className="icon-field mb-16">
            <span className="icon top-50 translate-middle-y">
              <Icon icon="mage:email" />
            </span>
            <input
              type="email"
              className="form-control h-56-px bg-neutral-50 radius-12"
              placeholder="Email"
            />
          </div>

          {/* Password */}
          <div className="mb-20">
            <div className="position-relative">
              <div className="icon-field">
                <span className="icon top-50 translate-middle-y">
                  <Icon icon="solar:lock-password-outline" />
                </span>
                <input
                  type="password"
                  className="form-control h-56-px bg-neutral-50 radius-12"
                  placeholder="Password"
                />
              </div>
            </div>
            <span className="mt-12 text-sm text-secondary-light">
              Your password must have at least 8 characters
            </span>
          </div>

          {/* Terms */}
          <div className="form-check mb-20">
            <input className="form-check-input" type="checkbox" id="condition" />
            <label className="form-check-label text-sm" htmlFor="condition">
              I agree to the{" "}
              <Link to="#" className="text-primary-600 fw-semibold">
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link to="#" className="text-primary-600 fw-semibold">
                Privacy Policy
              </Link>
            </label>
          </div>

          {/* Button */}
          <button
            type="submit"
            className="btn btn-primary w-100 radius-12 py-16"
          >
            Sign Up
          </button>

          {/* Divider */}
          <div className="mt-32 text-center">
            <span>Or sign up with</span>
          </div>

          {/* Social Buttons */}
          <div className="mt-16 d-flex gap-3">
            <button className="btn border w-50 d-flex align-items-center justify-content-center gap-2">
              <Icon icon="logos:google-icon" />
              Google
            </button>

            <button className="btn border w-50 d-flex align-items-center justify-content-center gap-2">
              <Icon icon="ic:baseline-facebook" />
              Facebook
            </button>
          </div>

          {/* Sign In */}
          <div className="mt-32 text-center text-sm">
            <p>
              Already have an account?{" "}
              <Link to="/sign-in" className="text-primary-600 fw-semibold">
                Sign In
              </Link>
            </p>
          </div>
        </form>
      </div>
    </section>
  );
};

export default SignUpLayer;