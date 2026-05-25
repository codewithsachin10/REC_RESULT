const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wxufdxrrwdjakqyygpvl.supabase.co';
const supabaseKey = 'sb_publishable_hnq0dKTZqji8HgsGNoJsag_TzCL0T3K';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: userData } = await supabase.auth.getUser(); // this won't work without a token, but I can just try inserting with random UUIDs and see the constraint error, or RLS error.
  
  const { error } = await supabase.from('retests').insert({
    student_id: 'b149c042-32b0-4db0-9fbb-8e3305a415b3', // random valid uuid
    mark_id: 'b149c042-32b0-4db0-9fbb-8e3305a415b3',
    unit_key: 'unit_test_1',
    unit_label: 'Unit 1',
    subject_code: 'CS301',
    subject_name: 'Python',
    original_score: 90,
    reason: 'test',
    status: 'Pending Approval'
  });
  console.log("Error:", error);
}
check();
