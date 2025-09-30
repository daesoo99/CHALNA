#!/usr/bin/env node

/**
 * Bundle Analysis Script for Death Clock
 * Analyzes bundle size and provides optimization recommendations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BundleAnalyzer {
  constructor() {
    this.projectRoot = __dirname;
    this.outputDir = path.join(this.projectRoot, 'bundle-analysis');
  }

  async analyzeBundleSize() {
    console.log('📊 Analyzing bundle size...');

    try {
      // Create output directory
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir);
      }

      // Generate bundle for analysis
      const bundleCommand = `npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output ${this.outputDir}/index.android.bundle --assets-dest ${this.outputDir}/assets`;

      console.log('Building bundle...');
      execSync(bundleCommand, { stdio: 'inherit' });

      // Analyze bundle
      const bundlePath = path.join(this.outputDir, 'index.android.bundle');
      const bundleStats = fs.statSync(bundlePath);
      const bundleSizeKB = Math.round(bundleStats.size / 1024);
      const bundleSizeMB = Math.round(bundleSizeKB / 1024 * 100) / 100;

      console.log(`✅ Bundle size: ${bundleSizeKB} KB (${bundleSizeMB} MB)`);

      // Analyze assets
      this.analyzeAssets();

      // Generate recommendations
      this.generateRecommendations(bundleSizeKB);

    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message);
    }
  }

  analyzeAssets() {
    console.log('\n📁 Analyzing assets...');

    const assetsDir = path.join(this.outputDir, 'assets');
    if (!fs.existsSync(assetsDir)) {
      console.log('No assets directory found');
      return;
    }

    const analyzeDirectory = (dir, prefix = '') => {
      const items = fs.readdirSync(dir);
      let totalSize = 0;

      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          const dirSize = analyzeDirectory(itemPath, prefix + '  ');
          totalSize += dirSize;
          console.log(`${prefix}📁 ${item}/: ${Math.round(dirSize / 1024)} KB`);
        } else {
          const fileSize = stat.size;
          totalSize += fileSize;
          if (fileSize > 10000) { // Show files larger than 10KB
            console.log(`${prefix}📄 ${item}: ${Math.round(fileSize / 1024)} KB`);
          }
        }
      });

      return totalSize;
    };

    const totalAssetsSize = analyzeDirectory(assetsDir);
    console.log(`\n📊 Total assets size: ${Math.round(totalAssetsSize / 1024)} KB`);
  }

  generateRecommendations(bundleSizeKB) {
    console.log('\n💡 Optimization Recommendations:');

    if (bundleSizeKB > 2000) {
      console.log('⚠️  Bundle size is large (>2MB). Consider:');
      console.log('   - Code splitting');
      console.log('   - Remove unused dependencies');
      console.log('   - Use dynamic imports for large libraries');
    } else if (bundleSizeKB > 1000) {
      console.log('⚡ Bundle size is moderate (>1MB). Consider:');
      console.log('   - Tree shaking optimization');
      console.log('   - Minification settings');
    } else {
      console.log('✅ Bundle size is good (<1MB)');
    }

    // Check for large dependencies
    this.checkLargeDependencies();
  }

  checkLargeDependencies() {
    console.log('\n📦 Checking large dependencies...');

    const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies || {});

    const largeDeps = [
      'react-native-vector-icons',
      'react-native-svg',
      'react-native-reanimated',
      'react-native-gesture-handler',
      '@react-native-community/blur'
    ];

    dependencies.forEach(dep => {
      if (largeDeps.includes(dep)) {
        console.log(`⚠️  Large dependency detected: ${dep}`);
      }
    });

    console.log(`📊 Total dependencies: ${dependencies.length}`);
  }

  async analyzeAPKSize() {
    console.log('\n📱 Analyzing APK size...');

    try {
      const apkPath = 'android/app/build/outputs/apk/release/app-release.apk';

      if (fs.existsSync(apkPath)) {
        const apkStats = fs.statSync(apkPath);
        const apkSizeMB = Math.round(apkStats.size / 1024 / 1024 * 100) / 100;
        console.log(`✅ APK size: ${apkSizeMB} MB`);

        if (apkSizeMB > 50) {
          console.log('⚠️  APK size is large (>50MB)');
        } else if (apkSizeMB > 20) {
          console.log('⚡ APK size is moderate (>20MB)');
        } else {
          console.log('✅ APK size is good (<20MB)');
        }
      } else {
        console.log('❌ APK not found. Build release APK first:');
        console.log('   cd android && ./gradlew assembleRelease');
      }
    } catch (error) {
      console.error('❌ APK analysis failed:', error.message);
    }
  }

  async run() {
    console.log('🚀 Starting Death Clock Bundle Analysis\n');

    await this.analyzeBundleSize();
    await this.analyzeAPKSize();

    console.log('\n🎉 Analysis complete!');
    console.log(`📁 Results saved to: ${this.outputDir}`);
  }
}

// Run analysis if called directly
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  analyzer.run().catch(console.error);
}

module.exports = BundleAnalyzer;