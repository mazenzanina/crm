import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BRAND_LOGO_SRC } from '../src/lib/brandLogo';

const project = process.cwd();

// The live CRM returned 404 for /img/logo-icon.png and 400 from Next's image
// optimizer. The same original artwork is now embedded directly in every UI.
test('all public and admin logo instances use the bundled original logo', () => {
  const image = readFileSync(join(project, 'public/img/logo-icon.png'));
  assert.ok(BRAND_LOGO_SRC.startsWith('data:image/png;base64,'));
  assert.deepEqual(Buffer.from(BRAND_LOGO_SRC.split(',')[1]!, 'base64'), image);
  assert.deepEqual(readFileSync(join(project, 'src/app/icon.png')), image);
  for (const source of ['src/components/Signup.tsx', 'src/components/AdminApp.tsx', 'src/app/reset-password/page.tsx']) {
    const content = readFileSync(join(project, source), 'utf-8');
    assert.match(content, /src=\{BRAND_LOGO_SRC\} unoptimized/);
    assert.doesNotMatch(content, /src="\/img\/logo-icon\.png"/);
  }
});

test('manual delivery remains manual-only with public Tarot TN branding', () => {
  const publicForm = readFileSync(join(project, 'src/components/Signup.tsx'), 'utf-8');
  const admin = readFileSync(join(project, 'src/components/AdminApp.tsx'), 'utf-8');
  const privacy = readFileSync(join(project, 'src/app/privacy/page.tsx'), 'utf-8');
  assert.match(publicForm, /TAROT TN/);
  assert.match(admin, /TAROT TN/);
  assert.match(privacy, /Tarot TN/);
  assert.match(admin, /Open WhatsApp/);
  assert.match(privacy, /No messages are sent automatically/);
});
