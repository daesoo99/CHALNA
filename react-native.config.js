module.exports = {
  dependencies: {
    // Disable autolinking for native libraries causing build issues
    '@react-native-async-storage/async-storage': {
      platforms: {
        android: null,
        ios: null,
      },
    },
    '@react-native-community/datetimepicker': {
      platforms: {
        android: null,
        ios: null,
      },
    },
    'react-native-haptic-feedback': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};