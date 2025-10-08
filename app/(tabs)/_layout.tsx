import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const tabBarBg = colorScheme === 'light' ? '#fff' : '#1A1A1A';
  const borderTopColor = colorScheme === 'light' ? '#E5E7EB' : '#333333';

  // On web, we'll use a different layout structure
  if (Platform.OS === 'web') {
    return (
      <Tabs
        screenOptions={{
          tabBarStyle: { display: 'none' }, // Hide tab bar on web
          headerShown: false,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            title: 'Favorites',
          }}
        />
        <Tabs.Screen
          name="shared"
          options={{
            title: 'Shared',
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
          }}
        />
      </Tabs>
    );
  }

  // Mobile layout with bottom tabs
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6A5ACD',
        tabBarInactiveTintColor: '#A0A0A0',
        tabBarStyle: {
          backgroundColor: tabBarBg,
          borderTopColor: borderTopColor,
          borderTopWidth: 1,
          paddingBottom: 10,
          paddingTop: 10,
          height: 80,
        },
        headerStyle: {
          backgroundColor: tabBarBg,
        },
        headerTintColor: colorScheme === 'light' ? '#11181C' : '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'star' : 'star-outline'} size={24} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="shared"
        options={{
          title: 'Shared',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={24} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
          ),
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
