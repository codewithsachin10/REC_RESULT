const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wxufdxrrwdjakqyygpvl.supabase.co';
const supabaseKey = 'sb_publishable_hnq0dKTZqji8HgsGNoJsag_TzCL0T3K';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('retests').select('*').limit(1);
  console.log("Data:", data);
  console.log("Error:", error);
}
check();
