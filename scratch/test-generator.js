import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the copy logic directly
function copyDir(src, dest, replacements = {}) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      const srcFile = path.join(src, file);
      const destName = file === '_gitignore' ? '.gitignore' : file;
      const destFile = path.join(dest, destName);
      copyDir(srcFile, destFile, replacements);
    }
  } else {
    const ext = path.extname(src).toLowerCase();
    const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.pdf', '.zip'];
    if (binaryExtensions.includes(ext)) {
      fs.copyFileSync(src, dest);
    } else {
      let content = fs.readFileSync(src, 'utf8');
      for (const [key, value] of Object.entries(replacements)) {
        content = content.replaceAll(key, value);
      }
      fs.writeFileSync(dest, content, 'utf8');
    }
  }
}

async function runTest() {
  console.log('🧪 Starting generation logic validation...');

  const templateBase = path.resolve(__dirname, '../templates');
  const testOutputBase = path.resolve(__dirname, 'test-output');

  // Clean up previous test run
  if (fs.existsSync(testOutputBase)) {
    fs.rmSync(testOutputBase, { recursive: true, force: true });
  }
  fs.mkdirSync(testOutputBase, { recursive: true });

  const variants = ['react-ts', 'react-js'];

  for (const variant of variants) {
    console.log(`\nTesting variant: ${variant}`);
    const srcDir = path.join(templateBase, variant);
    const destDir = path.join(testOutputBase, `test-app-${variant}`);

    // Run copying
    copyDir(srcDir, destDir, {
      '{{PROJECT_NAME}}': `test-app-${variant}`
    });

    // 1. Verify files exist
    const filesToVerify = [
      'package.json',
      'index.html',
      '.gitignore',
      'vite.config.' + (variant === 'react-ts' ? 'ts' : 'js'),
      'tailwind.config.js',
      'postcss.config.js',
      'src/main.' + (variant === 'react-ts' ? 'tsx' : 'jsx'),
      'src/App.' + (variant === 'react-ts' ? 'tsx' : 'jsx'),
      'src/index.css'
    ];

    for (const file of filesToVerify) {
      const filePath = path.join(destDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`❌ Missing expected file: ${file} in generated ${variant} project`);
      }
    }
    console.log('✅ All expected files generated successfully.');

    // 2. Verify token replacements in package.json
    const pkgJson = JSON.parse(fs.readFileSync(path.join(destDir, 'package.json'), 'utf8'));
    if (pkgJson.name !== `test-app-${variant}`) {
      throw new Error(`❌ Placeholder replacement failed in package.json for ${variant}. Expected name: test-app-${variant}, got: ${pkgJson.name}`);
    }
    console.log('✅ package.json name token replaced successfully.');

    // 3. Verify token replacements in index.html
    const indexHtml = fs.readFileSync(path.join(destDir, 'index.html'), 'utf8');
    if (!indexHtml.includes(`<title>test-app-${variant}</title>`)) {
      throw new Error(`❌ Placeholder replacement failed in index.html for ${variant}.`);
    }
    console.log('✅ index.html title token replaced successfully.');
  }

  console.log('\n🎉 ALL GENERATOR CHECKS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
