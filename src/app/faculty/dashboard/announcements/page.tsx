"use client";

import { useState, useEffect } from "react";
import { Megaphone, AlertCircle, Info, Send, Clock, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Priority = "info" | "warning" | "important";

interface Announcement {
  id: string;
  title: string;
  description: string;
  type: Priority;
  created_at: string;
}

export default function FacultyAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<Priority>("info");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error("Error fetching announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('announcements')
        .insert([{
          title: title.trim(),
          description: content.trim(),
          type: priority
        }]);

      if (error) throw error;

      // Reset form and refetch
      setTitle("");
      setContent("");
      setPriority("info");
      await fetchAnnouncements();
      
      alert("Announcement posted successfully!");
    } catch (err: any) {
      console.error("Failed to post:", err);
      alert("Failed to post announcement: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchAnnouncements();
    } catch (err: any) {
      console.error("Failed to delete:", err);
      alert("Failed to delete: " + err.message);
    }
  };

  const getPriorityStyles = (type: Priority) => {
    switch(type) {
      case 'info': return 'bg-blue-300 text-blue-900 border-slate-900 shadow-[2px_2px_0_0_#0f172a]';
      case 'warning': return 'bg-amber-300 text-amber-900 border-slate-900 shadow-[2px_2px_0_0_#0f172a]';
      case 'important': return 'bg-red-300 text-red-900 border-slate-900 shadow-[2px_2px_0_0_#0f172a]';
      default: return 'bg-white text-slate-900 border-slate-900 shadow-[2px_2px_0_0_#0f172a]';
    }
  };

  const getPriorityLabel = (type: Priority) => {
    switch(type) {
      case 'info': return 'Low / General';
      case 'warning': return 'High / Warning';
      case 'important': return 'Critical / Urgent';
      default: return 'Info';
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Announcements</h2>
        <p className="text-slate-500 mt-1">Broadcast updates, deadlines, and important notices to all students.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Post New Announcement Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] overflow-hidden">
            <div className="px-6 py-4 border-b-[3px] border-slate-900 bg-slate-50">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-blue-600" />
                Post New Update
              </h3>
            </div>
            <form onSubmit={handlePostAnnouncement} className="p-6 space-y-5">
              
              <div>
                <label className="block text-sm font-black text-slate-900 mb-1.5">Announcement Title</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Unit 3 Marks Published" 
                  className="w-full border-[3px] border-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-all font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-900 mb-1.5">Priority Level</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority("info")}
                    className={`py-2 px-1 text-xs font-black rounded-lg border-[3px] border-slate-900 transition-all ${
                      priority === "info" 
                        ? "bg-blue-300 text-blue-900 shadow-[2px_2px_0_0_#0f172a]" 
                        : "bg-white text-slate-900 hover:bg-slate-50 hover:shadow-[2px_2px_0_0_#0f172a]"
                    }`}
                  >
                    Low
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority("warning")}
                    className={`py-2 px-1 text-xs font-black rounded-lg border-[3px] border-slate-900 transition-all ${
                      priority === "warning" 
                        ? "bg-amber-300 text-amber-900 shadow-[2px_2px_0_0_#0f172a]" 
                        : "bg-white text-slate-900 hover:bg-slate-50 hover:shadow-[2px_2px_0_0_#0f172a]"
                    }`}
                  >
                    High
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority("important")}
                    className={`py-2 px-1 text-xs font-black rounded-lg border-[3px] border-slate-900 transition-all ${
                      priority === "important" 
                        ? "bg-red-300 text-red-900 shadow-[2px_2px_0_0_#0f172a]" 
                        : "bg-white text-slate-900 hover:bg-slate-50 hover:shadow-[2px_2px_0_0_#0f172a]"
                    }`}
                  >
                    Critical
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-900 mb-1.5">Message Body</label>
                <textarea 
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type your complete announcement here..." 
                  className="w-full border-[3px] border-slate-900 rounded-lg px-3 py-2 font-bold text-slate-900 text-sm focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-all min-h-[120px] resize-y"
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white border-[3px] border-slate-900 font-black py-2.5 rounded-lg hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Publish Announcement
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Live Feed */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-black text-slate-900">Live Announcements</h3>
          
          {loading ? (
            <div className="bg-white border-[3px] border-slate-900 rounded-xl p-12 flex flex-col items-center justify-center text-slate-900 font-bold shadow-[4px_4px_0_0_#0f172a]">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-600" />
              <p>Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="bg-white border-[3px] border-slate-900 rounded-xl p-12 flex flex-col items-center justify-center text-slate-900 shadow-[4px_4px_0_0_#0f172a]">
              <Megaphone className="h-12 w-12 text-slate-300 mb-4" />
              <p className="font-black text-slate-900">No announcements yet</p>
              <p className="text-sm mt-1 font-bold">Create your first announcement using the form.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="bg-white border-[3px] border-slate-900 rounded-xl p-5 shadow-[4px_4px_0_0_#0f172a] group hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all relative">
                  
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      {announcement.type === "important" ? (
                        <div className="h-10 w-10 shrink-0 bg-red-300 text-red-900 border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] rounded-lg flex items-center justify-center">
                          <AlertCircle className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className={`h-10 w-10 shrink-0 border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] rounded-lg flex items-center justify-center ${
                          announcement.type === "warning" ? "bg-amber-300 text-amber-900" : "bg-blue-300 text-blue-900"
                        }`}>
                          <Info className="h-5 w-5" />
                        </div>
                      )}
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-lg border-[3px] ${getPriorityStyles(announcement.type)}`}>
                            {getPriorityLabel(announcement.type)}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-600">
                            <Clock className="h-3 w-3" />
                            {new Date(announcement.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-lg font-black text-slate-900">{announcement.title}</h4>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDelete(announcement.id)}
                      className="p-2 text-slate-900 bg-white border-[3px] border-transparent hover:border-slate-900 hover:shadow-[2px_2px_0_0_#0f172a] rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete Announcement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <p className="text-slate-900 font-bold text-sm mt-3 ml-13 pl-13 whitespace-pre-wrap leading-relaxed">
                    {announcement.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
