import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { UserSidebar } from '../components/web/UserSidebar';
import { WebLayout } from '../components/web/WebLayout';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { subscriptionManagementService } from '../services/SubscriptionManagementService';

export default function BillingPortalScreen() {
  const router = useRouter();
  const { customer } = useLocalSearchParams<{ customer: string }>();
  const { user } = useAuth();

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'textSecondary');
  const cardBackground = useThemeColor({}, 'backgroundSecondary');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const borderColor = useThemeColor({}, 'border');
  const successColor = useThemeColor({}, 'accentSuccess');
  const warningColor = useThemeColor({}, 'accentWarning');
  const errorColor = useThemeColor({}, 'accentError');

  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (user?.id && customer) {
      loadSubscriptionData();
    }
  }, [user?.id, customer]);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const sub = await subscriptionManagementService.getCurrentSubscription(user!.id);
      setSubscription(sub);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStripePortal = () => {
    if (Platform.OS === 'web') {
      // For web, you would typically redirect to Stripe's hosted billing portal
      // For now, show a message about what would happen
      Alert.alert(
        'Stripe Billing Portal',
        'In production, this would redirect to Stripe\'s hosted billing portal where you can manage your subscription, update payment methods, and view billing history.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Simulate', onPress: () => {
            Alert.alert('Success', 'Billing portal would open here. In production, this integrates with Stripe.');
          }}
        ]
      );
    } else {
      Alert.alert(
        'Billing Portal',
        'Please visit the web version to manage your billing information.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Web', onPress: () => router.push('/web-home') }
        ]
      );
    }
  };

  const handleUpdatePaymentMethod = () => {
    Alert.alert(
      'Update Payment Method',
      'This would open Stripe\'s payment method update interface.',
      [{ text: 'OK' }]
    );
  };

  const handleViewBillingHistory = () => {
    Alert.alert(
      'Billing History',
      'This would show your complete billing history from Stripe.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <ThemedView style={[styles.center, { backgroundColor }]}>
        <Ionicons name="card" size={48} color={mutedTextColor} />
        <ThemedText style={{ marginTop: 12, color: mutedTextColor }}>Loading billing portal...</ThemedText>
      </ThemedView>
    );
  }

  const content = (
    <>
      <View style={styles.header}>
        <Ionicons name="card" size={28} color={accentColor} />
        <ThemedText type="title" style={{ marginLeft: 8 }}>Billing Portal</ThemedText>
      </View>

      {customer && (
        <View style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
          <ThemedText type="title" style={{ color: textColor, marginBottom: 16 }}>Customer Information</ThemedText>
          <View style={styles.infoRow}>
            <ThemedText style={{ color: mutedTextColor }}>Customer ID:</ThemedText>
            <ThemedText style={{ color: textColor, fontFamily: 'monospace' }}>{customer}</ThemedText>
          </View>
        </View>
      )}

      {subscription && (
        <View style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
          <ThemedText type="title" style={{ color: textColor, marginBottom: 16 }}>Current Subscription</ThemedText>
          <View style={styles.infoRow}>
            <ThemedText style={{ color: mutedTextColor }}>Plan:</ThemedText>
            <ThemedText style={{ color: textColor }}>{subscription.planName}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={{ color: mutedTextColor }}>Status:</ThemedText>
            <ThemedText style={{ color: textColor }}>{subscription.status}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={{ color: mutedTextColor }}>Price:</ThemedText>
            <ThemedText style={{ color: textColor }}>${subscription.planPrice}/{subscription.planInterval}</ThemedText>
          </View>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
        <ThemedText type="title" style={{ color: textColor, marginBottom: 16 }}>Billing Actions</ThemedText>
        
        <TouchableOpacity 
          style={[styles.actionButton, { borderColor }]}
          onPress={handleOpenStripePortal}
        >
          <Ionicons name="card-outline" size={20} color={textColor} />
          <ThemedText style={{ marginLeft: 8, color: textColor }}>Open Stripe Billing Portal</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, { borderColor }]}
          onPress={handleUpdatePaymentMethod}
        >
          <Ionicons name="card" size={20} color={textColor} />
          <ThemedText style={{ marginLeft: 8, color: textColor }}>Update Payment Method</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, { borderColor }]}
          onPress={handleViewBillingHistory}
        >
          <Ionicons name="receipt-outline" size={20} color={textColor} />
          <ThemedText style={{ marginLeft: 8, color: textColor }}>View Billing History</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
        <ThemedText type="title" style={{ color: textColor, marginBottom: 16 }}>About Stripe Billing Portal</ThemedText>
        <ThemedText style={{ color: mutedTextColor, lineHeight: 20 }}>
          The Stripe Billing Portal is a secure, hosted solution that allows you to:
        </ThemedText>
        <View style={styles.bulletList}>
          <View style={styles.bulletItem}>
            <ThemedText style={{ color: mutedTextColor }}>•</ThemedText>
            <ThemedText style={{ color: mutedTextColor, marginLeft: 8 }}>Update payment methods</ThemedText>
          </View>
          <View style={styles.bulletItem}>
            <ThemedText style={{ color: mutedTextColor }}>•</ThemedText>
            <ThemedText style={{ color: mutedTextColor, marginLeft: 8 }}>View billing history and invoices</ThemedText>
          </View>
          <View style={styles.bulletItem}>
            <ThemedText style={{ color: mutedTextColor }}>•</ThemedText>
            <ThemedText style={{ color: mutedTextColor, marginLeft: 8 }}>Download receipts and tax documents</ThemedText>
          </View>
          <View style={styles.bulletItem}>
            <ThemedText style={{ color: mutedTextColor }}>•</ThemedText>
            <ThemedText style={{ color: mutedTextColor, marginLeft: 8 }}>Manage subscription settings</ThemedText>
          </View>
        </View>
      </View>

      <TouchableOpacity style={[styles.backLink]} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={16} color={textColor} />
        <ThemedText style={{ marginLeft: 6, color: textColor }}>Back</ThemedText>
      </TouchableOpacity>
    </>
  );

  // Web layout wrapper
  if (Platform.OS === 'web') {
    return (
      <WebLayout
        title="Billing Portal"
        subtitle="Manage your billing and payment methods"
        sidebar={<UserSidebar activePage="settings" />}
        scrollable
      >
        {content}
      </WebLayout>
    );
  }

  // Native layout
  return (
    <ThemedView style={[styles.container, { backgroundColor }]}> 
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {content}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  bulletList: {
    marginTop: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  backLink: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    alignSelf: 'flex-start', 
    marginTop: 8 
  },
});
