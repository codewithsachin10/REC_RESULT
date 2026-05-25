"use client";

import { X, UploadCloud, Send } from "lucide-react";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import imageCompression from 'browser-image-compression';

import { sendTelegramNotification } from "@/app/actions/telegramActions";

interface QueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QueryModal({ isOpen, onClose, onSuccess }: QueryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const student_id = userData.user?.id;
    
    if (!student_id) {
      alert("Please login again.");
      setIsSubmitting(false);
      return;
    }

    let proofUrl = null;
    
    if (proofFile) {
       try {
         const options = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1024,
            useWebWorker: true
         };
         
         let fileToUpload = proofFile;
         if (proofFile.type.startsWith('image/')) {
            fileToUpload = await imageCompression(proofFile, options);
         }
         
         const fileExt = fileToUpload.name.split('.').pop();
         const fileName = `${student_id}-${Date.now()}.${fileExt}`;
         
         // Assuming 'proofs' bucket exists
         const { data: uploadData, error: uploadError } = await supabase.storage
            .from('proofs')
            .upload(fileName, fileToUpload);
            
         if (uploadError) {
            console.error("Failed to upload proof", uploadError);
         } else if (uploadData) {
            const { data: publicUrlData } = supabase.storage.from('proofs').getPublicUrl(uploadData.path);
            proofUrl = publicUrlData.publicUrl;
         }
       } catch (err) {
         console.error("Compression/Upload error", err);
       }
    }

    const { error } = await supabase
      .from('queries')
      .insert({
        student_id,
        subject_code: 'General',
        issue_type: issueType,
        description,
        status: 'pending',
        ...(proofUrl && { proof_url: proofUrl })
      });

    setIsSubmitting(false);
    
    if (error) {
      console.error("Failed to submit query:", error);
      alert(`Failed to submit query: ${error.message || error.details || JSON.stringify(error)}`);
    } else {
      // Notify via Telegram
      sendTelegramNotification(
        student_id,
        `<b>🎫 New Support Query Raised</b>\nYour query regarding <i>${issueType}</i> has been received and is now under review by the faculty.\n\nDescription: ${description}`
      );
      
      setIssueType("");
      setDescription("");
      setProofFile(null);
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border-[3px] border-slate-900 bg-white shadow-[8px_8px_0_0_#0f172a] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-[3px] border-slate-900 bg-slate-50 p-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Raise New Query</h2>
            <p className="text-sm font-semibold text-slate-500">Submit a support ticket for technical or academic issues.</p>
          </div>
          <button 
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-slate-200 hover:border-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5 text-slate-700" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">Query Type</label>
            <select 
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="h-12 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 font-semibold text-slate-900 focus:border-slate-900 focus:outline-none transition-colors" 
              required
            >
              <option value="">Select Issue Type</option>
              <option value="Portal Crash">Portal Crash</option>
              <option value="Wrong Marks">Wrong Marks Evaluated</option>
              <option value="Browser Crash">Browser Crash (SEB)</option>
              <option value="Auto Submit">Test Auto Submitted</option>
              <option value="Marked Absent">Incorrectly Marked Absent</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Explain your issue in detail..."
              className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 font-medium text-slate-900 focus:border-slate-900 focus:outline-none transition-colors resize-none"
              required
            ></textarea>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">Upload Proof (Screenshot)</label>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => setProofFile(e.target.files?.[0] || null)} 
              accept="image/png, image/jpeg, application/pdf" 
              className="hidden" 
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group"
            >
              <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="h-6 w-6 text-slate-600" />
              </div>
              <p className="font-bold text-slate-700">
                {proofFile ? proofFile.name : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-slate-500 mt-1">PNG, JPG or PDF (Auto-compressed to save space)</p>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full h-14 rounded-xl border-[3px] border-slate-900 bg-blue-900 text-white font-bold text-lg shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0f172a] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Submitting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Submit Query <Send className="h-5 w-5" />
              </span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
