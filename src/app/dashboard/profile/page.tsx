"use client";

import { useState, useEffect } from "react";
import { Loader2, LogOut, ShieldCheck, Mail, BookOpen, Lock, KeyRound, Calendar, GraduationCap, UserCircle, Phone, CalendarDays, Activity, Clock, Edit2, Save, X, Send, Unlink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toggleTwoFactor } from "@/app/actions/twoFactorActions";
import { sendTelegramNotification } from "@/app/actions/telegramActions";

export default function ProfilePage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    year: "",
    semester: "",
    faculty_advisor: "",
    dob: "",
    phone: ""
  });

  // Password Change State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" });

  const [isToggling2FA, setIsToggling2FA] = useState(false);

  const handleToggle2FA = async () => {
    if (!userProfile?.telegram_chat_id) return;
    
    setIsToggling2FA(true);
    const newValue = !userProfile.two_factor_enabled;
    const result = await toggleTwoFactor(newValue);
    
    if (result.success) {
      setUserProfile({
        ...userProfile,
        two_factor_enabled: newValue
      });
    } else {
      alert(result.error);
    }
    setIsToggling2FA(false);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      
      if (userData?.user) {
        // Fetch public profile data
        const { data: publicProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userData.user.id)
          .single();

        // Check for telegram connection
        const { data: telegramData } = await supabase
          .from('telegram_users')
          .select('chat_id, two_factor_enabled')
          .eq('student_id', userData.user.id)
          .single();

        setUserProfile({
          ...userData.user.user_metadata,
          ...publicProfile,
          email: userData.user.email,
          telegram_chat_id: telegramData?.chat_id || null,
          two_factor_enabled: telegramData?.two_factor_enabled || false
        });
        
        // Format last sign in date
        if (userData.user.last_sign_in_at) {
          const date = new Date(userData.user.last_sign_in_at);
          setLastSignIn(date.toLocaleString('en-IN', { 
            day: 'numeric', month: 'short', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
          }));
        }
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.clear();
    router.push("/login");
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditForm({
        year: userProfile.year || "",
        semester: userProfile.semester || "",
        faculty_advisor: userProfile.faculty_advisor || "",
        dob: userProfile.dob || "",
        phone: userProfile.phone || ""
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const supabase = createClient();
    
    // 1. Update Auth Metadata
    const { data, error } = await supabase.auth.updateUser({
      data: {
        year: editForm.year,
        semester: editForm.semester,
        faculty_advisor: editForm.faculty_advisor,
        dob: editForm.dob,
        phone: editForm.phone
      }
    });

    if (error) {
      alert("Failed to update profile auth: " + error.message);
      setIsSaving(false);
      return;
    }

    // 2. Update Public Profiles Table (for faculty to see)
    if (data?.user?.id) {
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          year: editForm.year,
          semester: editForm.semester,
          faculty_advisor: editForm.faculty_advisor,
          dob: editForm.dob,
          phone: editForm.phone,
          batch: userProfile.batch || "2021-2025" // Default fallback if they haven't set it but we need it
        })
        .eq('id', data.user.id);
        
      if (dbError) {
        console.error("Warning: Could not sync to public profiles table", dbError);
      }
    }

    if (data?.user) {
      setUserProfile({
        ...userProfile,
        ...data.user.user_metadata
      });
      setIsEditing(false);
      
      // Notify via Telegram
      sendTelegramNotification(
        data.user.id, 
        `<b>✅ Profile Updated</b>\nYour academic and personal details have been successfully updated.`
      );
    }
    setIsSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage({ type: "", text: "" });
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      setPasswordMessage({ type: "error", text: error.message });
    } else {
      setPasswordMessage({ type: "success", text: "Password updated successfully!" });
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMessage({ type: "", text: "" }), 5000);

      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        sendTelegramNotification(
          userData.user.id, 
          `<b>⚠️ Security Alert</b>\nYour REC Portal password was just changed. If this wasn't you, please contact the admin immediately.`
        );
      }
    }
    setPasswordLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="p-12 text-center border-[3px] border-slate-900 bg-white rounded-2xl shadow-[6px_6px_0_0_#0f172a] max-w-2xl mx-auto">
        <p className="text-xl font-bold text-slate-600">Profile data not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h2 className="text-3xl font-extrabold text-slate-900">Your Profile</h2>
          {userProfile?.telegram_chat_id ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 font-bold rounded-lg border-2 border-green-200 shadow-[2px_2px_0_0_#15803d] w-fit">
              <Send className="w-4 h-4" />
              <span className="text-sm">Telegram Connected ({userProfile.telegram_chat_id})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 font-bold rounded-lg border-2 border-red-200 shadow-[2px_2px_0_0_#b91c1c] w-fit">
              <Unlink className="w-4 h-4" />
              <span className="text-sm">Telegram Not Connected</span>
            </div>
          )}
        </div>
        <p className="text-base font-medium text-slate-500">Manage your account and view your academic details.</p>
      </div>

      <div className="bg-white rounded-2xl border-[3px] border-slate-900 p-8 shadow-[8px_8px_0_0_#0f172a] flex flex-col md:flex-row gap-10 relative">
        
        {/* Left Column: Avatar & Basic Info */}
        <div className="flex flex-col items-center md:items-start md:w-[30%] shrink-0 gap-6 border-b-4 md:border-b-0 md:border-r-[3px] border-slate-100 pb-8 md:pb-0 md:pr-10">
          <div className="h-40 w-40 rounded-full border-[4px] border-slate-900 bg-blue-100 flex items-center justify-center shadow-[4px_4px_0_0_#0f172a]">
            <span className="text-6xl font-black text-blue-700">{userProfile.name?.charAt(0) || "S"}</span>
          </div>
          <div className="text-center md:text-left w-full">
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2 leading-tight">{userProfile.name}</h3>
            
            {/* Mail inside a container */}
            <div className="flex items-center justify-center md:justify-start gap-2 text-slate-700 bg-slate-50 border-[3px] border-slate-900 rounded-xl px-4 py-2 shadow-[2px_2px_0_0_#0f172a] font-bold mb-4 w-fit mx-auto md:mx-0">
              <Mail className="h-4 w-4" />
              <span className="text-sm truncate max-w-[200px]">{userProfile.email}</span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-lg border-[3px] border-blue-900 bg-blue-100 px-4 py-2 text-blue-900 shadow-[2px_2px_0_0_#1e3a8a] mb-6">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm font-black uppercase tracking-wider">Verified Student</span>
            </div>
            
            <div className="pt-6 border-t-[3px] border-slate-100 w-full flex justify-center md:justify-start">
              <button 
                onClick={handleSignOut}
                className="flex items-center gap-2 text-sm font-black text-white bg-red-600 px-6 py-3 rounded-xl border-[3px] border-slate-900 hover:bg-red-700 transition-colors shadow-[4px_4px_0_0_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none w-full justify-center"
              >
                <LogOut className="h-5 w-5" />
                Sign Out Securely
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Sections */}
        <div className="flex-1 flex flex-col gap-10">
          
          {/* Header & Edit Button */}
          <div className="flex items-center justify-between border-b-[3px] border-slate-900 pb-2">
            <h3 className="text-xl font-black text-slate-900">Academic & Personal Details</h3>
            {!isEditing ? (
              <button 
                onClick={handleEditToggle}
                className="flex items-center gap-1.5 text-sm font-black text-slate-900 bg-amber-300 px-3 py-1.5 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] hover:bg-amber-400 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
              >
                <Edit2 className="h-4 w-4" /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleEditToggle}
                  className="flex items-center gap-1 text-sm font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border-2 border-slate-300 hover:bg-slate-200 transition-all"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 text-sm font-black text-white bg-emerald-600 px-3 py-1.5 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] hover:bg-emerald-700 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
                  Save
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 border-[3px] border-slate-900 p-4 rounded-xl shadow-[2px_2px_0_0_#0f172a]">
              <div className="flex items-center gap-2 mb-1 text-slate-600">
                <BookOpen className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wider">Roll & Dept</span>
              </div>
              <p className="text-lg font-black text-slate-900">{userProfile.roll_number || "N/A"} • {userProfile.department || "N/A"}</p>
            </div>
            
            <div className={`p-4 rounded-xl shadow-[2px_2px_0_0_#0f172a] ${isEditing ? 'bg-amber-50 border-amber-400 border-[3px]' : 'bg-blue-50 border-[3px] border-slate-900'}`}>
              <div className="flex items-center gap-2 mb-1 text-slate-600">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wider">Year</span>
              </div>
              {isEditing ? (
                <input 
                  type="text" 
                  value={editForm.year} 
                  onChange={(e) => setEditForm({...editForm, year: e.target.value})}
                  placeholder="e.g. 3rd Year"
                  className="w-full bg-white border-2 border-slate-300 rounded px-2 py-1 text-sm font-bold outline-none focus:border-amber-500"
                />
              ) : (
                <p className="text-lg font-black text-slate-900">{userProfile.year || "Not Set"}</p>
              )}
            </div>

            <div className={`p-4 rounded-xl shadow-[2px_2px_0_0_#0f172a] ${isEditing ? 'bg-amber-50 border-amber-400 border-[3px]' : 'bg-blue-50 border-[3px] border-slate-900'}`}>
              <div className="flex items-center gap-2 mb-1 text-slate-600">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wider">Semester</span>
              </div>
              {isEditing ? (
                <input 
                  type="text" 
                  value={editForm.semester} 
                  onChange={(e) => setEditForm({...editForm, semester: e.target.value})}
                  placeholder="e.g. 6th Sem"
                  className="w-full bg-white border-2 border-slate-300 rounded px-2 py-1 text-sm font-bold outline-none focus:border-amber-500"
                />
              ) : (
                <p className="text-lg font-black text-slate-900">{userProfile.semester || "Not Set"}</p>
              )}
            </div>

            <div className="bg-blue-50 border-[3px] border-slate-900 p-4 rounded-xl shadow-[2px_2px_0_0_#0f172a]">
              <div className="flex items-center gap-2 mb-1 text-slate-600">
                <GraduationCap className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wider">Batch</span>
              </div>
              <p className="text-lg font-black text-slate-900">{userProfile.batch || "2021-2025"}</p>
            </div>
            
            <div className={`p-4 rounded-xl shadow-[2px_2px_0_0_#0f172a] sm:col-span-2 lg:col-span-2 ${isEditing ? 'bg-amber-50 border-amber-400 border-[3px]' : 'bg-blue-50 border-[3px] border-slate-900'}`}>
              <div className="flex items-center gap-2 mb-1 text-slate-600">
                <UserCircle className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wider">Faculty Advisor</span>
              </div>
              {isEditing ? (
                <input 
                  type="text" 
                  value={editForm.faculty_advisor} 
                  onChange={(e) => setEditForm({...editForm, faculty_advisor: e.target.value})}
                  placeholder="e.g. Dr. Ramesh Kumar"
                  className="w-full bg-white border-2 border-slate-300 rounded px-2 py-1 text-sm font-bold outline-none focus:border-amber-500"
                />
              ) : (
                <p className="text-lg font-black text-slate-900">{userProfile.faculty_advisor || "Not Assigned"}</p>
              )}
            </div>

            <div className={`p-4 rounded-xl shadow-[2px_2px_0_0_#0f172a] ${isEditing ? 'bg-amber-50 border-amber-400 border-[3px]' : 'bg-emerald-50 border-[3px] border-slate-900'}`}>
              <div className="flex items-center gap-2 mb-1 text-slate-600">
                <Phone className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wider">Phone Number</span>
              </div>
              {isEditing ? (
                <input 
                  type="text" 
                  value={editForm.phone} 
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  placeholder="e.g. +91 9876543210"
                  className="w-full bg-white border-2 border-slate-300 rounded px-2 py-1 text-sm font-bold outline-none focus:border-amber-500"
                />
              ) : (
                <p className="text-lg font-black text-slate-900">{userProfile.phone || "+91 (Not Set)"}</p>
              )}
            </div>

            <div className={`p-4 rounded-xl shadow-[2px_2px_0_0_#0f172a] ${isEditing ? 'bg-amber-50 border-amber-400 border-[3px]' : 'bg-emerald-50 border-[3px] border-slate-900'}`}>
              <div className="flex items-center gap-2 mb-1 text-slate-600">
                <CalendarDays className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wider">Date of Birth</span>
              </div>
              {isEditing ? (
                <input 
                  type="date" 
                  value={editForm.dob} 
                  onChange={(e) => setEditForm({...editForm, dob: e.target.value})}
                  className="w-full bg-white border-2 border-slate-300 rounded px-2 py-1 text-sm font-bold outline-none focus:border-amber-500"
                />
              ) : (
                <p className="text-lg font-black text-slate-900">{userProfile.dob || "Not Set"}</p>
              )}
            </div>
            
            {/* System Stats merged into the grid to save space */}
            <div className="bg-purple-50 border-[3px] border-slate-900 p-4 rounded-xl shadow-[2px_2px_0_0_#0f172a] sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-1 text-slate-600">
                <Activity className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wider">Portal Last Login</span>
              </div>
              <p className="text-sm font-black text-slate-900 mt-1">{lastSignIn || "Just now"}</p>
            </div>
          </div>
          
        </div>
      </div>

      {/* Security Section (Password Change) */}
      <div className="bg-white rounded-2xl border-[3px] border-slate-900 p-8 shadow-[8px_8px_0_0_#0f172a] flex flex-col md:flex-row gap-10">
        <div className="flex flex-col items-start md:w-1/3 gap-3">
          <div className="h-12 w-12 rounded-xl border-[3px] border-slate-900 bg-amber-100 flex items-center justify-center shadow-[2px_2px_0_0_#0f172a]">
            <KeyRound className="h-6 w-6 text-amber-700" />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-1">Security</h3>
            <p className="text-sm font-bold text-slate-500">Update your password and verification settings.</p>
          </div>
        </div>

        <div className="flex-1">
          <form onSubmit={handlePasswordChange} className="bg-slate-50 border-[3px] border-slate-900 rounded-xl p-6 flex flex-col gap-5">
            {passwordMessage.text && (
              <div className={`p-4 rounded-lg border-2 font-bold text-sm ${
                passwordMessage.type === 'error' 
                  ? 'bg-red-100 border-red-900 text-red-900' 
                  : 'bg-emerald-100 border-emerald-900 text-emerald-900'
              }`}>
                {passwordMessage.text}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Lock className="h-4 w-4" /> New Password
              </label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full rounded-xl border-[3px] border-slate-900 bg-white px-4 py-3 font-bold text-slate-900 outline-none focus:border-blue-600 focus:ring-0 transition-colors shadow-[2px_2px_0_0_#0f172a]"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Lock className="h-4 w-4" /> Confirm Password
              </label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-xl border-[3px] border-slate-900 bg-white px-4 py-3 font-bold text-slate-900 outline-none focus:border-blue-600 focus:ring-0 transition-colors shadow-[2px_2px_0_0_#0f172a]"
                required
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                disabled={passwordLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-black text-slate-900 bg-amber-300 px-8 py-3 rounded-xl border-[3px] border-slate-900 hover:bg-amber-400 transition-colors shadow-[4px_4px_0_0_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Updating...
                  </>
                ) : (
                  <>Update Password</>
                )}
              </button>
            </div>
          </form>

          {/* Telegram Two-Step Verification UI */}
          {userProfile?.telegram_chat_id && (
            <div className="mt-8 bg-slate-50 border-[3px] border-slate-900 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div>
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Two-Step Verification (2FA)
                </h4>
                <p className="text-sm font-bold text-slate-500 mb-3">
                  Secure your account with an OTP sent to your Telegram on login.
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black uppercase text-slate-400 tracking-wider">Status:</span>
                  {userProfile.two_factor_enabled ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-black bg-emerald-100 text-emerald-700 border-2 border-emerald-200">
                      ENABLED
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-black bg-slate-200 text-slate-600 border-2 border-slate-300">
                      DISABLED
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={handleToggle2FA}
                disabled={isToggling2FA}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl border-[3px] border-slate-900 font-black shadow-[4px_4px_0_0_#0f172a] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                  userProfile.two_factor_enabled 
                    ? "bg-red-500 text-white hover:bg-red-600" 
                    : "bg-emerald-500 text-white hover:bg-emerald-600"
                } disabled:opacity-50`}
              >
                {isToggling2FA && <Loader2 className="w-5 h-5 animate-spin" />}
                {userProfile.two_factor_enabled ? "Disable 2FA" : "Enable 2FA"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
