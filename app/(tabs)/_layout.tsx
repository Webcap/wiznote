import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useTranslation } from '../../hooks/useTranslation';
import { PromotionManager } from '../../components/PromotionManager';

export default function TabLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const tabBarBg = colorScheme === 'light' ? '#fff' : '#1A1A1A';
  const borderTopColor = colorScheme === 'light' ? '#E5E7EB' : '#333333';

  // On web, we'll use a different layout structure
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarStyle: { display: 'none' }, // Hide tab bar on web
            headerShown: false,
          }}>
          <Tabs.Screen
            name="index"
            options={{
              title: t('tabs.home'),
            }}
          />
          <Tabs.Screen
            name="favorites"
            options={{
              title: t('tabs.favorites'),
            }}
          />
          <Tabs.Screen
            name="shared"
            options={{
              title: t('tabs.shared'),
            }}
          />
          <Tabs.Screen
            name="search"
            options={{
              title: t('tabs.search'),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: t('tabs.settings'),
            }}
          />
        </Tabs>
        <PromotionManager
          enableModal={true}
          enableBanner={true}
          triggers={{ onAppOpen: true }}
        />
      </View>
    );
  }

  // Mobile layout with bottom tabs
  return (
    <View style={{ flex: 1 }}>
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
            title: t('tabs.home'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
            ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            title: t('tabs.favorites'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'star' : 'star-outline'} size={24} color={color} />
            ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="shared"
          options={{
            title: t('tabs.shared'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
            ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: t('tabs.search'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'search' : 'search-outline'} size={24} color={color} />
            ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('tabs.settings'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
            ),
            headerShown: false,
          }}
        />
      </Tabs>
      <PromotionManager
        enableModal={true}
        enableBanner={false}
        triggers={{ onAppOpen: true }}
      />
    </View>
  );
}
