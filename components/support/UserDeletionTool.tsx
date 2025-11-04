import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../hooks/useAuth';
import { supportService } from '../../services/SupportService';
import { supabase } from '../../lib/supabase';

interface UserDeletionToolProps {
  supportAgentId: string;
}

interface DeletionTicket {
  id: string;
  type: string;
  status: string;
  priority: string;
  userEmail: string;
  userId: string | null;
  subject: string;
  description: string;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

interface VerificationStatus {
  status: 'pending' | 'verified' | 'admin_override';
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

export default function UserDeletionTool({ supportAgentId }: UserDeletionToolProps) {
  const { showSnackbar } = useSnackbar();
  const [tickets, setTickets] = useState<DeletionTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingTicket, setProcessingTicket] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<DeletionTicket | null>(null);
  const [deletionProgress, setDeletionProgress] = useState<{
    step: string;
    progress: number;
    details: string[];
  } | null>(null);
  const [verificationStatuses, setVerificationStatuses] = useState<Record<string, VerificationStatus>>({});
  const [startingVerification, setStartingVerification] = useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = useState<string | null>(null);
  const { user, isAdmin } = useAuth();

  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textMuted = useThemeColor({}, 'textMuted');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const backgroundTertiary = useThemeColor({}, 'backgroundTertiary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const accentDanger = useThemeColor({}, 'accentDanger');
  const accentWarning = useThemeColor({}, 'accentWarning');
  const accentSuccess = useThemeColor({}, 'accentSuccess');

  useEffect(() => {
    loadDeletionRequests();
  }, []);

  const loadDeletionRequests = async () => {
    setLoading(true);
    try {
      const allTickets = await supportService.getAllSupportTickets({
        type: 'account_deletion',
      });
      setTickets(allTickets as any);
      
      // Load verification statuses for all tickets
      const statuses: Record<string, VerificationStatus> = {};
      for (const ticket of allTickets) {
        const status = await supportService.getVerificationStatus(ticket.id);
        statuses[ticket.id] = status;
      }
      setVerificationStatuses(statuses);
    } catch (error) {
      console.error('Error loading deletion requests:', error);
      if (Platform.OS === 'web') {
        showSnackbar('Failed to load deletion requests', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartVerification = async (ticket: DeletionTicket) => {
    setStartingVerification(ticket.id);
    try {
      const result = await supportService.startVerification(ticket.id, supportAgentId);
      
      if (result.success) {
        showSnackbar('Verification email sent to user', 'success', 5000);
        // Refresh verification status
        const status = await supportService.getVerificationStatus(ticket.id);
        setVerificationStatuses(prev => ({
          ...prev,
          [ticket.id]: status,
        }));
        // Refresh tickets to update status
        loadDeletionRequests();
      } else {
        showSnackbar(result.error || 'Failed to start verification', 'error', 6000);
      }
    } catch (error) {
      console.error('Error starting verification:', error);
      showSnackbar('Failed to start verification', 'error', 6000);
    } finally {
      setStartingVerification(null);
    }
  };

  const handleResendVerification = async (ticket: DeletionTicket) => {
    setResendingVerification(ticket.id);
    try {
      const result = await supportService.resendVerificationEmail(ticket.id, supportAgentId);
      
      if (result.success) {
        showSnackbar('Verification email resent to user', 'success', 5000);
        // Refresh verification status
        const status = await supportService.getVerificationStatus(ticket.id);
        setVerificationStatuses(prev => ({
          ...prev,
          [ticket.id]: status,
        }));
        loadDeletionRequests();
      } else {
        showSnackbar(result.error || 'Failed to resend verification email', 'error', 6000);
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
      showSnackbar('Failed to resend verification email', 'error', 6000);
    } finally {
      setResendingVerification(null);
    }
  };

  const handleAdminOverride = async (ticket: DeletionTicket) => {
    if (!isAdmin()) {
      showSnackbar('Only admins can override verification', 'error', 4000);
      return;
    }

    const confirmMessage = `Admin Override Verification\n\nYou are about to override the verification requirement for this deletion request.\n\nTicket ID: ${ticket.id}\nUser Email: ${ticket.userEmail}\n\nThis should only be used in urgent cases where email verification is not possible.\n\nProceed with admin override?`;
    
    const confirmed = Platform.OS === 'web'
      ? window.confirm(confirmMessage)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Admin Override Verification',
            confirmMessage,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Override', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmed) return;

    try {
      const result = await supportService.adminOverrideVerification(ticket.id, user?.id || supportAgentId);
      
      if (result.success) {
        showSnackbar('Admin override applied', 'success', 4000);
        // Refresh verification status
        const status = await supportService.getVerificationStatus(ticket.id);
        setVerificationStatuses(prev => ({
          ...prev,
          [ticket.id]: status,
        }));
        loadDeletionRequests();
      } else {
        showSnackbar(result.error || 'Failed to apply admin override', 'error', 6000);
      }
    } catch (error) {
      console.error('Error applying admin override:', error);
      showSnackbar('Failed to apply admin override', 'error', 6000);
    }
  };

  const verifyDeletionRequest = async (ticket: DeletionTicket): Promise<boolean> => {
    // Step 1: Verify request legitimacy
    const verificationMessage = `⚠️ VERIFICATION REQUIRED ⚠️\n\nBefore proceeding, you MUST verify this deletion request:\n\n1. Have you contacted the user at ${ticket.userEmail} to confirm?\n2. Did the user respond from the SAME email address?\n3. Is this request less than 30 days old?\n4. Is there any active dispute or subscription issue?\n\n⚠️ ONLY proceed if you have verified the request is legitimate.\n\nHave you completed verification?`;
    
    if (Platform.OS === 'web') {
      return window.confirm(verificationMessage);
    } else {
      return new Promise<boolean>((resolve) => {
        Alert.alert(
          'VERIFICATION REQUIRED',
          verificationMessage,
          [
            { text: 'No - Need to Verify', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Yes - Verified', style: 'default', onPress: () => resolve(true) }
          ]
        );
      });
    }
  };

  const handleDeleteUser = async (ticket: DeletionTicket) => {
    const userEmail = ticket.userEmail;
    
    // STEP 1: Check verification status
    const verificationStatus = verificationStatuses[ticket.id] || await supportService.getVerificationStatus(ticket.id);
    
    if (!verificationStatus.verified && !isAdmin()) {
      if (Platform.OS === 'web') {
        showSnackbar('Verification required. Please wait for user to verify via email link, or use admin override.', 'warning', 6000);
      } else {
        Alert.alert(
          'Verification Required',
          'The user must verify the deletion request via email link before proceeding. If you are an admin, you can use the admin override option.',
          [{ text: 'OK' }]
        );
      }
      return;
    }

    // If not verified but admin, show confirmation
    if (!verificationStatus.verified && isAdmin()) {
      const adminConfirm = Platform.OS === 'web'
        ? window.confirm('⚠️ VERIFICATION NOT COMPLETE ⚠️\n\nThe user has not verified via email yet.\n\nAs an admin, you can proceed, but this is not recommended.\n\nConsider using the "Admin Override" button first, or wait for user verification.\n\nProceed anyway?')
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Verification Not Complete',
              'The user has not verified via email yet. As an admin, you can proceed, but this is not recommended. Consider using the "Admin Override" button first, or wait for user verification.',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Proceed Anyway', style: 'destructive', onPress: () => resolve(true) }
              ]
            );
          });
      
      if (!adminConfirm) return;
    }
    
    // STEP 2: Final confirmation
    const confirmMessage = `⚠️ FINAL CONFIRMATION ⚠️\n\nYou are about to PERMANENTLY DELETE:\n\nEmail: ${userEmail}\nTicket ID: ${ticket.id}\n\nThis will delete:\n• User account\n• All notes and documents\n• All preferences and settings\n• All subscriptions\n\n❌ THIS ACTION CANNOT BE UNDONE!\n\nProceed with deletion?`;
    
    const confirmed = Platform.OS === 'web' 
      ? window.confirm(confirmMessage)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'FINAL CONFIRMATION',
            confirmMessage,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'DELETE ACCOUNT', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmed) return;

    setProcessingTicket(ticket.id);
    setSelectedTicket(ticket);
    setDeletionProgress({
      step: 'Starting deletion process...',
      progress: 0,
      details: [],
    });

    try {
      // Step 1: Find user by email
      setDeletionProgress(prev => prev ? {
        ...prev,
        step: 'Finding user account...',
        progress: 10,
        details: [...prev.details, `Searching for user: ${userEmail}`]
      } : null);

      const { data: authUsers, error: searchError } = await supabase.rpc(
        'search_users_by_email_or_name',
        { search_query: userEmail }
      );

      if (searchError) {
        console.error('Error searching for user:', searchError);
        throw new Error(`Failed to find user: ${searchError.message}`);
      }

      const userToDelete = authUsers?.find((u: any) => u.email === userEmail);
      
      if (!userToDelete) {
        throw new Error(`No user found with email: ${userEmail}`);
      }

      const userId = userToDelete.id;

      setDeletionProgress(prev => prev ? {
        ...prev,
        step: 'User found, deleting data...',
        progress: 20,
        details: [...prev.details, `✓ User found: ${userId}`]
      } : null);

      // Step 2: Delete user's notes
      setDeletionProgress(prev => prev ? {
        ...prev,
        step: 'Deleting notes...',
        progress: 30,
        details: [...prev.details, 'Deleting all user notes...']
      } : null);

      const { data: deletedNotes, error: notesError } = await supabase
        .from('notes')
        .delete()
        .eq('user_id', userId)
        .select('id');

      const notesCount = deletedNotes?.length || 0;

      setDeletionProgress(prev => prev ? {
        ...prev,
        progress: 40,
        details: [...prev.details, `✓ Deleted ${notesCount} notes`]
      } : null);

      // Step 3: Delete audio files metadata
      setDeletionProgress(prev => prev ? {
        ...prev,
        step: 'Deleting audio files...',
        progress: 50,
        details: [...prev.details, 'Deleting audio file records...']
      } : null);

      const { data: deletedAudio, error: audioError } = await supabase
        .from('audio_files')
        .delete()
        .eq('user_id', userId)
        .select('id');

      const audioCount = deletedAudio?.length || 0;

      setDeletionProgress(prev => prev ? {
        ...prev,
        progress: 55,
        details: [...prev.details, `✓ Deleted ${audioCount} audio files`]
      } : null);

      // Step 4: Delete PDF files metadata
      setDeletionProgress(prev => prev ? {
        ...prev,
        step: 'Deleting PDF files...',
        progress: 60,
        details: [...prev.details, 'Deleting PDF file records...']
      } : null);

      const { data: deletedPDFs, error: pdfError } = await supabase
        .from('pdf_files')
        .delete()
        .eq('user_id', userId)
        .select('id');

      const pdfCount = deletedPDFs?.length || 0;

      setDeletionProgress(prev => prev ? {
        ...prev,
        progress: 65,
        details: [...prev.details, `✓ Deleted ${pdfCount} PDF files`]
      } : null);

      // Step 5: Delete flashcards
      setDeletionProgress(prev => prev ? {
        ...prev,
        step: 'Deleting flashcards...',
        progress: 70,
        details: [...prev.details, 'Deleting flashcards...']
      } : null);

      const { data: deletedFlashcards } = await supabase
        .from('flashcards')
        .delete()
        .eq('user_id', userId)
        .select('id');

      const flashcardsCount = deletedFlashcards?.length || 0;

      setDeletionProgress(prev => prev ? {
        ...prev,
        progress: 75,
        details: [...prev.details, `✓ Deleted ${flashcardsCount} flashcards`]
      } : null);

      // Step 6: Delete quizzes
      setDeletionProgress(prev => prev ? {
        ...prev,
        step: 'Deleting quizzes...',
        progress: 80,
        details: [...prev.details, 'Deleting quizzes...']
      } : null);

      const { data: deletedQuizzes } = await supabase
        .from('quizzes')
        .delete()
        .eq('user_id', userId)
        .select('id');

      const quizzesCount = deletedQuizzes?.length || 0;

      setDeletionProgress(prev => prev ? {
        ...prev,
        progress: 82,
        details: [...prev.details, `✓ Deleted ${quizzesCount} quizzes`]
      } : null);

      // Step 7: Delete feature usage
      setDeletionProgress(prev => prev ? {
        ...prev,
        step: 'Deleting usage records...',
        progress: 85,
        details: [...prev.details, 'Deleting feature usage records...']
      } : null);

      await supabase
        .from('user_feature_usage')
        .delete()
        .eq('user_id', userId);

      setDeletionProgress(prev => prev ? {
        ...prev,
        progress: 88,
        details: [...prev.details, '✓ Deleted usage records']
      } : null);

      // Step 8: Delete shared notes
      setDeletionProgress(prev => prev ? {
        ...prev,
        step: 'Removing shared notes...',
        progress: 90,
        details: [...prev.details, 'Deleting shared note records...']
      } : null);

      await supabase
        .from('shared_notes')
        .delete()
        .or(`owner_id.eq.${userId},shared_with_id.eq.${userId}`);

      setDeletionProgress(prev => prev ? {
        ...prev,
        progress: 92,
        details: [...prev.details, '✓ Deleted shared notes']
      } : null);

      // Step 9: Mark user profile as deleted
      setDeletionProgress(prev => prev ? {
        ...prev,
        step: 'Marking account as deleted...',
        progress: 93,
        details: [...prev.details, 'Marking user profile as deleted...']
      } : null);

      await supabase
        .from('user_profiles')
        .update({
          deleted_at: new Date().toISOString(),
          role: 'deleted'
        })
        .eq('id', userId);

      setDeletionProgress(prev => prev ? {
        ...prev,
        progress: 95,
        details: [...prev.details, '✓ Account marked as deleted']
      } : null);

      // Step 10: Delete from authentication system
      setDeletionProgress(prev => prev ? {
        ...prev,
        step: 'Removing authentication account...',
        progress: 97,
        details: [...prev.details, 'Deleting user from auth system...']
      } : null);

      const { data: authDeletionResult, error: authDeletionError } = await supabase.rpc(
        'delete_auth_user',
        { user_id_to_delete: userId }
      );

      if (authDeletionError) {
        console.error('Error deleting auth user:', authDeletionError);
        setDeletionProgress(prev => prev ? {
          ...prev,
          details: [...prev.details, `⚠️ Warning: Could not delete auth account: ${authDeletionError.message}`]
        } : null);
      } else if (authDeletionResult && !authDeletionResult.success) {
        console.warn('Auth deletion returned error:', authDeletionResult);
        setDeletionProgress(prev => prev ? {
          ...prev,
          details: [...prev.details, `⚠️ Warning: ${authDeletionResult.error}`]
        } : null);
      } else {
        setDeletionProgress(prev => prev ? {
          ...prev,
          progress: 98,
          details: [...prev.details, '✓ Authentication account deleted']
        } : null);
      }

      // Step 11: Create audit log
      setDeletionProgress(prev => prev ? {
        ...prev,
        step: 'Creating audit log...',
        progress: 99,
        details: [...prev.details, 'Logging deletion for compliance...']
      } : null);

      const deletionSummary = {
        notes: notesCount,
        audio: audioCount,
        pdfs: pdfCount,
        flashcards: flashcardsCount,
        quizzes: quizzesCount,
        totalItems: notesCount + audioCount + pdfCount + flashcardsCount + quizzesCount,
      };

      try {
        await supabase.rpc('log_user_deletion', {
          deleted_user_id: userId,
          deleted_user_email: userEmail,
          deleted_by: supportAgentId,
          deletion_summary: deletionSummary,
        });
        setDeletionProgress(prev => prev ? {
          ...prev,
          details: [...prev.details, '✓ Audit log created']
        } : null);
      } catch (auditError) {
        console.warn('Could not create audit log:', auditError);
        // Non-critical, continue
      }

      // Step 12: Update ticket status
      setDeletionProgress(prev => prev ? {
        ...prev,
        step: 'Updating ticket status...',
        progress: 99,
        details: [...prev.details, 'Marking ticket as resolved...']
      } : null);

      await supportService.updateTicketStatus(
        ticket.id,
        'resolved',
        {
          assignedTo: supportAgentId,
          resolvedBy: supportAgentId,
          resolutionNotes: `Account deleted successfully. Deleted: ${notesCount} notes, ${audioCount} audio files, ${pdfCount} PDFs, ${flashcardsCount} flashcards, ${quizzesCount} quizzes.`,
        }
      );

      setDeletionProgress(prev => prev ? {
        ...prev,
        step: 'Complete!',
        progress: 100,
        details: [...prev.details, '✓ Ticket marked as resolved', `✅ DELETION COMPLETE - Total: ${notesCount} notes, ${audioCount} audio, ${pdfCount} PDFs deleted`]
      } : null);

      // Show success
      if (Platform.OS === 'web') {
        showSnackbar(
          `Account deleted successfully! Deleted ${notesCount} notes, ${audioCount} audio files, ${pdfCount} PDFs`,
          'success',
          5000
        );
      } else {
        Alert.alert(
          'Deletion Complete',
          `Account deleted successfully!\n\nDeleted:\n• ${notesCount} notes\n• ${audioCount} audio files\n• ${pdfCount} PDFs\n• ${flashcardsCount} flashcards\n• ${quizzesCount} quizzes`
        );
      }

      // Refresh tickets after 2 seconds
      setTimeout(() => {
        loadDeletionRequests();
        setSelectedTicket(null);
        setDeletionProgress(null);
      }, 2000);

    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete user';
      
      setDeletionProgress(prev => prev ? {
        ...prev,
        step: 'Error!',
        details: [...prev.details, `❌ Error: ${errorMsg}`]
      } : null);

      if (Platform.OS === 'web') {
        showSnackbar(`Error: ${errorMsg}`, 'error', 8000);
      } else {
        Alert.alert('Deletion Error', errorMsg);
      }
    } finally {
      setProcessingTicket(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return accentDanger;
      case 'medium':
        return accentWarning;
      default:
        return textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return accentSuccess;
      case 'in_progress':
        return accentWarning;
      case 'pending':
        return accentPrimary;
      default:
        return textSecondary;
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentPrimary} />
          <ThemedText style={styles.loadingText}>Loading deletion requests...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Stats */}
        <View style={styles.statsRow}>
          <ThemedView style={styles.statCard}>
            <ThemedText style={styles.statNumber}>{tickets.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Total Requests</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <ThemedText style={[styles.statNumber, { color: accentWarning }]}>
              {tickets.filter(t => t.status === 'pending').length}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Pending</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <ThemedText style={[styles.statNumber, { color: accentSuccess }]}>
              {tickets.filter(t => t.status === 'resolved').length}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Resolved</ThemedText>
          </ThemedView>
        </View>

        {/* Deletion Progress Modal */}
        {deletionProgress && (
          <ThemedView style={styles.progressModal}>
            <ThemedText style={styles.progressTitle}>Processing Deletion</ThemedText>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${deletionProgress.progress}%`, backgroundColor: accentPrimary }]} />
            </View>
            <ThemedText style={styles.progressStep}>{deletionProgress.step}</ThemedText>
            <ThemedText style={styles.progressPercent}>{deletionProgress.progress}%</ThemedText>
            
            <View style={styles.detailsList}>
              {deletionProgress.details.map((detail, idx) => (
                <ThemedText key={idx} style={styles.detailItem}>{detail}</ThemedText>
              ))}
            </View>
          </ThemedView>
        )}

        {/* Tickets List */}
        {tickets.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color={accentSuccess} />
            <ThemedText style={styles.emptyTitle}>No Pending Deletion Requests</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              All account deletion requests have been processed
            </ThemedText>
          </View>
        ) : (
          tickets.map((ticket) => (
            <ThemedView key={ticket.id} style={styles.ticketCard}>
              {/* Header with badges */}
              <View style={styles.ticketHeader}>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: getStatusColor(ticket.status) }]}>
                    <Text style={styles.badgeText}>{ticket.status.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: getPriorityColor(ticket.priority) }]}>
                    <Text style={styles.badgeText}>{ticket.priority.toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              {/* Ticket Details */}
              <ThemedText style={styles.ticketEmail}>
                <Ionicons name="mail" size={16} color={textColor} /> {ticket.userEmail}
              </ThemedText>
              
              <ThemedText style={styles.ticketId}>
                Ticket ID: {ticket.id}
              </ThemedText>

              {ticket.userId && (
                <ThemedText style={styles.ticketUserId}>
                  User ID: {ticket.userId}
                </ThemedText>
              )}

              {ticket.description && (
                <ThemedView style={styles.reasonSection}>
                  <ThemedText style={styles.reasonLabel}>Reason for deletion:</ThemedText>
                  <ThemedText style={styles.reasonText}>{ticket.description}</ThemedText>
                </ThemedView>
              )}

              <ThemedText style={styles.ticketDate}>
                Submitted: {ticket.createdAt.toLocaleString()}
              </ThemedText>

              {/* Verification Status */}
              {(() => {
                const verificationStatus = verificationStatuses[ticket.id] || { status: 'pending', verified: false };
                return (
                  <ThemedView style={[
                    styles.verificationWarning,
                    verificationStatus.verified && styles.verificationVerified,
                    verificationStatus.status === 'admin_override' && styles.verificationAdminOverride
                  ]}>
                    <Ionicons 
                      name={verificationStatus.verified ? "checkmark-circle" : "warning"} 
                      size={20} 
                      color={verificationStatus.verified ? accentSuccess : accentWarning} 
                    />
                    <View style={styles.verificationTextContainer}>
                      <ThemedText style={styles.verificationTitle}>
                        {verificationStatus.verified 
                          ? (verificationStatus.status === 'admin_override' ? 'Verified (Admin Override)' : 'Verified')
                          : 'Verification Required'}
                      </ThemedText>
                      <ThemedText style={styles.verificationText}>
                        {verificationStatus.verified
                          ? verificationStatus.status === 'admin_override'
                            ? `Admin override applied by ${verificationStatus.verifiedBy || 'admin'}`
                            : `Verified at ${verificationStatus.verifiedAt ? new Date(verificationStatus.verifiedAt).toLocaleString() : 'unknown'}`
                          : `An email has been sent to ${ticket.userEmail}. Please wait for the user to click the verification link.`}
                      </ThemedText>
                    </View>
                  </ThemedView>
                );
              })()}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {(() => {
                  const verificationStatus = verificationStatuses[ticket.id] || { status: 'pending', verified: false };
                  const isVerified = verificationStatus.verified;
                  
                  if (ticket.status === 'pending' || (!isVerified && ticket.status === 'in_progress')) {
                    return (
                      <>
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: accentWarning }]}
                          onPress={() => handleStartVerification(ticket)}
                          disabled={startingVerification === ticket.id || resendingVerification === ticket.id || processingTicket === ticket.id}
                        >
                          {startingVerification === ticket.id ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Ionicons name="mail" size={20} color="#FFFFFF" />
                              <Text style={styles.actionButtonText}>Start Verification</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        {ticket.status === 'in_progress' && !isVerified && (
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: accentPrimary }]}
                            onPress={() => handleResendVerification(ticket)}
                            disabled={resendingVerification === ticket.id || startingVerification === ticket.id || processingTicket === ticket.id}
                          >
                            {resendingVerification === ticket.id ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                                <Text style={styles.actionButtonText}>Resend Email</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}

                        {isAdmin() && (
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
                            onPress={() => handleAdminOverride(ticket)}
                            disabled={processingTicket === ticket.id}
                          >
                            <Ionicons name="shield" size={20} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Admin Override</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={[
                            styles.actionButton, 
                            { backgroundColor: accentDanger },
                            !isVerified && !isAdmin() && styles.disabledButton
                          ]}
                          onPress={() => handleDeleteUser(ticket)}
                          disabled={processingTicket === ticket.id || (!isVerified && !isAdmin())}
                        >
                          {processingTicket === ticket.id ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Ionicons name="trash" size={20} color="#FFFFFF" />
                              <Text style={styles.actionButtonText}>
                                {isVerified ? 'Delete Account' : 'Delete (Requires Verification)'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </>
                    );
                  }

                  if ((ticket.status === 'in_progress' && isVerified) || ticket.status === 'resolved') {
                    return (
                      <>
                        {isVerified && (
                          <ThemedView style={styles.inProgressNote}>
                            <Ionicons name="checkmark-circle" size={16} color={accentSuccess} />
                            <ThemedText style={styles.inProgressText}>
                              Request verified. Ready to delete.
                            </ThemedText>
                          </ThemedView>
                        )}
                        
                        {ticket.status !== 'resolved' && (
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: accentDanger }]}
                            onPress={() => handleDeleteUser(ticket)}
                            disabled={processingTicket === ticket.id}
                          >
                            {processingTicket === ticket.id ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Ionicons name="trash" size={20} color="#FFFFFF" />
                                <Text style={styles.actionButtonText}>Complete Deletion</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </>
                    );
                  }

                  return null;
                })()}

                {ticket.status !== 'resolved' && ticket.status !== 'cancelled' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={async () => {
                      try {
                        await supportService.updateTicketStatus(ticket.id, 'cancelled', {
                          resolutionNotes: 'Cancelled by support agent',
                        });
                        loadDeletionRequests();
                        if (Platform.OS === 'web') {
                          showSnackbar('Ticket cancelled', 'info');
                        }
                      } catch (error) {
                        console.error('Error cancelling ticket:', error);
                      }
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color={textSecondary} />
                    <Text style={[styles.actionButtonText, { color: textSecondary }]}>Cancel Request</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ThemedView>
          ))
        )}
      </ScrollView>

      {/* Refresh Button */}
      <TouchableOpacity
        style={[styles.refreshButton, { backgroundColor: accentPrimary }]}
        onPress={loadDeletionRequests}
      >
        <Ionicons name="refresh" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  ticketCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  ticketEmail: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  ticketId: {
    fontSize: 12,
    fontFamily: 'monospace',
    opacity: 0.7,
    marginBottom: 4,
  },
  ticketUserId: {
    fontSize: 12,
    fontFamily: 'monospace',
    opacity: 0.7,
    marginBottom: 8,
  },
  reasonSection: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  ticketDate: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  progressModal: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#6A5ACD',
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressStep: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressPercent: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
    textAlign: 'center',
  },
  detailsList: {
    gap: 4,
  },
  detailItem: {
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.8,
  },
  verificationWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF8C00',
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
  },
  verificationTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  verificationText: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.9,
  },
  inProgressNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    backgroundColor: 'rgba(60, 179, 113, 0.1)',
    width: '100%',
  },
  inProgressText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  verificationVerified: {
    backgroundColor: 'rgba(60, 179, 113, 0.1)',
    borderColor: '#3CB371',
  },
  verificationAdminOverride: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderColor: '#FF9800',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

