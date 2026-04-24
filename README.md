# 📝 WizNote - Note Taking App

A modern, feature-rich note-taking application built with React Native, Expo, and Supabase.

## 🚀 Features

- **📝 Text Notes** - Create and edit rich text notes
- **🎤 Audio Notes** - Record voice notes with AI transcription
- **🏷️ Tags & Organization** - Organize notes with tags and categories
- **🔍 Search & Filter** - Find notes quickly with advanced search
- **☁️ Cloud Sync** - Real-time synchronization with Supabase
- **🔐 Authentication** - Secure user authentication with Supabase Auth
- **🌙 Dark Theme** - Beautiful dark theme with smooth animations
- **📱 Cross-Platform** - Works on iOS, Android, and Web

> **⚠️ WizNote is Sunsetting**: The service is officially entering its sunset phase and is now in **Read-Only Mode**. New user registrations and note creation have been disabled. All existing users are encouraged to use the new **Data Export Tool** to download their data before the final shutdown. See [CHANGELOG.md](./CHANGELOG.md) for more details.

## 🧪 Testing

This project includes a comprehensive testing suite with unit tests, integration tests, and component tests.

### **📋 Test Structure**

```
__tests__/
├── hooks/           # Hook tests (useAuth, useNotes)
├── components/      # Component tests (NoteCard, etc.)
├── screens/         # Screen integration tests
└── services/        # Service tests (AuthService, etc.)
```

[![Netlify Status](https://api.netlify.com/api/v1/badges/4828e55d-76ca-44cf-a4fc-4e04a0f88900/deploy-status)](https://app.netlify.com/projects/marvelous-syrniki-734072/deploys)

### **🛠️ Running Tests**

#### **Basic Commands**
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI/CD
npm run test:ci
```

#### **Advanced Commands**
```bash
# Run specific test file
npm test -- __tests__/hooks/useAuth.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="useAuth"

# Update snapshots
npm test -- --updateSnapshot

# Debug tests
npm test -- --verbose --detectOpenHandles
```

### **📊 Test Coverage**

The test suite covers:

- **✅ Hooks** - useAuth, useNotes
- **✅ Components** - NoteCard, LoadingSpinner, VoiceRecorder
- **✅ Screens** - HomeScreen, CreateScreen, SettingsScreen
- **✅ Services** - AuthService, SupabaseNoteStorage
- **✅ Utilities** - Date formatting, data filtering

### **🎯 Test Types**

#### **Unit Tests**
- **Hooks** - Test custom React hooks in isolation
- **Services** - Test business logic and API calls
- **Utilities** - Test helper functions and data processing

#### **Component Tests**
- **Rendering** - Test component rendering and props
- **User Interactions** - Test button clicks, form submissions
- **State Changes** - Test component state updates
- **Error Handling** - Test error states and edge cases

#### **Integration Tests**
- **Screen Flows** - Test complete user journeys
- **Navigation** - Test screen transitions and routing
- **Data Flow** - Test data passing between components

### **🔧 Test Configuration**

#### **Jest Configuration**
```javascript
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/coverage/**',
    '!**/node_modules/**',
  ],
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)',
  ],
};
```

#### **Test Setup**
```javascript
// jest.setup.js
import '@testing-library/jest-native/extend-expect';

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  initializeApp: jest.fn(),
}));
```

### **📝 Writing Tests**

#### **Hook Test Example**
```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '../../hooks/useAuth';

describe('useAuth', () => {
  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBe(null);
  });
});
```

#### **Component Test Example**
```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { NoteCard } from '../../components/NoteCard';

describe('NoteCard', () => {
  it('should render note title and content', () => {
    const { getByText } = render(<NoteCard {...mockProps} />);
    
    expect(getByText('Test Note')).toBeTruthy();
    expect(getByText('Test content')).toBeTruthy();
  });
});
```

### **🚀 CI/CD Integration**

#### **GitHub Actions Example**
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run lint
```

### **📈 Coverage Reports**

Generate detailed coverage reports:

   ```bash
npm run test:coverage
```

This will create:
- **HTML Report** - `coverage/lcov-report/index.html`
- **Console Output** - Coverage summary in terminal
- **LCOV File** - `coverage/lcov.info` for CI tools

### **🔍 Debugging Tests**

#### **Debug Mode**
```bash
npm test -- --verbose --detectOpenHandles
```

#### **Watch Mode with Debug**
```bash
npm run test:watch -- --verbose
```

#### **Specific Test Debug**
```bash
npm test -- --testNamePattern="useAuth" --verbose
```

## 🛠️ Development

### **Prerequisites**
- Node.js 18+
- npm or yarn
- Expo CLI

### **Installation**
```bash
# Clone the repository
git clone <repository-url>
cd notezReact

# Install dependencies
   npm install

# Start development server
npm start
   ```

### **Environment Setup**
   ```bash
# Copy environment template
cp .env.example .env

# Add your Supabase configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📱 Building

### **Development Build**
```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

### **Production Build**
```bash
# Build for production
expo build:android
expo build:ios
```

### **Production (default)**
npx expo start

# **Development**
$env:APP_VARIANT="development"; npx expo start

# **Preview**
$env:APP_VARIANT="preview"; npx expo start

# **EAS BUILD TO PREVIEW**
eas build --platform android --profile preview

# **Web**
npx expo start --web

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
