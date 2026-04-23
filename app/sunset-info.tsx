import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, Linking, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useThemeColor } from '../hooks/useThemeColor';
import { WebLayout } from '../components/web/WebLayout';
import { UserSidebar } from '../components/web/UserSidebar';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { exportService } from '../services/ExportService';
import { useSnackbar } from '../contexts/SnackbarContext';

export default function SunsetInfoScreen() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { settings, loading } = useSystemSettings();
  const [isExporting, setIsExporting] = useState(false);
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'backgroundTertiary');
  const accentColor = '#6A5ACD';

  const handleExport = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      showSnackbar('Preparing your data export...', 'info');
      const success = await exportService.exportAllData();
      if (success) {
        showSnackbar('Data export started successfully!', 'success');
      }
    } catch (error) {
      console.error('Export error:', error);
      showSnackbar(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading || !settings) return null;

  const shutdownDateStr = settings.sunsetShutdownDate.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const Content = () => (
    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Sunset Information</ThemedText>
      </View>

      <View style={styles.card}>
        <View style={styles.alertIcon}>
          <Ionicons name="alert-circle" size={48} color="#856404" />
        </View>
        <ThemedText style={styles.cardTitle}>WizNote is Sunsetting</ThemedText>
        <ThemedText style={styles.cardDescription}>
          After careful consideration, we have decided to discontinue the WizNote service. 
          We want to thank all our users for being part of this journey.
        </ThemedText>
        
        <View style={styles.deadlineBox}>
          <ThemedText style={styles.deadlineLabel}>Shutdown Date:</ThemedText>
          <ThemedText style={styles.deadlineDate}>{shutdownDateStr}</ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>What does this mean for you?</ThemedText>
        
        <View style={styles.step}>
          <View style={styles.stepNumber}><ThemedText style={styles.stepNumberText}>1</ThemedText></View>
          <View style={styles.stepContent}>
            <ThemedText style={styles.stepTitle}>Read-Only Mode</ThemedText>
            <ThemedText style={styles.stepDescription}>
              The platform is now in read-only mode. New signups and note creation have been disabled. 
              You can still view, edit, and manage your existing notes.
            </ThemedText>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}><ThemedText style={styles.stepNumberText}>2</ThemedText></View>
          <View style={styles.stepContent}>
            <ThemedText style={styles.stepTitle}>Export Your Data</ThemedText>
            <ThemedText style={styles.stepDescription}>
              We provide a comprehensive export tool that allows you to download all your notes, quizzes, and flashcards in JSON format. 
              We recommend exporting your data as soon as possible.
            </ThemedText>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: accentColor, opacity: isExporting ? 0.7 : 1 }]}
              onPress={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="download" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              )}
              <ThemedText style={styles.actionButtonText}>
                {isExporting ? 'Exporting...' : 'Export All Data Now'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}><ThemedText style={styles.stepNumberText}>3</ThemedText></View>
          <View style={styles.stepContent}>
            <ThemedText style={styles.stepTitle}>Final Shutdown</ThemedText>
            <ThemedText style={styles.stepDescription}>
              On {shutdownDateStr}, all WizNote servers will be powered down and all user data will be permanently deleted. 
              Access to the application will no longer be possible after this date.
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.faqSection}>
        <ThemedText style={styles.sectionTitle}>Frequently Asked Questions</ThemedText>
        
        <View style={styles.faqItem}>
          <ThemedText style={styles.faqQuestion}>Can I still edit my existing notes?</ThemedText>
          <ThemedText style={styles.faqAnswer}>
            Yes, you can continue to edit and refine your existing notes until the final shutdown date.
          </ThemedText>
        </View>

        <View style={styles.faqItem}>
          <ThemedText style={styles.faqQuestion}>What happens to my Premium subscription?</ThemedText>
          <ThemedText style={styles.faqAnswer}>
            All active Premium subscriptions will remain active until their current billing cycle ends. 
            New subscriptions and renewals have been disabled.
          </ThemedText>
        </View>

        <View style={styles.faqItem}>
          <ThemedText style={styles.faqQuestion}>How do I export my data?</ThemedText>
          <ThemedText style={styles.faqAnswer}>
            Click the "Export All Data Now" button above or go to Settings and look for the "Export All Data" button. 
            This will generate a JSON file containing all your notes, quizzes, flashcards, and voice note transcriptions, which you can save to your device.
          </ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.footerText}>
          If you have any urgent questions, please contact our support team.
        </ThemedText>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:support@wiznote.com')}>
          <ThemedText style={[styles.supportLink, { color: accentColor }]}>support@wiznote.com</ThemedText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout sidebar={<UserSidebar />}>
        <Content />
      </WebLayout>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <Content />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#FFF3CD',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#FFEEBA',
  },
  alertIcon: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 16,
    color: '#856404',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  deadlineBox: {
    backgroundColor: 'rgba(133, 100, 4, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  deadlineLabel: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
    marginBottom: 4,
  },
  deadlineDate: {
    fontSize: 20,
    color: '#856404',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6A5ACD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
  },
  actionButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  faqSection: {
    marginBottom: 40,
  },
  faqItem: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.7,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.6,
    marginBottom: 8,
  },
  supportLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
