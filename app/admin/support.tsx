import { StyleSheet, View } from 'react-native';
import SupportDashboard from '../../components/support/SupportDashboard';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { AdminSidebar } from '../../components/web/AdminSidebar';
import { WebLayout } from '../../components/web/WebLayout';

export default function SupportPage() {
  // In a real app, you'd get this from authentication context
  const supportAgentId = 'admin_support_agent';
  
  return (
    <WebLayout
      sidebar={<AdminSidebar activePage="support" />}
      header={
        <View style={styles.webHeader}>
          <View>
            <ThemedText type="title">Support Agent Tools</ThemedText>
            <ThemedText style={styles.webHeaderSubtitle}>
              Manage user feature limits, monitor usage, and provide support
            </ThemedText>
          </View>
        </View>
      }
      title="Support Tools"
      subtitle="Admin Dashboard"
    >
      <ThemedView style={styles.webContent}>
        <SupportDashboard supportAgentId={supportAgentId} />
      </ThemedView>
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  webHeaderSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  webContent: {
    flex: 1,
    padding: 0, // Remove padding since SupportDashboard handles its own layout
  },
});
