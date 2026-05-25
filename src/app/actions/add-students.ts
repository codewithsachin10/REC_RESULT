"use server";

import { createAdminClient } from "@/lib/supabase/server-admin";

type StudentInput = {
  name: string;
  roll_number: string;
  email: string;
  password?: string;
  department: string;
  year: string;
  semester: string;
  batch: string;
};

export async function addStudentsAction(students: StudentInput[]) {
  try {
    const supabaseAdmin = createAdminClient();
    
    let successCount = 0;
    let errors: { email: string; error: string }[] = [];

    for (const student of students) {
      try {
        // 1. Create the user in Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: student.email,
          password: student.password || "Changeme@123", // Default password if not provided
          email_confirm: true, // Auto-confirm email so they can log in immediately
        });

        if (authError) {
          errors.push({ email: student.email, error: authError.message });
          continue; // Skip to next student if auth creation fails
        }

        if (authData.user) {
          // 2. Create or update the profile (in case a trigger already created it)
          const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
            id: authData.user.id,
            email: student.email,
            name: student.name,
            roll_number: student.roll_number,
            department: student.department,
            year: student.year,
            semester: student.semester,
            batch: student.batch,
            role: "student", // Explicitly set role
            // Defaults for empty fields
            phone: "N/A",
            dob: "N/A",
            faculty_advisor: "N/A"
          });

          if (profileError) {
            // If profile fails, try to clean up the auth user
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            errors.push({ email: student.email, error: profileError.message });
          } else {
            successCount++;
          }
        }
      } catch (err: any) {
        errors.push({ email: student.email, error: err.message || "Unknown error" });
      }
    }

    return {
      success: true,
      successCount,
      errors,
      total: students.length
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to initialize Supabase Admin client."
    };
  }
}
