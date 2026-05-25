"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, CheckCircle2, AlertCircle, Check } from "lucide-react";

export default function PublicFormPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Form submission state
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchForm = async () => {
      const { data, error } = await supabase
        .from('custom_forms')
        .select('*')
        .eq('id', resolvedParams.id)
        .single();
        
      if (error || !data) {
        console.error("Form fetch error:", error);
      } else {
        setForm(data);
        // Initialize form data state with empty strings for each field
        const initialData: Record<string, string> = {};
        data.fields.forEach((f: any) => {
          initialData[f.id] = "";
        });
        setFormData(initialData);
      }
      setLoading(false);
    };

    fetchForm();
  }, [resolvedParams.id]);

  const handleChange = (fieldId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleCheckboxChange = (fieldId: string, option: string, isChecked: boolean) => {
    setFormData(prev => {
      const currentVal = prev[fieldId] || "";
      let arr = currentVal ? currentVal.split(", ") : [];
      
      if (isChecked) {
        if (!arr.includes(option)) arr.push(option);
      } else {
        arr = arr.filter(item => item !== option);
      }
      
      return {
        ...prev,
        [fieldId]: arr.join(", ")
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate required fields
    for (const field of form.fields) {
      if (field.required && !formData[field.id]?.trim()) {
        setError(`Please fill out the required field: ${field.label}`);
        setIsSubmitting(false);
        return;
      }
    }

    // Submit data
    const { error: submitError } = await supabase
      .from('form_submissions')
      .insert([{
        form_id: resolvedParams.id,
        data: formData
      }]);

    setIsSubmitting(false);

    if (submitError) {
      setError("Failed to submit form. Please try again.");
    } else {
      setIsSuccess(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-[4px] border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border-[3px] border-slate-900 rounded-2xl p-8 text-center shadow-[8px_8px_0_0_#0f172a]">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-900 mb-2">Form Not Found</h1>
          <p className="text-slate-500 font-bold">This form may have been deleted or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  if (form.is_active === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border-[3px] border-slate-900 rounded-2xl p-8 text-center shadow-[8px_8px_0_0_#0f172a]">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-900 mb-2">Form Closed</h1>
          <p className="text-slate-500 font-bold">This form is currently disabled by the administrator and is no longer accepting responses.</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border-[3px] border-slate-900 rounded-2xl p-8 text-center shadow-[8px_8px_0_0_#0f172a] animate-in zoom-in-95 duration-500">
          <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full border-[3px] border-emerald-900 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-emerald-700" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Submitted Successfully!</h1>
          <p className="text-slate-500 font-bold mb-8">Thank you. Your response has been securely recorded.</p>
          <button 
            onClick={() => {
              // Reset form to submit another
              const resetData: Record<string, string> = {};
              form.fields.forEach((f: any) => resetData[f.id] = "");
              setFormData(resetData);
              setIsSuccess(false);
            }}
            className="w-full py-3 bg-slate-900 text-white font-black rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all"
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Branding header if needed, but keeping it clean */}
        <div className="text-center">
          <div className="inline-block bg-white p-2 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] mb-6">
            <img src="/rec-logo.png" alt="REC Logo" className="h-12 w-auto object-contain" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border-[3px] border-slate-900 rounded-2xl shadow-[8px_8px_0_0_#0f172a] overflow-hidden">
          {/* Form Header */}
          <div className="bg-blue-600 p-8 border-b-[3px] border-slate-900 text-white">
            <h1 className="text-3xl font-black tracking-tight mb-2">{form.title}</h1>
            {form.description && (
              <p className="text-blue-100 font-bold whitespace-pre-wrap">{form.description}</p>
            )}
          </div>

          {/* Form Fields */}
          <div className="p-8 space-y-8">
            {error && (
              <div className="p-4 bg-rose-50 border-[3px] border-rose-900 rounded-xl text-rose-900 font-bold flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {form.fields.map((field: any) => (
              <div key={field.id} className="space-y-2">
                <label className="block text-sm font-black text-slate-900">
                  {field.label} {field.required && <span className="text-rose-500 ml-1">*</span>}
                </label>
                
                {field.type === 'textarea' && (
                  <textarea 
                    required={field.required}
                    value={formData[field.id] || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    className="w-full border-[3px] border-slate-900 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all min-h-[120px]"
                    placeholder="Enter your response..."
                  />
                )}
                
                {field.type === 'select' && (
                  <select
                    required={field.required}
                    value={formData[field.id] || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    className="w-full border-[3px] border-slate-900 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all bg-white"
                  >
                    <option value="" disabled>Select an option</option>
                    {field.options?.map((opt: string, i: number) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {field.type === 'radio' && (
                  <div className="space-y-3 mt-2">
                    {field.options?.map((opt: string, i: number) => (
                      <label key={i} className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="radio" 
                            name={field.id}
                            required={field.required}
                            value={opt}
                            checked={formData[field.id] === opt}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            className="peer sr-only"
                          />
                          <div className="w-6 h-6 border-[3px] border-slate-300 rounded-full group-hover:border-slate-900 peer-checked:border-blue-600 transition-all"></div>
                          <div className="absolute w-3 h-3 bg-blue-600 rounded-full opacity-0 peer-checked:opacity-100 transition-all scale-50 peer-checked:scale-100"></div>
                        </div>
                        <span className="font-bold text-slate-700 group-hover:text-slate-900">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {field.type === 'checkbox' && (
                  <div className="space-y-3 mt-2">
                    {field.options?.map((opt: string, i: number) => {
                      const isChecked = (formData[field.id] || "").split(", ").includes(opt);
                      return (
                        <label key={i} className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative flex items-center justify-center">
                            <input 
                              type="checkbox" 
                              value={opt}
                              checked={isChecked}
                              onChange={(e) => handleCheckboxChange(field.id, opt, e.target.checked)}
                              className="peer sr-only"
                            />
                            <div className="w-6 h-6 border-[3px] border-slate-300 rounded md:rounded-lg group-hover:border-slate-900 peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all"></div>
                            <Check className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={4} />
                          </div>
                          <span className="font-bold text-slate-700 group-hover:text-slate-900">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {['text', 'number', 'email', 'date'].includes(field.type) && (
                  <input 
                    type={field.type} 
                    required={field.required}
                    value={formData[field.id] || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    className="w-full border-[3px] border-slate-900 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
                    placeholder={`Enter ${field.type === 'number' ? 'a number' : field.type === 'date' ? '' : 'your response'}...`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Form Footer */}
          <div className="bg-slate-50 p-8 border-t-[3px] border-slate-900">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-blue-600 text-white text-lg font-black rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-[3px] border-white border-t-transparent"></div>
                  Submitting...
                </>
              ) : (
                <>
                  Submit Response <Send className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
