"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import crypto from "crypto";

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
    const cookieStore = await cookies();
    
    // Rate Limiting: Prevent requesting an OTP more than once per 60 seconds
    const lastRequest = cookieStore.get("telegram_otp_last_request")?.value;
    if (lastRequest && Date.now() - parseInt(lastRequest) < 60000) {
      return { success: false, error: "Please wait 60 seconds before requesting a new code." };
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash the OTP securely
    const secret = process.env.TELEGRAM_BOT_TOKEN || 'rec_portal_fallback_secret';
    const hash = crypto.createHmac('sha256', secret).update(otp).digest('hex');
    
    // Store hashed OTP in a secure, HTTP-only cookie with a 5-minute expiration
    cookieStore.set("telegram_otp_hash", hash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 300, // 5 minutes
      path: "/",
    });
    
    // Set rate limit cookie
    cookieStore.set("telegram_otp_last_request", Date.now().toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60, // 60 seconds
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

  const secret = process.env.TELEGRAM_BOT_TOKEN || 'rec_portal_fallback_secret';
  const inputHash = crypto.createHmac('sha256', secret).update(code).digest('hex');

  if (inputHash === storedHash) {
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
