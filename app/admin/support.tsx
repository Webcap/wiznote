import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import SupportDashboard from '../../components/support/SupportDashboard';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { AdminSidebar } from '../../components/web/AdminSidebar';
import { WebLayout } from '../../components/web/WebLayout';
import { useAuth } from '../../hooks/useAuth';
import { useThemeColor } from '../../hooks/useThemeColor';

export default function SupportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');
  
  // Use the current admin/support user's actual ID
  const supportAgentId = user?.id || '';
  
  return (
    <WebLayout
      sidebar={<AdminSidebar activePage="support" />}
      header={
        <View style={styles.webHeader}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.webBackButton}
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
            <ThemedText style={styles.webBackText}>Back</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.webHeaderTitle}>Support Agent Tools</ThemedText>
          <View style={styles.webHeaderSpacer} />
        </View>
      }
      title="Support Tools"
      subtitle="Manage user feature limits, monitor usage, and provide support"
    >
      <ThemedView style={styles.webContent}>
        <SupportDashboard supportAgentId={supportAgentId} />
      </ThemedView>
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  // Web Header - Following design.json web header pattern
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 40,
    paddingBottom: 30,
    gap: 20,
  },
  webBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webBackText: {
    fontSize: 16,
  },
  webHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  webHeaderSpacer: {
    width: 80,
  },
  webContent: {
    flex: 1,
    padding: 0, // Remove padding since SupportDashboard handles its own layout
  },
});
