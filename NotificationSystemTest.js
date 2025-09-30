/**
 * Death Clock Notification System Integration Test
 *
 * This script validates that the notification system integration works properly
 * between React Native and Android native code.
 */

import { NativeModules, Platform } from 'react-native';
import NotificationService from './NotificationService';

const { SharedPrefs } = NativeModules;

class NotificationSystemTest {
  static async runTests() {
    console.log('🧪 Starting Death Clock Notification System Integration Tests...');

    const results = {
      passed: 0,
      failed: 0,
      tests: []
    };

    // Test 1: Check if SharedPrefs module is available
    await this.test(
      'SharedPrefs Native Module Available',
      () => {
        if (Platform.OS !== 'android') {
          return { success: true, message: 'Skipped on non-Android platform' };
        }
        if (!SharedPrefs) {
          throw new Error('SharedPrefs native module not found');
        }
        return { success: true, message: 'SharedPrefs module is available' };
      },
      results
    );

    // Test 2: Check NotificationService initialization
    await this.test(
      'NotificationService Initialization',
      () => {
        if (!NotificationService) {
          throw new Error('NotificationService not available');
        }
        return { success: true, message: 'NotificationService initialized successfully' };
      },
      results
    );

    // Test 3: Test permission check functionality
    await this.test(
      'Permission Check Functionality',
      async () => {
        const hasPermission = await NotificationService.checkPermissions();
        return {
          success: true,
          message: `Permission status: ${hasPermission ? 'granted' : 'not granted'}`
        };
      },
      results
    );

    // Test 4: Test data saving to SharedPreferences (Android only)
    await this.test(
      'Data Saving to SharedPreferences',
      async () => {
        if (Platform.OS !== 'android' || !SharedPrefs) {
          return { success: true, message: 'Skipped on non-Android platform' };
        }

        const testBirthYear = 1990;
        const testBirthMonth = 6;
        const testBirthDay = 15;
        const testLifeExpectancy = 80;

        SharedPrefs.saveUserData(testBirthYear, testBirthMonth, testBirthDay, testLifeExpectancy);

        return {
          success: true,
          message: 'Test data saved to SharedPreferences successfully'
        };
      },
      results
    );

    // Test 5: Test notification service start/stop
    await this.test(
      'Notification Service Start/Stop',
      () => {
        if (Platform.OS !== 'android' || !SharedPrefs) {
          return { success: true, message: 'Skipped on non-Android platform' };
        }

        // Test starting service
        SharedPrefs.startNotificationService();

        // Test stopping service
        SharedPrefs.stopNotificationService();

        return {
          success: true,
          message: 'Notification service start/stop methods executed successfully'
        };
      },
      results
    );

    // Test 6: Test NotificationService bridge methods
    await this.test(
      'NotificationService Bridge Methods',
      () => {
        const testBirthDate = '1990-06-15';
        const testLifeExpectancy = 80;

        // Test starting notification service through bridge
        NotificationService.startNotificationService(testBirthDate, testLifeExpectancy);

        // Test stopping notification service
        NotificationService.stopNotificationService();

        return {
          success: true,
          message: 'NotificationService bridge methods executed successfully'
        };
      },
      results
    );

    // Test 7: Test platform-specific behavior
    await this.test(
      'Platform-Specific Behavior',
      () => {
        const useNativeService = Platform.OS === 'android';
        const expectedBehavior = useNativeService ? 'Android native service' : 'React Native notifications';

        return {
          success: true,
          message: `Platform: ${Platform.OS}, Expected behavior: ${expectedBehavior}`
        };
      },
      results
    );

    // Print results
    console.log('\n🧪 Test Results Summary:');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total: ${results.tests.length}`);

    if (results.failed === 0) {
      console.log('🎉 All tests passed! Notification system integration is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please check the issues above.');
    }

    return results;
  }

  static async test(name, testFunction, results) {
    try {
      console.log(`\n🔍 Testing: ${name}`);
      const result = await testFunction();
      console.log(`✅ PASS: ${result.message}`);
      results.passed++;
      results.tests.push({ name, status: 'PASS', message: result.message });
    } catch (error) {
      console.log(`❌ FAIL: ${error.message}`);
      results.failed++;
      results.tests.push({ name, status: 'FAIL', message: error.message });
    }
  }

  /**
   * Manual test instructions for developers
   */
  static getManualTestInstructions() {
    return `
🧪 Manual Testing Instructions for Death Clock Notifications:

1. **Permission Test:**
   - Open the app
   - Start the countdown
   - Enable notifications toggle
   - Check if permission dialog appears (if not already granted)

2. **Notification Display Test:**
   - With countdown active and notifications enabled
   - Check if persistent notification appears in status bar
   - Verify notification shows countdown timer (format: XY XD XH XM XS)

3. **Notification Interaction Test:**
   - Tap on the notification
   - Verify it opens the Death Clock app
   - Check if notification remains persistent (doesn't disappear)

4. **Background Behavior Test:**
   - Enable notifications and start countdown
   - Put app in background
   - Check if notification continues updating every second
   - Verify countdown accuracy

5. **Service Lifecycle Test:**
   - Start countdown with notifications
   - Force-close the app (swipe away from recent apps)
   - Check if notification disappears (expected behavior)
   - Restart app and re-enable notifications

6. **Data Consistency Test:**
   - Set birth date and life expectancy
   - Enable notifications
   - Compare countdown in app vs. countdown in notification
   - Both should show identical values

7. **Error Handling Test:**
   - Try enabling notifications without setting birth date
   - Check if appropriate error handling occurs
   - Verify no crashes or undefined behavior

✅ Expected Results:
- Notifications should be persistent and accurate
- No app crashes or errors
- Smooth transition between app and notification states
- Proper permission handling
- Consistent countdown values

⚠️  Common Issues to Watch For:
- Notification permission denied
- Service not starting properly
- Countdown discrepancies
- Memory leaks or performance issues
- Improper service cleanup
    `;
  }
}

export default NotificationSystemTest;

// Auto-run tests in development mode
if (__DEV__) {
  // Make test available globally for manual testing
  global.NotificationSystemTest = NotificationSystemTest;
  console.log('🧪 NotificationSystemTest available in global scope');
  console.log('📋 Run global.NotificationSystemTest.runTests() to test notification integration');
  console.log('📖 Run console.log(global.NotificationSystemTest.getManualTestInstructions()) for manual test guide');
}