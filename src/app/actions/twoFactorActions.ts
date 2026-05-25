"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// Toggle 2FA in the database
export async function toggleTwoFactor(enabled: boolean) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    return { success: false, error: "Unauthorized" };
  }

  // Update the telegram_users table
  const { error } = await supabase
    .from("telegram_users")
    .update({ two_factor_enabled: enabled })
    .eq("student_id", userData.user.id);

  if (error) {
    console.error("Error toggling 2FA:", error);
    return { success: false, error: "Failed to update 2FA settings." };
  }

  return { success: true, message: `Two-Step Verification ${enabled ? 'enabled' : 'disabled'} successfully.` };
}

// Generate and send OTP via Telegram
export async function sendTelegramOTP(chatId: string) {
  try {
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in a secure, HTTP-only cookie with a 5-minute expiration
    const cookieStore = await cookies();
    cookieStore.set("telegram_otp_hash", btoa(otp), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 300, // 5 minutes
      path: "/",
    });

    // Send the OTP via Telegram API
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const message = `🔒 *REC Portal Verification*\n\nYour Two-Step Verification code is: \`${otp}\`\n\nThis code will expire in 5 minutes. Do not share it with anyone.`;
    
    const telegramData = new FormData();
    telegramData.append("chat_id", chatId);
    telegramData.append("text", message);
    telegramData.append("parse_mode", "Markdown");

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      body: telegramData,
    });

    if (!response.ok) {
      return { success: false, error: "Failed to send code via Telegram." };
    }

    return { success: true, message: "Code sent successfully." };
  } catch (error: any) {
    return { success: false, error: "An unexpected error occurred." };
  }
}

// Verify the provided OTP against the cookie
export async function verifyTelegramOTP(code: string) {
  const cookieStore = await cookies();
  const storedHash = cookieStore.get("telegram_otp_hash")?.value;

  if (!storedHash) {
    return { success: false, error: "Code expired or not found. Please request a new one." };
  }

  const storedOtp = atob(storedHash);

  if (code === storedOtp) {
    // Code is correct, set the verified cookie and delete the hash
    cookieStore.delete("telegram_otp_hash");
    cookieStore.set("telegram_2fa_verified", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
    return { success: true };
  } else {
    return { success: false, error: "Invalid code. Please try again." };
  }
}
