const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Phone screen dimensions (Google Play recommended)
const PHONE_WIDTH = 1080;
const PHONE_HEIGHT = 1920;

function drawPhoneFrame(ctx, width, height) {
    // Phone frame
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, width, height);

    // Screen area (with bezels)
    const screenMargin = 60;
    ctx.fillStyle = '#000000';
    ctx.fillRect(screenMargin, screenMargin * 2, width - screenMargin * 2, height - screenMargin * 3);

    return {
        screenX: screenMargin,
        screenY: screenMargin * 2,
        screenWidth: width - screenMargin * 2,
        screenHeight: height - screenMargin * 3
    };
}

function drawStatusBar(ctx, screen) {
    // Status bar
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(screen.screenX, screen.screenY, screen.screenWidth, 80);

    // Status bar text
    ctx.fillStyle = '#ffffff';
    ctx.font = '32px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('9:41', screen.screenX + 40, screen.screenY + 55);

    ctx.textAlign = 'right';
    ctx.fillText('100% 🔋', screen.screenX + screen.screenWidth - 40, screen.screenY + 55);
}

// Screenshot 1: Main screen with countdown
function generateMainScreenshot() {
    const canvas = createCanvas(PHONE_WIDTH, PHONE_HEIGHT);
    const ctx = canvas.getContext('2d');

    const screen = drawPhoneFrame(ctx, PHONE_WIDTH, PHONE_HEIGHT);
    drawStatusBar(ctx, screen);

    // App background
    const contentY = screen.screenY + 80;
    const contentHeight = screen.screenHeight - 80;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(screen.screenX, contentY, screen.screenWidth, contentHeight);

    // Header
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('💀 Death Clock', screen.screenX + screen.screenWidth / 2, contentY + 100);

    // Theme toggle and language buttons
    ctx.fillStyle = '#6c757d';
    ctx.fillRect(screen.screenX + 60, contentY + 140, 80, 80);
    ctx.fillRect(screen.screenX + screen.screenWidth - 140, contentY + 140, 80, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🌙', screen.screenX + 100, contentY + 190);
    ctx.fillText('🌐', screen.screenX + screen.screenWidth - 100, contentY + 190);

    // Input fields
    const inputY = contentY + 280;

    // Birth date input
    ctx.fillStyle = '#333333';
    ctx.font = '32px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('생년월일 (YYYY-MM-DD)', screen.screenX + 60, inputY);

    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 2;
    ctx.strokeRect(screen.screenX + 60, inputY + 20, screen.screenWidth - 120, 80);

    ctx.fillStyle = '#666666';
    ctx.font = '36px Arial';
    ctx.fillText('1990-01-01', screen.screenX + 80, inputY + 70);

    // Life expectancy input
    const lifeY = inputY + 140;
    ctx.fillStyle = '#333333';
    ctx.font = '32px Arial';
    ctx.fillText('예상 수명 (년)', screen.screenX + 60, lifeY);

    ctx.strokeRect(screen.screenX + 60, lifeY + 20, screen.screenWidth - 120, 80);

    ctx.fillStyle = '#666666';
    ctx.font = '36px Arial';
    ctx.fillText('80', screen.screenX + 80, lifeY + 70);

    // Start button
    const buttonY = lifeY + 140;
    ctx.fillStyle = '#28a745';
    ctx.fillRect(screen.screenX + 60, buttonY, screen.screenWidth - 120, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('시작', screen.screenX + screen.screenWidth / 2, buttonY + 50);

    // Clock display area
    const clockY = buttonY + 120;
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 40px Arial';
    ctx.fillText('남은 시간', screen.screenX + screen.screenWidth / 2, clockY);

    // Time display
    const timeY = clockY + 80;
    ctx.font = 'bold 64px Arial';
    ctx.fillStyle = '#dc3545';
    ctx.fillText('45년 3월 15일', screen.screenX + screen.screenWidth / 2, timeY);

    ctx.font = 'bold 48px Arial';
    ctx.fillText('14:25:32', screen.screenX + screen.screenWidth / 2, timeY + 80);

    return canvas;
}

// Screenshot 2: Language selection
function generateLanguageScreenshot() {
    const canvas = createCanvas(PHONE_WIDTH, PHONE_HEIGHT);
    const ctx = canvas.getContext('2d');

    const screen = drawPhoneFrame(ctx, PHONE_WIDTH, PHONE_HEIGHT);
    drawStatusBar(ctx, screen);

    // App background
    const contentY = screen.screenY + 80;
    const contentHeight = screen.screenHeight - 80;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(screen.screenX, contentY, screen.screenWidth, contentHeight);

    // Modal overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(screen.screenX, contentY, screen.screenWidth, contentHeight);

    // Modal content
    const modalWidth = screen.screenWidth * 0.8;
    const modalHeight = 600;
    const modalX = screen.screenX + (screen.screenWidth - modalWidth) / 2;
    const modalY = contentY + (contentHeight - modalHeight) / 2;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(modalX, modalY, modalWidth, modalHeight);

    // Modal title
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('언어 선택', modalX + modalWidth / 2, modalY + 80);

    // Language options
    const languages = [
        { name: '한국어', selected: true },
        { name: 'English', selected: false },
        { name: '日本語', selected: false },
        { name: '中文', selected: false }
    ];

    languages.forEach((lang, index) => {
        const optionY = modalY + 140 + index * 80;

        if (lang.selected) {
            ctx.fillStyle = '#007bff';
            ctx.fillRect(modalX + 40, optionY, modalWidth - 80, 60);
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(modalX + 40, optionY, modalWidth - 80, 60);
            ctx.fillStyle = '#333333';
        }

        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(lang.name, modalX + modalWidth / 2, optionY + 40);
    });

    return canvas;
}

// Screenshot 3: Settings/Theme
function generateThemeScreenshot() {
    const canvas = createCanvas(PHONE_WIDTH, PHONE_HEIGHT);
    const ctx = canvas.getContext('2d');

    const screen = drawPhoneFrame(ctx, PHONE_WIDTH, PHONE_HEIGHT);
    drawStatusBar(ctx, screen);

    // Dark theme background
    const contentY = screen.screenY + 80;
    const contentHeight = screen.screenHeight - 80;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(screen.screenX, contentY, screen.screenWidth, contentHeight);

    // Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('💀 Death Clock', screen.screenX + screen.screenWidth / 2, contentY + 100);

    // Theme toggle (sun icon for light mode)
    ctx.fillStyle = '#ffc107';
    ctx.fillRect(screen.screenX + 60, contentY + 140, 80, 80);

    ctx.fillStyle = '#000000';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('☀️', screen.screenX + 100, contentY + 190);

    // Language button
    ctx.fillStyle = '#6c757d';
    ctx.fillRect(screen.screenX + screen.screenWidth - 140, contentY + 140, 80, 80);

    ctx.fillStyle = '#ffffff';
    ctx.fillText('🌐', screen.screenX + screen.screenWidth - 100, contentY + 190);

    // Dark theme clock display
    const clockY = contentY + 350;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.fillText('Time Left', screen.screenX + screen.screenWidth / 2, clockY);

    // Time in dark theme
    const timeY = clockY + 80;
    ctx.font = 'bold 64px Arial';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('45Y 3M 15D', screen.screenX + screen.screenWidth / 2, timeY);

    ctx.font = 'bold 48px Arial';
    ctx.fillText('14:25:32', screen.screenX + screen.screenWidth / 2, timeY + 80);

    // Notification toggle
    const notifY = timeY + 160;
    ctx.fillStyle = '#28a745';
    ctx.fillRect(screen.screenX + 60, notifY, screen.screenWidth - 120, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = '32px Arial';
    ctx.fillText('🔔 알림 끄기', screen.screenX + screen.screenWidth / 2, notifY + 40);

    return canvas;
}

function generateAllScreenshots() {
    const screenshots = [
        { name: 'main_screen', func: generateMainScreenshot, desc: 'Main Screen' },
        { name: 'language_selection', func: generateLanguageScreenshot, desc: 'Language Selection' },
        { name: 'dark_theme', func: generateThemeScreenshot, desc: 'Dark Theme' }
    ];

    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }

    screenshots.forEach(({ name, func, desc }) => {
        const canvas = func();
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(path.join(screenshotsDir, `${name}.png`), buffer);
        console.log(`✅ Generated ${desc} screenshot (${PHONE_WIDTH}x${PHONE_HEIGHT})`);
    });

    console.log('\n🎉 All Play Store screenshots generated successfully!');
    console.log('\n📁 Screenshots saved in: ./screenshots/');
    console.log('- main_screen.png');
    console.log('- language_selection.png');
    console.log('- dark_theme.png');
    console.log('\n📱 These screenshots are ready for Google Play Store upload!');
}

try {
    generateAllScreenshots();
} catch (error) {
    console.error('❌ Error generating screenshots:', error);
}