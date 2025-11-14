import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { premiumManagementService, PremiumStatus } from '../../services/PremiumManagementService';
import { UserProfile } from '../../services/SupportService';

interface PremiumManagementProps {
  user: UserProfile;
  supportAgentId: string;
  onPremiumUpdated?: () => void;
}

export default function PremiumManagement({ user, supportAgentId, onPremiumUpdated }: PremiumManagementProps) {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [duration, setDuration] = useState('365');
  const [reason, setReason] = useState('');
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const accentSuccess = useThemeColor({}, 'accentSuccess');
  const accentDanger = useThemeColor({}, 'accentDanger');
  const borderColor = useThemeColor({}, 'border');

  const refreshPremiumStatus = async () => {
    if (!user?.id) {
      console.warn('PremiumManagement: Cannot refresh premium status - user.id is missing');
      return;
    }
    setRefreshing(true);
    try {
      const status = await premiumManagementService.getPremiumStatus(user.id);
      setPremiumStatus(status);
    } catch (error) {
      console.error('Error fetching premium status:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleGrantPremium = async () => {
    if (!reason.trim()) {
      if (Platform.OS === 'web') {
        showSnackbar('Please provide a reason', 'error');
      } else {
        Alert.alert('Missing Information', 'Please provide a reason for granting premium access.');
      }
      return;
    }

    const durationValue = duration === 'lifetime' ? 'lifetime' : parseInt(duration);

    if (duration !== 'lifetime' && (isNaN(durationValue as number) || (durationValue as number) <= 0)) {
      if (Platform.OS === 'web') {
        showSnackbar('Invalid duration', 'error');
      } else {
        Alert.alert('Invalid Duration', 'Please enter a valid number of days.');
      }
      return;
    }

    // Confirm action
    const confirmMessage = duration === 'lifetime'
      ? `Grant LIFETIME premium access to ${user.email}?`
      : `Grant ${duration} days of premium access to ${user.email}?`;

    if (Platform.OS === 'web') {
      if (!confirm(confirmMessage + '\n\nReason: ' + reason)) {
        return;
      }
    } else {
      Alert.alert(
        'Confirm Premium Grant',
        confirmMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Grant Access',
            style: 'default',
            onPress: async () => executeGrant(),
          },
        ]
      );
      return;
    }

    await executeGrant();
  };

  const executeGrant = async () => {
    if (!user?.id) {
      const errorMsg = 'User ID is missing. Cannot grant premium access.';
      console.error('PremiumManagement:', errorMsg);
      if (Platform.OS === 'web') {
        showSnackbar(errorMsg, 'error');
      } else {
        Alert.alert('Error', errorMsg);
      }
      return;
    }

    if (!user?.email) {
      const errorMsg = 'User email is missing. Cannot grant premium access.';
      console.error('PremiumManagement:', errorMsg);
      if (Platform.OS === 'web') {
        showSnackbar(errorMsg, 'error');
      } else {
        Alert.alert('Error', errorMsg);
      }
      return;
    }

    setLoading(true);
    try {
      const result = await premiumManagementService.grantFreePremium({
        userId: user.id,
        userEmail: user.email,
        duration: duration === 'lifetime' ? 'lifetime' : parseInt(duration),
        reason: reason,
        grantedBy: supportAgentId,
      });

      if (result.success) {
        if (Platform.OS === 'web') {
          showSnackbar('✅ Premium access granted successfully!', 'success');
        } else {
          Alert.alert('Success', 'Premium access granted successfully!');
        }

        setShowGrantModal(false);
        setReason('');
        setDuration('365');
        await refreshPremiumStatus();
        onPremiumUpdated?.();
      } else {
        if (Platform.OS === 'web') {
          showSnackbar(`Failed to grant premium: ${result.error}`, 'error');
        } else {
          Alert.alert('Error', `Failed to grant premium: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Error granting premium:', error);
      if (Platform.OS === 'web') {
        showSnackbar('An error occurred', 'error');
      } else {
        Alert.alert('Error', 'An error occurred while granting premium access.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRevokePremium = async () => {
    if (!user?.id || !user?.email) {
      const errorMsg = 'User ID or email is missing. Cannot revoke premium access.';
      console.error('PremiumManagement:', errorMsg);
      if (Platform.OS === 'web') {
        showSnackbar(errorMsg, 'error');
      } else {
        Alert.alert('Error', errorMsg);
      }
      return;
    }

    const confirmMessage = `Revoke premium access from ${user.email}?`;

    const executeRevoke = async () => {
      setLoading(true);
      try {
        const result = await premiumManagementService.revokePremium(
          user.id,
          user.email,
          reason || 'Revoked by support',
          supportAgentId
        );

        if (result.success) {
          if (Platform.OS === 'web') {
            showSnackbar('Premium access revoked', 'success');
          } else {
            Alert.alert('Success', 'Premium access revoked successfully.');
          }

          await refreshPremiumStatus();
          onPremiumUpdated?.();
        } else {
          if (Platform.OS === 'web') {
            showSnackbar(`Failed to revoke: ${result.error}`, 'error');
          } else {
            Alert.alert('Error', `Failed to revoke premium: ${result.error}`);
          }
        }
      } catch (error) {
        console.error('Error revoking premium:', error);
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm(confirmMessage)) {
        await executeRevoke();
      }
    } else {
      Alert.alert(
        'Confirm Revoke',
        confirmMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Revoke', style: 'destructive', onPress: executeRevoke },
        ]
      );
    }
  };

  // Load premium status on mount
  useEffect(() => {
    if (user?.id) {
      refreshPremiumStatus();
    } else {
      console.warn('PremiumManagement: user.id is missing, skipping premium status refresh');
    }
  }, [user?.id]);

  const currentPremium = premiumStatus || user.premium;
  const isPremiumActive = currentPremium?.isActive || false;
  const isFreeAccess = currentPremium?.isFree || false;

  return (
    <View style={[styles.container, { backgroundColor: backgroundSecondary }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="diamond" size={24} color={accentPrimary} />
          <Text style={[styles.headerTitle, { color: textColor }]}>
            Premium Access Management
          </Text>
        </View>
        <TouchableOpacity
          onPress={refreshPremiumStatus}
          disabled={refreshing}
          style={styles.refreshButton}
        >
          <Ionicons
            name="refresh"
            size={20}
            color={accentPrimary}
            style={refreshing ? styles.rotating : undefined}
          />
        </TouchableOpacity>
      </View>

      {/* Current Status */}
      <View style={[styles.statusCard, { backgroundColor, borderColor }]}>
        <View style={styles.statusHeader}>
          <Text style={[styles.statusLabel, { color: textSecondary }]}>Current Status:</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: isPremiumActive ? accentSuccess + '20' : textSecondary + '20' }
          ]}>
            <Text style={[
              styles.statusBadgeText,
              { color: isPremiumActive ? accentSuccess : textSecondary }
            ]}>
              {isPremiumActive ? '✅ Premium Active' : '❌ No Premium'}
            </Text>
          </View>
        </View>

        {isPremiumActive && currentPremium && (
          <View style={styles.statusDetails}>
            <View style={styles.statusRow}>
              <Text style={[styles.statusKey, { color: textSecondary }]}>Plan:</Text>
              <Text style={[styles.statusValue, { color: textColor }]}>
                {currentPremium.planName || currentPremium.planId || 'Unknown'}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={[styles.statusKey, { color: textSecondary }]}>Status:</Text>
              <Text style={[styles.statusValue, { color: textColor }]}>
                {currentPremium.status || 'active'}
              </Text>
            </View>

            {currentPremium.currentPeriodEnd && (
              <View style={styles.statusRow}>
                <Text style={[styles.statusKey, { color: textSecondary }]}>Valid Until:</Text>
                <Text style={[styles.statusValue, { color: textColor }]}>
                  {new Date(currentPremium.currentPeriodEnd).toLocaleDateString()}
                </Text>
              </View>
            )}

            {isFreeAccess && (
              <>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusKey, { color: textSecondary }]}>Type:</Text>
                  <Text style={[styles.statusValue, { color: accentSuccess }]}>
                    🎁 Free Access
                  </Text>
                </View>

                {currentPremium.grantedBy && (
                  <View style={styles.statusRow}>
                    <Text style={[styles.statusKey, { color: textSecondary }]}>Granted By:</Text>
                    <Text style={[styles.statusValue, { color: textColor }]}>
                      {currentPremium.grantedBy}
                    </Text>
                  </View>
                )}

                {currentPremium.grantedReason && (
                  <View style={styles.statusRow}>
                    <Text style={[styles.statusKey, { color: textSecondary }]}>Reason:</Text>
                    <Text style={[styles.statusValue, { color: textColor }]}>
                      {currentPremium.grantedReason}
                    </Text>
                  </View>
                )}
              </>
            )}

            {currentPremium.stripeSubscriptionId && (
              <View style={styles.statusRow}>
                <Text style={[styles.statusKey, { color: textSecondary }]}>Stripe Sub:</Text>
                <Text style={[styles.statusValue, { color: textColor, fontSize: 12 }]}>
                  {currentPremium.stripeSubscriptionId}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {!isPremiumActive && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: accentSuccess }]}
            onPress={() => setShowGrantModal(true)}
            disabled={loading}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Grant Free Premium</Text>
          </TouchableOpacity>
        )}

        {isPremiumActive && isFreeAccess && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: accentDanger }]}
            onPress={handleRevokePremium}
            disabled={loading}
          >
            <Ionicons name="close-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Revoke Premium</Text>
          </TouchableOpacity>
        )}

        {isPremiumActive && !isFreeAccess && (
          <View style={[styles.infoBox, { backgroundColor: accentPrimary + '20', borderColor: accentPrimary }]}>
            <Ionicons name="information-circle" size={20} color={accentPrimary} />
            <Text style={[styles.infoText, { color: textColor }]}>
              This is a paid Stripe subscription. Manage in Stripe Dashboard or use sync tools.
            </Text>
          </View>
        )}
      </View>

      {/* Grant Modal */}
      <Modal
        visible={showGrantModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGrantModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                Grant Free Premium Access
              </Text>
              <TouchableOpacity onPress={() => setShowGrantModal(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.label, { color: textSecondary }]}>User:</Text>
              <Text style={[styles.userInfo, { color: textColor }]}>
                {user.email} ({user.displayName || 'No name'})
              </Text>

              <Text style={[styles.label, { color: textSecondary, marginTop: 16 }]}>
                Duration:
              </Text>
              <View style={styles.durationButtons}>
                {['30', '90', '365', 'lifetime'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.durationButton,
                      {
                        backgroundColor: duration === d ? accentPrimary : backgroundSecondary,
                        borderColor: duration === d ? accentPrimary : borderColor,
                      },
                    ]}
                    onPress={() => setDuration(d)}
                  >
                    <Text
                      style={[
                        styles.durationButtonText,
                        { color: duration === d ? '#fff' : textColor },
                      ]}
                    >
                      {d === 'lifetime' ? '♾️ Lifetime' : `${d} days`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: textSecondary, marginTop: 16 }]}>
                Custom Duration (days):
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: backgroundSecondary, color: textColor, borderColor },
                ]}
                value={duration === 'lifetime' ? '' : duration}
                onChangeText={(text) => {
                  if (text === '' || !isNaN(Number(text))) {
                    setDuration(text || '365');
                  }
                }}
                placeholder="Enter days"
                placeholderTextColor={textSecondary}
                keyboardType="numeric"
                editable={duration !== 'lifetime'}
              />

              <Text style={[styles.label, { color: textSecondary, marginTop: 16 }]}>
                Reason: *
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: backgroundSecondary, color: textColor, borderColor },
                ]}
                value={reason}
                onChangeText={setReason}
                placeholder="e.g., Beta tester, Customer compensation, Staff account"
                placeholderTextColor={textSecondary}
                multiline
                numberOfLines={3}
              />

              <View style={[styles.warningBox, { backgroundColor: accentPrimary + '10', borderColor: accentPrimary }]}>
                <Ionicons name="information-circle" size={20} color={accentPrimary} />
                <Text style={[styles.warningText, { color: textColor }]}>
                  This grants free premium access without Stripe. User won't be charged.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: backgroundSecondary }]}
                onPress={() => setShowGrantModal(false)}
                disabled={loading}
              >
                <Text style={[styles.modalButtonText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  { backgroundColor: accentSuccess },
                ]}
                onPress={handleGrantPremium}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                      Grant Access
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
  },
  rotating: {
    transform: [{ rotate: '360deg' }],
  },
  statusCard: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusDetails: {
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statusKey: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  userInfo: {
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  durationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  durationButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginTop: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonPrimary: {
    flexDirection: 'row',
    gap: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

