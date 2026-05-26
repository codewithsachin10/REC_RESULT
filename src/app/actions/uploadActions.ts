"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";

export async function createUploadLog(subjectCode: string, subjectName: string, unitKey: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.user_metadata?.role !== 'faculty') {
    throw new Error("Unauthorized: Only faculty can perform this action");
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase.from('upload_logs').insert({
    subject_code: subjectCode,
    subject_name: subjectName,
    unit_key: unitKey
  }).select('id').single();
  
  if (error) throw new Error(error.message);
  return data.id;
}

export async function publishMarksChunk(uploadId: string, subjectCode: string, subjectName: string, unitKey: string, rows: any[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.user_metadata?.role !== 'faculty') {
    throw new Error("Unauthorized: Only faculty can perform this action");
  }
  
  const adminSupabase = createAdminClient();
  const inserts: any[] = [];
  const updates: any[] = [];
  const revisions: any[] = [];

  for (const row of rows) {
    if (!row.dbStudentId) continue;
    
    let newBreakdown = row.existingBreakdown || {};
    if (row.pythonBreakdown) {
       newBreakdown = {
          ...newBreakdown,
          [unitKey]: row.pythonBreakdown
       };
    }

    if (row.dbMarkId) {
      updates.push({
        id: row.dbMarkId,
        [unitKey]: row.score,
        ...(Object.keys(newBreakdown).length > 0 && { breakdown: newBreakdown }),
        status: 'Published',
        last_upload_id: uploadId
      });
      
      // Save revision for undo
      revisions.push({
         upload_log_id: uploadId,
         mark_id: row.dbMarkId,
         student_id: row.dbStudentId,
         previous_score: row.previousScore ?? null,
         previous_breakdown: row.previousBreakdown ?? null
      });
      
    } else {
      inserts.push({
        student_id: row.dbStudentId,
        subject_code: subjectCode,
        subject_name: subjectName,
        [unitKey]: row.score,
        ...(Object.keys(newBreakdown).length > 0 && { breakdown: newBreakdown }),
        status: 'Published',
        last_upload_id: uploadId
      });
    }
  }

  if (inserts.length > 0) {
    // Insert them and fetch the generated IDs so we can add to revisions
    const { data: insertedMarks, error: insErr } = await adminSupabase.from('marks').insert(inserts).select('id, student_id');
    if (insErr) throw new Error(insErr.message);
    
    if (insertedMarks) {
      for (const m of insertedMarks) {
         revisions.push({
            upload_log_id: uploadId,
            mark_id: m.id,
            student_id: m.student_id,
            previous_score: null,
            previous_breakdown: null
         });
      }
    }
  }

  if (updates.length > 0) {
    await Promise.all(
      updates.map(update => {
        const { id, ...updatePayload } = update;
        return adminSupabase.from('marks').update(updatePayload).eq('id', id);
      })
    );
  }
  
  if (revisions.length > 0) {
     await adminSupabase.from('upload_revisions').insert(revisions);
  }

  return { success: true };
}

export async function undoUpload(uploadId: string) {
   const supabase = await createClient();
   const { data: { user } } = await supabase.auth.getUser();
   if (user?.user_metadata?.role !== 'faculty') {
     throw new Error("Unauthorized: Only faculty can perform this action");
   }
   
   const adminSupabase = createAdminClient();
   
   const { data: log, error: logErr } = await adminSupabase.from('upload_logs').select('unit_key').eq('id', uploadId).single();
   if (logErr) throw new Error(logErr.message);
   
   const unitKey = log.unit_key;
   
   const { data: revisions, error: revErr } = await adminSupabase.from('upload_revisions').select('*').eq('upload_log_id', uploadId);
   if (revErr) throw new Error(revErr.message);
   
   if (!revisions) return { success: true };
   
   for (const rev of revisions) {
      if (rev.previous_score === null) {
         const { data: markData } = await adminSupabase.from('marks').select('breakdown').eq('id', rev.mark_id).single();
         let currentBreakdown = markData?.breakdown || {};
         delete currentBreakdown[unitKey];
         
         await adminSupabase.from('marks').update({
            [unitKey]: null,
            breakdown: currentBreakdown,
            last_upload_id: null
         }).eq('id', rev.mark_id);
      } else {
         await adminSupabase.from('marks').update({
            [unitKey]: rev.previous_score,
            breakdown: rev.previous_breakdown,
            last_upload_id: null
         }).eq('id', rev.mark_id);
      }
   }
   
   await adminSupabase.from('upload_logs').delete().eq('id', uploadId);
   
   return { success: true };
}

export async function logMarkView(markId: string, studentId: string, subjectCode: string, unitKey: string) {
  try {
    const supabase = await createClient();
    
    // Check if already viewed
    const { data: existing } = await supabase
      .from('mark_views')
      .select('id')
      .eq('student_id', studentId)
      .eq('subject_code', subjectCode)
      .eq('unit_key', unitKey)
      .maybeSingle();

    if (existing) {
      // Already tracked, nothing to do
      return { success: true };
    }

    // Insert new view log
    await supabase.from('mark_views').insert({
      mark_id: markId,
      student_id: studentId,
      subject_code: subjectCode,
      unit_key: unitKey,
    });

    return { success: true };
  } catch (e) {
    console.error('logMarkView error:', e);
    return { success: false };
  }
}
