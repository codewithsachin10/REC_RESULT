"use client";

import { useState } from "react";
import Image from "next/image";
import { User, Bell, Lock, Save, ShieldCheck } from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "security">("profile");

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Settings & Configuration</h2>
        <p className="text-slate-500 font-bold mt-1">Manage your account preferences, notifications, and security.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Sidebar Tabs */}
        <div className="md:col-span-1 flex flex-col gap-3">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-black transition-all border-[3px] ${
              activeTab === "profile"
                ? "bg-blue-300 text-blue-900 border-slate-900 shadow-[4px_4px_0_0_#0f172a] translate-x-[-2px] translate-y-[-2px]"
                : "bg-white text-slate-900 border-transparent hover:border-slate-900 hover:shadow-[2px_2px_0_0_#0f172a]"
            }`}
          >
            <User className="h-5 w-5" />
            Profile Info
          </button>
          
          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-black transition-all border-[3px] ${
              activeTab === "notifications"
                ? "bg-amber-300 text-amber-900 border-slate-900 shadow-[4px_4px_0_0_#0f172a] translate-x-[-2px] translate-y-[-2px]"
                : "bg-white text-slate-900 border-transparent hover:border-slate-900 hover:shadow-[2px_2px_0_0_#0f172a]"
            }`}
          >
            <Bell className="h-5 w-5" />
            Notifications
          </button>
          
          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-black transition-all border-[3px] ${
              activeTab === "security"
                ? "bg-emerald-300 text-emerald-900 border-slate-900 shadow-[4px_4px_0_0_#0f172a] translate-x-[-2px] translate-y-[-2px]"
                : "bg-white text-slate-900 border-transparent hover:border-slate-900 hover:shadow-[2px_2px_0_0_#0f172a]"
            }`}
          >
            <Lock className="h-5 w-5" />
            Security
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3">
          
          {activeTab === "profile" && (
            <div className="bg-white rounded-xl border-[3px] border-slate-900 shadow-[6px_6px_0_0_#0f172a] p-6 animate-in fade-in zoom-in-95 duration-300">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <User className="h-6 w-6 text-blue-600" />
                Profile Information
              </h3>
              
              <div className="space-y-5">
                <div className="flex items-center gap-6 mb-6">
                  <div className="h-24 w-24 rounded-xl bg-slate-200 border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] flex items-center justify-center overflow-hidden">
                    <Image src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix" width={96} height={96} alt="Profile" className="h-full w-full object-cover" unoptimized />
                  </div>
                  <button className="bg-slate-900 text-white px-4 py-2 rounded-lg font-black border-[3px] border-slate-900 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all">
                    Change Avatar
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-black text-slate-900 mb-2">Full Name</label>
                    <input type="text" defaultValue="Dr. Felix" className="w-full border-[3px] border-slate-900 rounded-lg px-4 py-2.5 font-bold text-slate-900 focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-900 mb-2">Designation</label>
                    <input type="text" defaultValue="Associate Professor" className="w-full border-[3px] border-slate-900 rounded-lg px-4 py-2.5 font-bold text-slate-900 focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-900 mb-2">Email Address</label>
                    <input type="email" defaultValue="felix@rec.edu.in" className="w-full border-[3px] border-slate-900 rounded-lg px-4 py-2.5 font-bold text-slate-900 focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-900 mb-2">Department</label>
                    <select className="w-full border-[3px] border-slate-900 rounded-lg px-4 py-2.5 font-bold text-slate-900 focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-all">
                      <option>Computer Science</option>
                      <option>Electronics</option>
                      <option>Mechanical</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 mt-6 border-t-[3px] border-slate-900 flex justify-end">
                  <button className="bg-emerald-300 text-emerald-900 px-6 py-2.5 rounded-lg font-black border-[3px] border-slate-900 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all flex items-center gap-2">
                    <Save className="h-5 w-5" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="bg-white rounded-xl border-[3px] border-slate-900 shadow-[6px_6px_0_0_#0f172a] p-6 animate-in fade-in zoom-in-95 duration-300">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <Bell className="h-6 w-6 text-amber-500" />
                Notification Preferences
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 border-[3px] border-slate-900 rounded-lg">
                  <div>
                    <p className="font-black text-slate-900 text-lg">Email Alerts</p>
                    <p className="text-sm font-bold text-slate-600">Receive updates when results are uploaded.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-slate-900 border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a]"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 border-[3px] border-slate-900 rounded-lg">
                  <div>
                    <p className="font-black text-slate-900 text-lg">Student Query Notifications</p>
                    <p className="text-sm font-bold text-slate-600">Get notified when a student submits a new query.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-slate-900 border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border-[3px] border-slate-900 rounded-lg">
                  <div>
                    <p className="font-black text-slate-900 text-lg">System Announcements</p>
                    <p className="text-sm font-bold text-slate-600">Platform maintenance and feature updates.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-slate-900 border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a]"></div>
                  </label>
                </div>

                <div className="pt-4 mt-6 border-t-[3px] border-slate-900 flex justify-end">
                  <button className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-black border-[3px] border-slate-900 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all flex items-center gap-2">
                    <Save className="h-5 w-5" />
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="bg-white rounded-xl border-[3px] border-slate-900 shadow-[6px_6px_0_0_#0f172a] p-6 animate-in fade-in zoom-in-95 duration-300">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
                Security Settings
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-black text-slate-900 mb-2">Current Password</label>
                  <input type="password" placeholder="••••••••" className="w-full sm:w-2/3 border-[3px] border-slate-900 rounded-lg px-4 py-2.5 font-bold text-slate-900 focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-all" />
                </div>
                
                <div>
                  <label className="block text-sm font-black text-slate-900 mb-2">New Password</label>
                  <input type="password" placeholder="Enter new password" className="w-full sm:w-2/3 border-[3px] border-slate-900 rounded-lg px-4 py-2.5 font-bold text-slate-900 focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-900 mb-2">Confirm New Password</label>
                  <input type="password" placeholder="Confirm new password" className="w-full sm:w-2/3 border-[3px] border-slate-900 rounded-lg px-4 py-2.5 font-bold text-slate-900 focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-all" />
                </div>

                <div className="pt-4 mt-6 border-t-[3px] border-slate-900 flex justify-start">
                  <button className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-black border-[3px] border-slate-900 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
