const https = require('https');

const options = {
  hostname: 'wxufdxrrwdjakqyygpvl.supabase.co',
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': 'sb_publishable_hnq0dKTZqji8HgsGNoJsag_TzCL0T3K',
    'Authorization': 'Bearer sb_publishable_hnq0dKTZqji8HgsGNoJsag_TzCL0T3K'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const schema = JSON.parse(data);
    console.log('Tables:', Object.keys(schema.definitions));
    if (schema.definitions.queries) {
      console.log('Queries:', schema.definitions.queries.properties);
    }
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.end();
