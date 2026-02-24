import React, { useState } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ApiError } from "../lib/api";
import { toast } from "sonner";

export const Login: React.FC = () => {
    const { login, register } = useAuth();
    const [email, setEmail] = useState("reviewer@example.com");
    const [password, setPassword] = useState("password123");
    const [name, setName] = useState("Technical Reviewer");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isRegisterMode, setIsRegisterMode] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }
        if (isRegisterMode && !name) {
            setError("Please enter your name");
            return;
        }
        setError("");
        setIsLoading(true);
        try {
            if (isRegisterMode) {
                await register(email, password, name);
                toast.success("Account created! Welcome to Beacon.");
            } else {
                await login(email, password);
                toast.success("Welcome back!");
            }
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError("Unable to connect to server. Is the backend running?");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#050038] via-[#0a0050] to-[#1a0080] p-4">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#4262ff]/10 blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-[#ffd02f]/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
                <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4262ff]/5 blur-2xl animate-pulse" style={{ animationDelay: "0.5s" }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Logo */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-white tracking-tight">miro</h1>
                    <div className="mt-2 flex items-center justify-center gap-2">
                        <div className="h-px w-8 bg-[#ffd02f]" />
                        <span className="text-sm font-semibold text-[#ffd02f] tracking-widest uppercase">Beacon</span>
                        <div className="h-px w-8 bg-[#ffd02f]" />
                    </div>
                    <p className="mt-4 text-sm text-white/60">Analytics for prototype testing</p>
                </div>

                {/* Login Card */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
                    <h2 className="text-xl font-bold text-white mb-1">
                        {isRegisterMode ? "Create your account" : "Welcome back"}
                    </h2>
                    <p className="text-sm text-white/60 mb-6">
                        {isRegisterMode ? "Sign up to start testing" : "Sign in to your account to continue"}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegisterMode && (
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-white/80">Full name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#4262ff] focus:outline-none focus:ring-1 focus:ring-[#4262ff] transition-colors"
                                    placeholder="Jane Researcher"
                                />
                            </div>
                        )}
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-white/80">Email address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#4262ff] focus:outline-none focus:ring-1 focus:ring-[#4262ff] transition-colors"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-white/80">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-sm text-white placeholder:text-white/30 focus:border-[#4262ff] focus:outline-none focus:ring-1 focus:ring-[#4262ff] transition-colors"
                                    placeholder={isRegisterMode ? "Min. 6 characters" : "Enter your password"}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-sm text-red-400"
                            >
                                {error}
                            </motion.p>
                        )}

                        {!isRegisterMode && (
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-white/20 bg-white/5 text-[#4262ff] focus:ring-[#4262ff]" />
                                    <span className="text-sm text-white/60">Remember me</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => toast.info("Password reset is coming soon.")}
                                    className="text-sm text-[#4262ff] hover:text-[#4262ff]/80 transition-colors"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full rounded-lg bg-[#ffd02f] px-4 py-2.5 text-sm font-semibold text-[#050038] transition-all hover:bg-[#ffd02f]/90 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
                        >
                            <span className={`inline-flex items-center gap-2 transition-transform ${isLoading ? "translate-y-8" : ""}`}>
                                {isRegisterMode ? "Create Account" : "Sign In"}
                                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                            </span>
                            {isLoading && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-white/40">
                            {isRegisterMode ? "Already have an account? " : "Don't have an account? "}
                            <button
                                onClick={() => { setIsRegisterMode(!isRegisterMode); setError(""); }}
                                className="text-[#4262ff] hover:text-[#4262ff]/80 font-medium transition-colors"
                            >
                                {isRegisterMode ? "Sign in" : "Sign up"}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="mt-6 text-center text-xs text-white/30">
                    © 2026 Miro Beacon. All rights reserved.
                </p>
            </motion.div>
        </div>
    );
};
