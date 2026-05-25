"use server";

import { createClient } from "@/lib/supabase/server";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTelegramNotification(studentId: string, message: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.role !== 'faculty') {
      return { success: false, error: "Unauthorized" };
    }
    
    // Get chat ID
    const { data: telegramUser } = await supabase
      .from('telegram_users')
      .select('chat_id')
      .eq('student_id', studentId)
      .single();
      
    if (!telegramUser?.chat_id) {
      // Fallback to Email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('id', studentId)
        .single();

      if (profile?.email && process.env.RESEND_API_KEY) {
        // Basic HTML email conversion
        const htmlMessage = message.replace(/\n/g, '<br/>');
        
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: profile.email,
          subject: 'REC Portal Notification',
          html: `<p>Hello ${profile.name || 'Student'},</p><p>${htmlMessage}</p>`
        });
        return { success: true, via: 'email' };
      }
      return { success: false, error: "User not connected to Telegram and no valid email found" };
    }
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN is not set");
      return { success: false, error: "Server configuration error" };
    }
    
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: telegramUser.chat_id,
        text: message,
        parse_mode: "HTML"
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Failed to send telegram message:", errorData);
      return { success: false, error: "Failed to dispatch message to Telegram" };
    }
    
    return { success: true, via: 'telegram' };
  } catch (err: any) {
    console.error("Telegram notification error:", err);
    return { success: false, error: err.message };
  }
}
