"use server";

import { createClient } from "@/lib/supabase/server";

export async function broadcastToTelegram(formData: FormData) {
  const message = formData.get("message") as string;
  const messageType = formData.get("type") as string;
  const chatIdsStr = formData.get("chatIds") as string;
  const image = formData.get("image") as File | null;
  const buttonText = formData.get("buttonText") as string;
  const buttonUrl = formData.get("buttonUrl") as string;

  if (!message || message.trim() === "") {
    return { success: false, error: "Message cannot be empty." };
  }

  let chatIds: string[] = [];
  try {
    if (chatIdsStr) {
      chatIds = JSON.parse(chatIdsStr);
    }
  } catch (e) {
    return { success: false, error: "Invalid target audience." };
  }

  if (chatIds.length === 0) {
    return { success: false, error: "No students selected." };
  }

  const supabase = await createClient();

  try {
    // 1. Verify user is faculty
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return { success: false, error: "Not authenticated." };
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profileData?.role !== "faculty") {
      return { success: false, error: "Unauthorized access." };
    }

    // 2. Format Message based on type
    let header = "📢 *Official Announcement*";
    if (messageType === "alert") header = "⚠️ *Important Alert*";
    if (messageType === "update") header = "📝 *Academic Update*";
    if (messageType === "results") header = "🎯 *Results Published*";
    
    const finalMessage = `${header}\n\n${message}`;

    // 3. Build Reply Markup (Inline Keyboard) if button provided
    let replyMarkupStr = "";
    if (buttonText && buttonUrl) {
      // Basic URL validation
      const safeUrl = buttonUrl.startsWith("http") ? buttonUrl : `https://${buttonUrl}`;
      const replyMarkup = {
        inline_keyboard: [
          [
            { text: buttonText, url: safeUrl }
          ]
        ]
      };
      replyMarkupStr = JSON.stringify(replyMarkup);
    }

    // 4. Send message via Telegram API
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return { success: false, error: "Telegram Bot Token is not configured on the server." };
    }

    let successCount = 0;
    let failCount = 0;
    const hasImage = image && image.size > 0 && image.name !== "undefined";

    // Send messages concurrently
    const sendPromises = chatIds.map(async (chatId) => {
      try {
        let response;

        if (hasImage) {
          // Convert Next.js File object to standard Blob for node fetch compatibility
          const arrayBuffer = await image.arrayBuffer();
          const blob = new Blob([arrayBuffer], { type: image.type });
          
          const telegramData = new FormData();
          telegramData.append("chat_id", chatId);
          telegramData.append("caption", finalMessage);
          telegramData.append("parse_mode", "Markdown");
          telegramData.append("photo", blob, image.name);
          
          if (replyMarkupStr) {
            telegramData.append("reply_markup", replyMarkupStr);
          }

          response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: "POST",
            body: telegramData,
          });
        } else {
          // Send Text
          const payload: any = {
            chat_id: chatId,
            text: finalMessage,
            parse_mode: "Markdown",
          };

          if (replyMarkupStr) {
            payload.reply_markup = JSON.parse(replyMarkupStr);
          }

          response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
        }

        if (response.ok) {
          successCount++;
        } else {
          console.error(`Failed to send to ${chatId}:`, await response.text());
          failCount++;
        }
      } catch (e) {
        console.error(`Error sending to ${chatId}:`, e);
        failCount++;
      }
    });

    await Promise.all(sendPromises);

    return { 
      success: true, 
      message: `Broadcast complete! Sent to ${successCount} users. Failed: ${failCount}.` 
    };

  } catch (error: any) {
    console.error("Broadcast action error:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}
