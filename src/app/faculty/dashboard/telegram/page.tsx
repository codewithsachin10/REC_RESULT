"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Send, Users, Unlink, Search, Loader2, Image as ImageIcon, X, CheckSquare, Square, PartyPopper } from "lucide-react";
import { broadcastToTelegram } from "./actions";
import confetti from "canvas-confetti";

type LinkedStudent = {
  chat_id: string;
  student_id: string;
  profile: {
    name: string;
    roll_number: string;
    department: string;
    section: string;
    email: string;
  };
};

export default function TelegramDashboard() {
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [messageType, setMessageType] = useState("general");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  // Celebration Popup State
  const [showCelebration, setShowCelebration] = useState(false);
  const [successDetails, setSuccessDetails] = useState("");
  const [broadcastError, setBroadcastError] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchLinkedStudents();
  }, []);

  const fetchLinkedStudents = async () => {
    try {
      setLoading(true);
      const { data: telegramData, error: telegramError } = await supabase.from("telegram_users").select("*");
      if (telegramError) throw telegramError;

      if (!telegramData || telegramData.length === 0) {
        setStudents([]);
        return;
      }

      const studentIds = telegramData.map((t) => t.student_id);
      const { data: profilesData, error: profilesError } = await supabase.from("profiles").select("*").in("id", studentIds);
      if (profilesError) throw profilesError;

      const combined = telegramData.map((t) => {
        const profile = profilesData.find((p) => p.id === t.student_id) || {
          name: "Unknown", roll_number: "Unknown", department: "Unknown", section: "Unknown", email: "Unknown",
        };
        return { ...t, profile };
      });

      setStudents(combined as LinkedStudent[]);
      // By default, select all
      setSelectedChatIds(new Set(combined.map(s => s.chat_id)));
    } catch (error) {
      console.error("Error fetching linked students:", error);
      alert("Failed to load telegram data");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be less than 5MB");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fireConfetti = () => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    if (selectedChatIds.size === 0) {
      alert("Please select at least one student to send the message to.");
      return;
    }
    
    if (!confirm(`Are you sure you want to send this message to ${selectedChatIds.size} student(s)?`)) return;

    setIsBroadcasting(true);
    setBroadcastError("");
    try {
      const formData = new FormData();
      formData.append("message", broadcastMessage);
      formData.append("type", messageType);
      formData.append("chatIds", JSON.stringify(Array.from(selectedChatIds)));
      
      if (buttonText.trim() && buttonUrl.trim()) {
        formData.append("buttonText", buttonText.trim());
        formData.append("buttonUrl", buttonUrl.trim());
      }
      
      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      const result = await broadcastToTelegram(formData);
      if (result.success) {
        setBroadcastMessage("");
        clearImage();
        setSuccessDetails(result.message);
        setShowCelebration(true);
        fireConfetti();
      } else {
        setBroadcastError(`Broadcast Failed: ${result.error}`);
      }
    } catch (e: any) {
      setBroadcastError("An unexpected error occurred while sending the broadcast.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleDisconnect = async (chatId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to disconnect ${studentName}'s Telegram account?`)) return;
    try {
      const { error } = await supabase.from("telegram_users").delete().eq("chat_id", chatId);
      if (error) throw error;
      alert(`${studentName}'s Telegram unlinked successfully`);
      setStudents(students.filter((s) => s.chat_id !== chatId));
      
      const newSelected = new Set(selectedChatIds);
      newSelected.delete(chatId);
      setSelectedChatIds(newSelected);
    } catch (error) {
      console.error("Error unlinking:", error);
      alert("Failed to unlink account");
    }
  };

  const filteredStudents = students.filter((s) => {
    const searchString = `${s.profile.name} ${s.profile.roll_number} ${s.profile.department}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const toggleStudentSelection = (chatId: string) => {
    const newSelected = new Set(selectedChatIds);
    if (newSelected.has(chatId)) {
      newSelected.delete(chatId);
    } else {
      newSelected.add(chatId);
    }
    setSelectedChatIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedChatIds.size === filteredStudents.length && filteredStudents.length > 0) {
      // Deselect all filtered
      const newSelected = new Set(selectedChatIds);
      filteredStudents.forEach(s => newSelected.delete(s.chat_id));
      setSelectedChatIds(newSelected);
    } else {
      // Select all filtered
      const newSelected = new Set(selectedChatIds);
      filteredStudents.forEach(s => newSelected.add(s.chat_id));
      setSelectedChatIds(newSelected);
    }
  };

  const isAllFilteredSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedChatIds.has(s.chat_id));

  return (
    <div className="space-y-6 relative">
      {/* Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full border-4 border-slate-900 shadow-[12px_12px_0_0_rgba(15,23,42,1)] flex flex-col items-center text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 border-4 border-green-200 shadow-inner">
              <PartyPopper className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Message Sent!</h2>
            <p className="text-slate-600 font-medium mb-8">
              {successDetails}
            </p>
            <button 
              onClick={() => setShowCelebration(false)}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-[4px_4px_0_0_#94a3b8] active:translate-y-1 active:shadow-[0px_0px_0_0_#94a3b8]"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-[8px_8px_0_0_rgba(15,23,42,1)] border-4 border-slate-900 relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
              <Send className="w-8 h-8" />
              Telegram Management
            </h1>
            <p className="text-blue-100 text-lg font-medium max-w-lg">
              Monitor and manage students who have connected their Telegram accounts to the REC Portal bot.
            </p>
          </div>
          <Send className="absolute -right-6 -bottom-6 w-48 h-48 text-white/10 -rotate-12" />
        </div>

        <div className="bg-white rounded-3xl p-8 border-4 border-slate-900 shadow-[8px_8px_0_0_rgba(15,23,42,1)] flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 border-2 border-blue-200">
            <Users className="w-8 h-8" />
          </div>
          <p className="text-slate-500 font-bold mb-1">Total Linked</p>
          <p className="text-4xl font-black text-slate-900">
            {loading ? <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /> : students.length}
          </p>
        </div>
      </div>

      {/* Broadcast Message Card */}
      <div className="bg-white rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0_0_rgba(15,23,42,1)] overflow-hidden">
        <div className="p-6 border-b-4 border-slate-900 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center border-2 border-blue-200">
              <Send className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Broadcast Message</h2>
              <p className="text-slate-500 font-medium">Send an instant alert to selected students.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-500">Message Type:</span>
            <select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value)}
              className="px-4 py-2 border-2 border-slate-300 rounded-lg font-bold text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="general">📢 General Announcement</option>
              <option value="alert">⚠️ Important Alert</option>
              <option value="update">📝 Academic Update</option>
              <option value="results">🎯 Results Published</option>
            </select>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {broadcastError && (
            <div className="p-4 rounded-xl border-2 flex items-center gap-3 font-bold bg-red-50 border-red-200 text-red-700">
              <X className="w-5 h-5" />
              {broadcastError}
            </div>
          )}

          <textarea
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            placeholder="Type your official announcement here..."
            className="w-full h-32 p-4 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 font-medium transition-all resize-none"
            disabled={isBroadcasting}
          />
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Button Text (Optional, e.g. View Dashboard)"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                disabled={isBroadcasting}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 font-medium transition-all"
              />
            </div>
            <div className="flex-1">
              <input
                type="url"
                placeholder="Button URL (e.g. https://rec.edu)"
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
                disabled={isBroadcasting}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 font-medium transition-all"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <input 
                type="file" 
                accept="image/jpeg, image/png" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImageChange}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors border-2 border-slate-300"
              >
                <ImageIcon className="w-5 h-5" />
                Attach Image
              </button>
              
              {imagePreview && (
                <div className="relative group">
                  <Image src={imagePreview} alt="Preview" width={48} height={48} className="h-12 w-12 object-cover rounded-lg border-2 border-slate-300" unoptimized />
                  <button 
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleBroadcast}
              disabled={isBroadcasting || !broadcastMessage.trim() || selectedChatIds.size === 0}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-blue-800 shadow-[4px_4px_0_0_#1e40af]"
            >
              {isBroadcasting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send to {selectedChatIds.size} student{selectedChatIds.size !== 1 && 's'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0_0_rgba(15,23,42,1)] overflow-hidden">
        <div className="p-6 border-b-4 border-slate-900 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-900">Linked Students</h2>
            <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-sm border-2 border-blue-200">
              {selectedChatIds.size} Selected
            </span>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 font-medium transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-600" />
              <p className="font-medium">Loading linked students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-lg font-bold text-slate-900">No students found</p>
              <p className="font-medium text-slate-500">
                {searchTerm ? "Try adjusting your search" : "No students have linked their Telegram accounts yet."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-4 border-slate-900">
                  <th className="p-4">
                    <button onClick={toggleAll} className="flex items-center justify-center w-6 h-6 rounded border-2 border-slate-400 hover:border-blue-500 text-blue-600 transition-colors">
                      {isAllFilteredSelected && <CheckSquare className="w-5 h-5" />}
                    </button>
                  </th>
                  <th className="p-4 font-bold text-slate-700 whitespace-nowrap">Student</th>
                  <th className="p-4 font-bold text-slate-700 whitespace-nowrap">Roll No</th>
                  <th className="p-4 font-bold text-slate-700 whitespace-nowrap">Dept & Sec</th>
                  <th className="p-4 font-bold text-slate-700 whitespace-nowrap">Chat ID</th>
                  <th className="p-4 font-bold text-slate-700 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100">
                {filteredStudents.map((student) => {
                  const isSelected = selectedChatIds.has(student.chat_id);
                  return (
                  <tr 
                    key={student.chat_id} 
                    className={`transition-colors ${isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50'}`}
                  >
                    <td className="p-4">
                      <button onClick={() => toggleStudentSelection(student.chat_id)} className={`flex items-center justify-center w-6 h-6 rounded border-2 transition-colors ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 hover:border-blue-400 text-transparent'}`}>
                        <CheckSquare className="w-5 h-5" />
                      </button>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-slate-900">{student.profile.name}</p>
                        <p className="text-sm font-medium text-slate-500">{student.profile.email}</p>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-700">{student.profile.roll_number || "-"}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border-2 border-slate-200">
                        {student.profile.department} {student.profile.section ? `- ${student.profile.section}` : ""}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-sm font-bold text-slate-500">
                      {student.chat_id}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDisconnect(student.chat_id, student.profile.name)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-colors border-2 border-red-200"
                        title="Disconnect User"
                      >
                        <Unlink className="w-4 h-4" />
                        <span className="hidden sm:inline">Unlink</span>
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
