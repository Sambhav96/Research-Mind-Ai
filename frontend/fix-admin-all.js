const fs = require('fs');
const path = require('path');

// Recursive function to get all files
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, '/', file));
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles('c:/Users/sambh/OneDrive/Desktop/Scholar ai/frontend/src/app/(admin)/admin/(protected)');

for (const file of allFiles) {
  if (!file.endsWith('.tsx')) continue;
  if (file.includes('layout.tsx')) continue;
  
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(/import \{ AdminGuard \} from .*\n/g, '');
  content = content.replace(/import \{ AdminNavbar \} from .*\n/g, '');
  
  content = content.replace(/<AdminGuard>\s*/g, '');
  content = content.replace(/<\/AdminGuard>\s*/g, '');
  content = content.replace(/<AdminNavbar \/>\s*/g, '');
  
  content = content.replace(/<div className=\"min-h-screen bg-slate-[^>]*>\s*/g, '<div>\n');
  content = content.replace(/<div className=\"min-h-screen bg-slate-950\">\s*/g, '<div>\n');
  
  content = content.replace(/<main className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8\">/g, '<div className=\"max-w-7xl mx-auto space-y-8\">');
  content = content.replace(/<main className=\"max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6\">/g, '<div className=\"max-w-5xl mx-auto space-y-6\">');
  content = content.replace(/<\/main>/g, '</div>');
  
  if (original !== content) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
}
