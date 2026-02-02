// Quick test script to check OASTH API response
const https = require('https');
const zlib = require('zlib');

const options = {
  hostname: 'old.oasth.gr',
  path: '/el/api/getStopsB/?a=1',
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  }
};

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let chunks = [];
  res.on('data', chunk => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    console.log('Raw bytes (first 50):', buffer.slice(0, 50).toString('hex'));
    
    // Check if gzip
    if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
      console.log('Response is GZIP compressed!');
      zlib.gunzip(buffer, (err, decompressed) => {
        if (err) {
          console.error('Gunzip error:', err);
        } else {
          const text = decompressed.toString('utf-8');
          console.log('Decompressed (first 500 chars):', text.substring(0, 500));
        }
      });
    } else {
      console.log('Response is NOT gzip compressed');
      console.log('Raw text (first 500 chars):', buffer.toString('utf-8').substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.end();
