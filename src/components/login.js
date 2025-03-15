import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { RiPulseLine } from "react-icons/ri";
import { FaUserMd, FaLock, FaSpinner, FaInfoCircle } from "react-icons/fa";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Demo credentials
  const DEMO_USERNAME = "demouser";
  const DEMO_PASSWORD = "demo123";

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(""); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError("");

    // Check if demo credentials are used
    if (formData.username === DEMO_USERNAME && formData.password === DEMO_PASSWORD) {
      // Create a dummy token for demo login
      const demoToken = "demo_token_" + Date.now();
      localStorage.setItem("key", demoToken);
      login(demoToken);
      
      // Short delay to simulate login process
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
      
      return;
    }

    try {
      const response = await axios.post(
        "https://medlink-zavgk.ondigitalocean.app/api/auth/login/",
        formData
      );

      if (response?.data?.key) {
        localStorage.setItem("key", response.data.key);
        login(response.data.key);
        navigate("/dashboard");
      } else {
        setError("Invalid response from server");
        setLoginAttempts(prev => prev + 1);
      }
    } catch (error) {
      console.error("Login error:", error);
      
      // Handle different error scenarios
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.status === 401) {
          setError("Invalid username or password. Please try again.");
        } else if (error.response.data?.message) {
          setError(error.response.data.message);
        } else {
          setError(`Server error (${error.response.status}). Please try again later.`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        setError("No response from server. Please check your internet connection.");
      } else {
        // Something happened in setting up the request that triggered an Error
        setError("An unexpected error occurred. Please try again.");
      }
      
      setLoginAttempts(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <RiPulseLine className="text-4xl text-blue-500" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              MedLink
            </h1>
          </div>
          <p className="text-gray-600">
            Secure Digital Health Records Management System
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Streamline patient care with intelligent record keeping
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 block">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUserMd className="text-gray-400" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 block">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-2.5 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>

            {/* Demo Credentials Section */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 text-blue-700 font-medium mb-1">
                <FaInfoCircle />
                <span>Demo Credentials</span>
              </div>
              <p className="text-sm text-gray-600">
                Try out the system with these demo credentials:
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium text-gray-700">Username:</div>
                <div className="text-gray-600">{DEMO_USERNAME}</div>
                <div className="font-medium text-gray-700">Password:</div>
                <div className="text-gray-600">{DEMO_PASSWORD}</div>
              </div>
            </div>

            {/* Additional Links */}
            <div className="text-center text-sm text-gray-500">
              <a
                href="#forgot-password"
                className="hover:text-blue-500 transition-colors"
              >
                Forgot password?
              </a>
              <span className="mx-2">•</span>
              <a
                href="#contact-support"
                className="hover:text-blue-500 transition-colors"
              >
                Contact Support
              </a>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© 2024 MedLink. All rights reserved.</p>
          <div className="mt-2">
            <a href="#privacy" className="hover:text-blue-500 transition-colors">
              Privacy Policy
            </a>
            <span className="mx-2">•</span>
            <a href="#terms" className="hover:text-blue-500 transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
