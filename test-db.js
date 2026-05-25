const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wxufdxrrwdjakqyygpvl.supabase.co';
const supabaseKey = 'sb_publishable_hnq0dKTZqji8HgsGNoJsag_TzCL0T3K';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').ilike('name', '%Visvanathan%');
  console.log(data);
}
check();
