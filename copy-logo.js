const fs = require('fs');
const path = require('path');

const src = 'C:/Users/Pardhu/.gemini/antigravity/brain/f153649e-9db1-4b6a-8037-d206bbcce5b9/.user_uploaded/media_1791549242045.png';
const dest = path.join(__dirname, 'public', 'acm-logo.png');

try {
  fs.copyFileSync(src, dest);
  console.log('✅ ACM NIT Surat Logo successfully copied to public/acm-logo.png!');
} catch (err) {
  console.error('Failed to copy logo:', err);
}
