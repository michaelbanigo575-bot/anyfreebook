import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const path = `test-conversion/${Date.now()}-test-upload.docx`;
const file = fs.readFileSync('D:/ANYFREEBOOK/test-upload.docx');

const { error: upErr } = await sb.storage.from('publications').upload(path, file, {
  contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  upsert: false,
});
if (upErr) { console.error('UPLOAD ERROR', upErr); process.exit(1); }

const { data } = sb.storage.from('publications').getPublicUrl(path);
console.log('Uploaded:', data.publicUrl);

const res = await fetch('https://anyfreebook.com/api/convert-to-pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: data.publicUrl, format: 'docx' }),
});
const json = await res.json();
console.log('Convert response status:', res.status);
console.log('Convert response body:', json);

if (json.url) {
  const pdfRes = await fetch(json.url);
  const buf = Buffer.from(await pdfRes.arrayBuffer());
  const isPdf = buf.slice(0, 5).toString() === '%PDF-';
  console.log('PDF fetch status:', pdfRes.status, 'bytes:', buf.length, 'valid PDF header:', isPdf);

  // cleanup: remove both original and converted test files
  const convertedPath = decodeURIComponent(new URL(json.url).pathname.split('/publications/')[1]);
  await sb.storage.from('publications').remove([path, convertedPath]);
  console.log('Cleaned up test files.');
} else {
  await sb.storage.from('publications').remove([path]);
  console.log('Cleaned up original test file (conversion failed).');
}
