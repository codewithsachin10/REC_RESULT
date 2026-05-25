"use client";

import { useState, useEffect } from "react";
import { LifeBuoy, Mail, MessageSquareWarning, ChevronDown, Phone, FileText, Send, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const FAQS = [
  {
    question: "When are the exam results typically published?",
    answer: "Results are usually published within 2-3 weeks after the final exam date. You will receive an announcement notification on your dashboard when they are ready."
  },
  {
    question: "I found a discrepancy in my marks. What should I do?",
    answer: "If you believe there is an error in your marks, you can raise a formal query through the 'Query Management' portal. Be sure to provide specific details about the discrepancy."
  },
  {
    question: "How do I apply for a retest?",
    answer: "Retest applications are opened shortly after results are published. Look for an announcement regarding retest dates, or check the 'Performance' tab to see if you are eligible."
  },
  {
    question: "My personal details (name/roll number) are incorrect.",
    answer: "Please contact the admin office immediately at admin@rec.edu with your valid college ID attached to get your profile details corrected."
  },
  {
    question: "I am unable to view my results due to a 'Fee Due' hold.",
    answer: "Results are withheld if there are outstanding fee balances. Please clear your dues with the accounts department and your results will be unblocked automatically within 24 hours."
  }
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0); // First one open by default
  const [isTelegramConnected, setIsTelegramConnected] = useState(false);

  useEffect(() => {
    const checkTelegram = async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: telegramData } = await supabase
          .from('telegram_users')
          .select('chat_id')
          .eq('student_id', userData.user.id)
          .single();
        if (telegramData?.chat_id) {
          setIsTelegramConnected(true);
        }
      }
    };
    checkTelegram();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Support Center</h1>
          <p className="text-slate-500 font-bold mt-1 text-lg">Find answers to your questions or get in touch with us.</p>
        </div>
        <div className="bg-blue-100 text-blue-800 p-3 rounded-2xl border-[3px] border-blue-900 shadow-[4px_4px_0_0_#1e3a8a] flex items-center justify-center shrink-0">
          <LifeBuoy className="h-8 w-8" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content: FAQs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border-[3px] border-slate-900 shadow-[8px_8px_0_0_#0f172a] p-8">
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <FileText className="h-6 w-6 text-blue-600" />
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-4">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                
                return (
                  <div 
                    key={idx} 
                    className={cn(
                      "border-[3px] border-slate-900 rounded-2xl overflow-hidden transition-all duration-300",
                      isOpen ? "shadow-[4px_4px_0_0_#0f172a]" : "hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a]"
                    )}
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-5 bg-white text-left focus:outline-none"
                    >
                      <span className="font-black text-slate-900 text-lg pr-4">{faq.question}</span>
                      <div className={cn(
                        "w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center shrink-0 transition-transform duration-300",
                        isOpen ? "bg-slate-900 text-white rotate-180" : "bg-slate-100 text-slate-900"
                      )}>
                        <ChevronDown className="h-5 w-5" />
                      </div>
                    </button>
                    
                    <div 
                      className={cn(
                        "overflow-hidden transition-all duration-300 bg-slate-50 border-t-[3px] border-slate-900",
                        isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 border-t-0"
                      )}
                    >
                      <p className="p-5 text-slate-700 font-bold leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Links */}
        <div className="space-y-6">
          {/* Action Card 1: Queries */}
          <div className="bg-blue-600 rounded-3xl border-[3px] border-slate-900 shadow-[6px_6px_0_0_#0f172a] p-6 text-white relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
            
            <MessageSquareWarning className="h-10 w-10 mb-4" />
            <h3 className="text-xl font-black mb-2">Have a specific issue?</h3>
            <p className="text-blue-100 font-bold mb-6 text-sm">
              If you found a discrepancy in your results or have a specific problem, raise a ticket with your faculty.
            </p>
            <Link 
              href="/dashboard/queries"
              className="w-full py-3 bg-white text-slate-900 font-black rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all flex items-center justify-center gap-2"
            >
              Raise a Query
            </Link>
          </div>

          {/* Action Card 2: Telegram Bot */}
          <div className={cn(
            "bg-white rounded-3xl border-[3px] p-6 text-center flex flex-col items-center justify-center transition-all duration-500 relative overflow-hidden",
            isTelegramConnected 
              ? "border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.5)]" 
              : "border-slate-900 shadow-[6px_6px_0_0_#0f172a]"
          )}>
            {isTelegramConnected && (
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-400 rounded-full blur-3xl opacity-20"></div>
            )}
            <div className={cn(
              "w-12 h-12 rounded-full border-2 flex items-center justify-center mb-4 transition-colors",
              isTelegramConnected ? "bg-emerald-100 border-emerald-900 text-emerald-600" : "bg-sky-100 border-sky-900 text-sky-600"
            )}>
              {isTelegramConnected ? <CheckCircle2 className="h-6 w-6" /> : <Send className="h-6 w-6" />}
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">
              {isTelegramConnected ? "Telegram Connected" : "Connect Telegram"}
            </h3>
            <p className="text-sm font-bold text-slate-500 mb-4 z-10 relative">
              {isTelegramConnected 
                ? "You are receiving instant result notifications directly to your Telegram app!" 
                : "Get instant notifications for your results and announcements directly on Telegram."}
            </p>
            
            {!isTelegramConnected && (
              <div className="bg-white p-2 border-2 border-slate-200 rounded-xl mb-4 inline-block shadow-sm">
                <Image 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://t.me/rec_result_bot" 
                  alt="Telegram Bot QR Code" 
                  width={128}
                  height={128}
                  className="w-32 h-32 object-contain rounded-lg"
                  unoptimized
                />
              </div>
            )}
            
            <a 
              href="https://t.me/rec_result_bot" 
              target="_blank" 
              rel="noopener noreferrer"
              className={cn(
                "w-full py-3 font-black rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all flex items-center justify-center gap-2 z-10 relative",
                isTelegramConnected ? "bg-emerald-500 text-white" : "bg-[#2AABEE] text-white"
              )}
            >
              {isTelegramConnected ? "Open Telegram Bot" : "Open in Telegram"}
            </a>
          </div>
          {/* Action Card 3: Contact Admin */}
          <div className="bg-white rounded-3xl border-[3px] border-slate-900 shadow-[6px_6px_0_0_#0f172a] p-6">
            <h3 className="text-xl font-black text-slate-900 mb-4">Contact Admin</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200 bg-slate-50 hover:border-slate-900 transition-colors">
                <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-emerald-900 text-emerald-700 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-black text-slate-900">Email Support</p>
                  <p className="text-sm font-bold text-slate-500">admin@rec.edu</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200 bg-slate-50 hover:border-slate-900 transition-colors">
                <div className="w-10 h-10 rounded-full bg-purple-100 border-2 border-purple-900 text-purple-700 flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-black text-slate-900">Call Helpdesk</p>
                  <p className="text-sm font-bold text-slate-500">+91 44 2715 6151</p>
                  <p className="text-xs font-bold text-slate-400 mt-1">Mon - Fri, 9AM to 4PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
