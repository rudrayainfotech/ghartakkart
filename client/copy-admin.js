import fs from 'fs';
import path from 'path';

try {
  if (fs.existsSync('dist-admin/admin.html')) {
    fs.copyFileSync('dist-admin/admin.html', 'dist/admin.html');
  }
  if (fs.existsSync('dist-admin/assets')) {
    if (!fs.existsSync('dist/assets')) fs.mkdirSync('dist/assets', { recursive: true });
    const assets = fs.readdirSync('dist-admin/assets');
    for (const a of assets) {
      fs.copyFileSync(path.join('dist-admin/assets', a), path.join('dist/assets', a));
    }
  }
  console.log('✓ Admin bundle merged into dist successfully for unified hosting');
} catch (e) {
  console.warn('Warning during admin bundle merge:', e.message);
}
