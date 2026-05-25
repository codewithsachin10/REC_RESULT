"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PresenceTracker() {
  useEffect(() => {
    const trackPresence = async () => {
      const supabase = createClient();
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // 1. Record Daily Visit
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Fire and forget upsert for today's visit
        supabase
          .from('daily_visits')
          .upsert({ 
            user_id: session.user.id, 
            visit_date: today 
          }, { 
            onConflict: 'user_id,visit_date' 
          })
          .then(({ error }) => {
            if (error) console.error("Error recording daily visit:", error);
          });

        // 2. Join Global Presence Channel
        const channel = supabase.channel('global_presence', {
          config: {
            presence: {
              key: session.user.id,
            },
          },
        });

        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const count = Object.keys(state).length;
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('presence-update', { detail: { count } }));
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.track({
                user_id: session.user.id,
                online_at: new Date().toISOString(),
              });
            }
          });

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    const cleanup = trackPresence();

    return () => {
      cleanup.then(cleanFn => {
        if (cleanFn) cleanFn();
      });
    };
  }, []);

  return null; // This component doesn't render anything
}
