const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/sambh/OneDrive/Desktop/Scholar ai/frontend/src/app/(admin)/admin/(protected)';
const files = [
  path.join(dir, 'workspaces/[id]/page.tsx'),
  path.join(dir, 'workspaces/page.tsx'),
  path.join(dir, 'users/[id]/page.tsx'),
  path.join(dir, 'users/page.tsx'),
  path.join(dir, 'documents/[id]/page.tsx'),
  path.join(dir, 'documents/page.tsx')
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import \{ AdminGuard \} from .*\n/g, '');
  content = content.replace(/import \{ AdminNavbar \} from .*\n/g, '');
  
  content = content.replace(/<AdminGuard>\s*/g, '');
  content = content.replace(/<\/AdminGuard>\s*/g, '');
  content = content.replace(/<AdminNavbar \/>\s*/g, '');
  content = content.replace(/<div className=\"min-h-screen bg-slate-950[^>]*>\s*/g, '<div>\n');
  content = content.replace(/<main className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8\">/g, '<div className=\"max-w-7xl mx-auto space-y-8\">');
  content = content.replace(/<main className=\"max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6\">/g, '<div className=\"max-w-5xl mx-auto space-y-6\">');
  content = content.replace(/<\/main>/g, '</div>');

  fs.writeFileSync(file, content);
  console.log('Fixed', file);
}
