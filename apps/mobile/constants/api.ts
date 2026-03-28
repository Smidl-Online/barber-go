import Constants from 'expo-constants';

// For development: use local IP
// In production, this would be your deployed API URL
const devApiUrl = 'http://localhost:3000';

export const API_URL =
  Constants.expoConfig?.extra?.apiUrl || devApiUrl;
