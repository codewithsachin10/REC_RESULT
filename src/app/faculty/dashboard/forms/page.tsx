"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Settings, Check, Trash2, ArrowLeft, FormInput, ListFilter, Edit3, Users, PowerOff, Power, PlusCircle, X, ExternalLink, Copy, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type FieldType = "text" | "number" | "email" | "textarea" | "date" | "select" | "radio" | "checkbox";

interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // For select, radio, and checkbox
}

export default function FormBuilderPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Builder State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createClient();

  const fetchForms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('custom_forms')
      .select('*, form_submissions(id)')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setForms(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleCreateNew = () => {
    setTitle("");
    setDescription("");
    setFields([]);
    setEditingId(null);
    setIsBuilding(true);
  };

  const handleEdit = (form: any) => {
    setTitle(form.title);
    setDescription(form.description || "");
    setFields(form.fields || []);
    setEditingId(form.id);
    setIsBuilding(true);
  };

  const toggleActiveStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('custom_forms')
      .update({ is_active: !currentStatus })
      .eq('id', id);
      
    if (error) {
      alert("Failed to update status. Have you added the 'is_active' column to the database?");
    } else {
      fetchForms();
    }
  };

  const toggleVisibilityStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('custom_forms')
      .update({ visible_to_students: !currentStatus })
      .eq('id', id);
      
    if (error) {
      alert("Failed to update visibility. Please run the SQL script to add 'visible_to_students' column.");
    } else {
      fetchForms();
    }
  };

  const addField = () => {
    setFields([...fields, {
      id: Math.random().toString(36).substring(7),
      label: "New Field",
      type: "text",
      required: true
    }]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => {
      if (f.id === id) {
        const updated = { ...f, ...updates };
        // If switching to a type that needs options, initialize if missing
        if (['select', 'radio', 'checkbox'].includes(updated.type) && !updated.options) {
          updated.options = ["Option 1"];
        }
        return updated;
      }
      return f;
    }));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const addOption = (fieldId: string) => {
    setFields(fields.map(f => {
      if (f.id === fieldId) {
        const opts = f.options ? [...f.options] : [];
        opts.push(`Option ${opts.length + 1}`);
        return { ...f, options: opts };
      }
      return f;
    }));
  };

  const updateOption = (fieldId: string, index: number, value: string) => {
    setFields(fields.map(f => {
      if (f.id === fieldId && f.options) {
        const opts = [...f.options];
        opts[index] = value;
        return { ...f, options: opts };
      }
      return f;
    }));
  };

  const removeOption = (fieldId: string, index: number) => {
    setFields(fields.map(f => {
      if (f.id === fieldId && f.options) {
        const opts = f.options.filter((_, i) => i !== index);
        return { ...f, options: opts };
      }
      return f;
    }));
  };

  const saveForm = async () => {
    if (!title.trim() || fields.length === 0) {
      alert("Please provide a title and at least one field.");
      return;
    }

    setIsSaving(true);
    
    if (editingId) {
      const { error } = await supabase.from('custom_forms').update({
        title: title.trim(),
        description: description.trim(),
        fields: fields
      }).eq('id', editingId);

      setIsSaving(false);
      if (error) {
        alert("Failed to update form: " + error.message);
      } else {
        setIsBuilding(false);
        fetchForms();
      }
    } else {
      const { error } = await supabase.from('custom_forms').insert([{
        title: title.trim(),
        description: description.trim(),
        fields: fields,
        is_active: true
      }]);

      setIsSaving(false);
      if (error) {
        alert("Failed to save form: " + error.message);
      } else {
        setIsBuilding(false);
        fetchForms();
      }
    }
  };

  if (isBuilding) {
    return (
      <div className="max-w-4xl mx-auto pb-12 space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 border-b-[3px] border-slate-900 pb-6">
          <button 
            onClick={() => setIsBuilding(false)}
            className="p-2 border-[3px] border-slate-900 bg-white rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-slate-900 shrink-0"
          >
            <ArrowLeft className="h-5 w-5 font-bold" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{editingId ? "Edit Form" : "Create New Form"}</h2>
            <p className="text-slate-500 font-bold mt-1">Build a custom form to collect data from any department.</p>
          </div>
        </div>

        <div className="space-y-6 bg-white border-[3px] border-slate-900 p-8 rounded-2xl shadow-[6px_6px_0_0_#0f172a]">
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-900 uppercase">Form Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-[3px] border-slate-900 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
              placeholder="e.g., EEE Department Marks Collection"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-900 uppercase">Form Description (Optional)</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border-[3px] border-slate-900 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all min-h-[100px]"
              placeholder="Provide instructions for the department filling this out..."
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900">Form Fields</h3>
            <button 
              onClick={addField}
              className="px-4 py-2 bg-blue-600 text-white font-black rounded-xl border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Field
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="border-[3px] border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-500 font-bold bg-slate-50">
              No fields added yet. Click "Add Field" to start building.
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="bg-white border-[3px] border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0_0_#0f172a] flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex-1 space-y-2 w-full">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Field Label</label>
                      <input 
                        type="text" 
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 focus:border-slate-900 focus:outline-none transition-colors"
                        placeholder="e.g., Roll Number"
                      />
                    </div>
                    
                    <div className="w-full md:w-48 space-y-2 shrink-0">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Field Type</label>
                      <select 
                        value={field.type}
                        onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                        className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 focus:border-slate-900 focus:outline-none transition-colors bg-white cursor-pointer"
                      >
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="number">Number</option>
                        <option value="email">Email</option>
                        <option value="date">Date</option>
                        <option value="select">Dropdown (Select)</option>
                        <option value="radio">Single Choice (Radio)</option>
                        <option value="checkbox">Multiple Choice (Checkboxes)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-6 mt-6 shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            checked={field.required}
                            onChange={(e) => updateField(field.id, { required: e.target.checked })}
                            className="peer sr-only"
                          />
                          <div className="w-6 h-6 border-2 border-slate-400 rounded group-hover:border-slate-900 peer-checked:bg-emerald-500 peer-checked:border-emerald-700 transition-all"></div>
                          <Check className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={4} />
                        </div>
                        <span className="font-bold text-sm text-slate-700 group-hover:text-slate-900 select-none">Required</span>
                      </label>

                      <button 
                        onClick={() => removeField(field.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border-2 border-transparent hover:border-rose-200"
                        title="Remove field"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Options Editor for Select, Radio, Checkbox */}
                  {['select', 'radio', 'checkbox'].includes(field.type) && (
                    <div className="mt-4 pt-4 border-t-2 border-slate-100 pl-4 border-l-4 border-l-blue-400">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 block">Options</label>
                      <div className="space-y-3">
                        {field.options?.map((option, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input 
                              type="text"
                              value={option}
                              onChange={(e) => updateOption(field.id, optIdx, e.target.value)}
                              className="flex-1 border-2 border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-slate-900 focus:outline-none transition-colors"
                              placeholder={`Option ${optIdx + 1}`}
                            />
                            <button 
                              onClick={() => removeOption(field.id, optIdx)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                              disabled={field.options!.length <= 1}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => addOption(field.id)}
                          className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors mt-2"
                        >
                          <PlusCircle className="h-4 w-4" /> Add Option
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-6 border-t-[3px] border-slate-900 flex justify-end">
          <button 
            onClick={saveForm}
            disabled={isSaving || fields.length === 0 || !title.trim()}
            className="px-8 py-3 bg-slate-900 text-white font-black rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
          >
            {isSaving ? "Saving Form..." : editingId ? "Update Custom Form" : "Publish Custom Form"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Form Builder</h2>
          <p className="text-slate-500 font-bold mt-1">Create dynamic forms to collect data from any department.</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="px-6 py-3 bg-blue-600 text-white font-black rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all flex items-center gap-2"
        >
          <FormInput className="h-5 w-5" /> Create New Form
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-[4px] border-slate-900 border-t-transparent"></div>
        </div>
      ) : forms.length === 0 ? (
        <div className="border-[3px] border-dashed border-slate-300 rounded-3xl p-16 text-center bg-slate-50">
          <div className="bg-white w-20 h-20 rounded-full border-[3px] border-slate-900 flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0_0_#0f172a]">
            <ListFilter className="h-8 w-8 text-slate-900" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">No forms created</h3>
          <p className="text-slate-500 font-bold max-w-md mx-auto">You haven't built any custom forms yet. Click the button above to create your first form.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map(form => (
            <div key={form.id} className="bg-white border-[3px] border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[8px_8px_0_0_#0f172a] transition-all flex flex-col h-full group relative overflow-hidden">
              
              <div className="absolute top-0 right-0 flex z-10 overflow-hidden rounded-bl-xl border-b-[3px] border-l-[3px] border-slate-900">
                {form.visible_to_students ? (
                  <div className={cn("bg-blue-100 text-blue-800 text-xs font-black px-3 py-1 flex items-center gap-1", form.is_active === false ? "border-r-[3px] border-slate-900" : "")}>
                    <Eye className="w-3 h-3" /> Visible
                  </div>
                ) : (
                  <div className={cn("bg-slate-100 text-slate-600 text-xs font-black px-3 py-1 flex items-center gap-1", form.is_active === false ? "border-r-[3px] border-slate-900" : "")}>
                    <EyeOff className="w-3 h-3" /> Hidden
                  </div>
                )}
                {form.is_active === false && (
                  <div className="bg-rose-100 text-rose-800 text-xs font-black px-3 py-1 flex items-center gap-1">
                    <PowerOff className="w-3 h-3" /> Disabled
                  </div>
                )}
              </div>

              <div className="flex-1 mb-6 mt-2">
                <h3 className="text-xl font-black text-slate-900 line-clamp-1 mb-2 pr-12">{form.title}</h3>
                <p className="text-sm font-bold text-slate-500 line-clamp-2">
                  {form.description || "No description provided."}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border-2 border-slate-200 rounded-lg text-slate-700 text-xs font-bold">
                    <Settings className="w-3 h-3" /> {form.fields?.length || 0} Fields
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border-2 border-blue-200 rounded-lg text-blue-700 text-xs font-bold">
                    <Users className="w-3 h-3" /> {form.form_submissions?.length || 0} Responses
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-slate-100 flex gap-2">
                <Link 
                  href={`/faculty/dashboard/forms/${form.id}`}
                  className="flex-1 bg-slate-100 border-[3px] border-slate-900 rounded-xl px-4 py-2 text-sm font-black text-center text-slate-900 hover:bg-slate-200 transition-colors"
                >
                  Logs
                </Link>
                <a 
                  href={`/forms/${form.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-blue-100 border-[3px] border-slate-900 rounded-xl flex items-center justify-center text-blue-900 hover:bg-blue-200 transition-colors shrink-0"
                  title="Open Form"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/forms/${form.id}`);
                    alert("Link copied to clipboard!");
                  }}
                  className="w-10 h-10 bg-indigo-100 border-[3px] border-slate-900 rounded-xl flex items-center justify-center text-indigo-900 hover:bg-indigo-200 transition-colors shrink-0"
                  title="Copy Link"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleEdit(form)}
                  className="w-10 h-10 bg-amber-100 border-[3px] border-slate-900 rounded-xl flex items-center justify-center text-amber-900 hover:bg-amber-200 transition-colors shrink-0"
                  title="Edit Form"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => toggleVisibilityStatus(form.id, !!form.visible_to_students)}
                  className={cn(
                    "w-10 h-10 border-[3px] border-slate-900 rounded-xl flex items-center justify-center transition-colors shrink-0",
                    form.visible_to_students 
                      ? "bg-purple-100 text-purple-900 hover:bg-slate-100 hover:text-slate-500" 
                      : "bg-slate-100 text-slate-500 hover:bg-purple-100 hover:text-purple-900"
                  )}
                  title={form.visible_to_students ? "Hide from Student Dashboard" : "Show in Student Dashboard"}
                >
                  {form.visible_to_students ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => toggleActiveStatus(form.id, form.is_active !== false)} // Defaults to true if missing
                  className={cn(
                    "w-10 h-10 border-[3px] border-slate-900 rounded-xl flex items-center justify-center transition-colors shrink-0",
                    form.is_active === false 
                      ? "bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700" 
                      : "bg-emerald-100 text-emerald-900 hover:bg-rose-100 hover:text-rose-700"
                  )}
                  title={form.is_active === false ? "Enable Form" : "Disable Form"}
                >
                  {form.is_active === false ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
