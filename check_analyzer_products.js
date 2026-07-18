const fs = require('fs');
const path = require('path');

// Ported recursive directory scanner from image_analyzer.ts
function scanDirectory(dir, baseDir) {
  let results = [];
  if (!fs.existsSync(dir)) return [];
  
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(scanDirectory(fullPath, baseDir));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        const relativeFolder = path.relative(baseDir, dir).replace(/\\/g, '/');
        results.push({
          relativePath: path.relative(baseDir, fullPath).replace(/\\/g, '/'),
          absolutePath: fullPath,
          name: path.basename(file, ext),
          folder: relativeFolder
        });
      }
    }
  });
  return results;
}

function getProductGroupKey(name) {
  let key = name.replace(/\s*\(\d+\)\s*/g, '');
  key = key.replace(/[-_](gallery|model|lifestyle|editorial|banner)[-_]?\d*/gi, '');
  return key.trim().toLowerCase();
}

function generate() {
  // Go up to workspace root and down to frontend/public
  const publicDir = path.join(__dirname, '../frontend/public');
  const productsDir = path.join(publicDir, 'images/products');

  console.log('Public dir path:', publicDir);
  console.log('Products dir path:', productsDir);

  const images = scanDirectory(productsDir, publicDir);
  console.log('Total raw images found:', images.length);

  const groups = {};
  images.forEach(img => {
    const groupKey = getProductGroupKey(img.name);
    if (img.name.startsWith('.')) return;
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(img);
  });

  console.log('Unique product groups:', Object.keys(groups).length);
  Object.entries(groups).forEach(([key, list]) => {
    console.log(`- Group: ${key}, files count: ${list.length}, first image: /${list[0].relativePath}`);
  });
}

generate();
