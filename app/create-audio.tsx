import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { VoiceRecorderSimple } from '../components/VoiceRecorderSimple';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { useFeatureLimits } from '../hooks/useFeatureLimits';
import { AudioUtils } from '../services/AudioUtils';
import { supabaseNoteStorage } from '../services/SupabaseNoteStorage';
import { useAudioUpload } from '../contexts/AudioUploadContext';
import { useTranslation } from '../hooks/useTranslation';

// Import web components
import { LoadingSpinner } from '../components/LoadingSpinner';
import { UserSidebar } from '../components/web/UserSidebar';
import { WebLayout } from '../components/web/WebLayout';

export default function CreateAudioNoteScreen() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { canUseFeature, isPremium: hookIsPremium } = useFeatureLimits();
  const { setUploadingAudio, updateUploadProgress, updateUploadStatus, onUploadComplete } = useAudioUpload();
  
  // Use direct premium check as primary method since hook has issues with canceled subscriptions
  const isPremium = Boolean(user?.premium?.isActive && user?.premium?.status !== 'canceled');
  
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [canSave, setCanSave] = useState(false);
  const [recordingUsage, setRecordingUsage] = useState<{
    currentUsage: number;
    limit: number | 'unlimited';
    remaining: number | 'unlimited';
  } | null>(null);
  const [sessionLimit, setSessionLimit] = useState<number | 'unlimited' | null>(null);

  const userId = user?.id || '';

  // Helper function to format usage display
  const formatUsageDisplay = () => {
    if (!recordingUsage) return t('audioNote.loadingUsageData');
    
    const currentUsage = recordingUsage.currentUsage ?? 0;
    const limit = recordingUsage.limit;
    const remaining = recordingUsage.remaining;
    
    // Check for NaN values and convert to 0
    const safeCurrentUsage = isNaN(currentUsage) ? 0 : currentUsage;
    const safeLimit = (typeof limit === 'number' && isNaN(limit)) ? 0 : limit;
    const safeRemaining = (typeof remaining === 'number' && isNaN(remaining)) ? 0 : remaining;
    
    if (safeLimit === 'unlimited') {
      return t('audioNote.unlimitedRecordingTimeUsed', { usage: safeCurrentUsage });
    }
    
    if (safeRemaining === 'unlimited') {
      return t('audioNote.unlimitedRecordingTime');
    }
    
    const remainingValue = safeRemaining ?? 0;
    const limitValue = safeLimit ?? 0;
    
    return t('audioNote.remainingMin', { remaining: remainingValue, current: safeCurrentUsage, limit: limitValue });
  };

  // Helper function to format session limit display
  const formatSessionLimitDisplay = () => {
    if (sessionLimit === null) return t('audioNote.loadingSessionLimits');
    
    if (sessionLimit === 'unlimited') {
      return t('audioNote.noSessionTimeLimit');
    }
    
    return t('audioNote.maxRecordingSession', { limit: sessionLimit });
  };

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const backgroundTertiary = useThemeColor({}, 'backgroundTertiary');

  // Global cleanup on component mount
  useEffect(() => {
    AudioUtils.globalCleanup().catch(console.error);
  }, []);

  // Load recording usage information
  const loadRecordingUsage = async () => {
    if (!user?.id) return;
    
    // Use direct premium check as primary method since hook has issues with canceled subscriptions
    const directPremiumCheck = Boolean(user?.premium?.isActive && user?.premium?.status !== 'canceled');
    const effectiveIsPremium = directPremiumCheck; // Always use direct check for canceled subscription handling
    
    console.log('[CreateAudio] ===== LOADING RECORDING USAGE =====');
    console.log('[CreateAudio] Loading recording usage. User:', user?.id, 'isPremium:', isPremium, 'directPremiumCheck:', directPremiumCheck, 'effectiveIsPremium:', effectiveIsPremium);
    console.log('[CreateAudio] User premium status:', user?.premium);
    
    try {
      // Check cache first, but validate the data
      const { featureCacheService } = await import('../services/FeatureCacheService');
      const cacheKey = `voice_recording_usage_${user.id}_${effectiveIsPremium}`;
      
      // Debug: Check what's in the cache
      console.log('[CreateAudio] Cache key:', cacheKey);
      const allCacheKeys = featureCacheService.getKeys();
      console.log('[CreateAudio] All cache keys:', allCacheKeys);
      
      const cachedUsage = await featureCacheService.get<{
        recordingUsage: {
          currentUsage: number;
          limit: number | 'unlimited';
          remaining: number | 'unlimited';
        };
        sessionLimit: number | 'unlimited';
        timestamp: number;
      }>(cacheKey);
      
      // Validate cached data - if it looks suspicious (very high usage), clear cache and fetch fresh
      if (cachedUsage && cachedUsage.recordingUsage) {
        const { currentUsage, limit } = cachedUsage.recordingUsage;
        const isSuspiciousUsage = typeof currentUsage === 'number' && currentUsage > 100; // More than 100 minutes seems suspicious
        
        if (isSuspiciousUsage) {
          console.log('[CreateAudio] Suspicious cached usage detected, clearing cache:', cachedUsage);
          await featureCacheService.remove(cacheKey);
          // Continue to fetch fresh data below
        } else {
          console.log('[CreateAudio] Using cached usage data:', cachedUsage);
          setRecordingUsage(cachedUsage.recordingUsage);
          setSessionLimit(cachedUsage.sessionLimit);
          return;
        }
      }
      
      // Use feature limit service directly with corrected premium status
      const { featureLimitService } = await import('../services/FeatureLimitService');
      await featureLimitService.initialize();
      
      // Force clear any cached data in the service itself
      await featureLimitService.clearCacheAndReload();
      
      const usage = await featureLimitService.getUserFeatureUsage(user.id, 'voice_recording', effectiveIsPremium);
      console.log('[CreateAudio] Raw usage data (direct):', usage);
      console.log('[CreateAudio] User ID being queried:', user.id);
      console.log('[CreateAudio] Feature ID being queried: voice_recording');
      
      // Debug the usage calculation
      if (usage && usage.currentPeriod) {
        console.log('[CreateAudio] Usage calculation details:');
        console.log('  - usage.currentPeriod.usage:', usage.currentPeriod.usage);
        console.log('  - usage.currentPeriod.limit:', usage.currentPeriod.limit);
        console.log('  - usage.currentPeriod.remaining:', usage.currentPeriod.remaining);
        console.log('  - usage.currentPeriod.limitType:', usage.currentPeriod.limitType);
        console.log('  - usage.isPremium:', usage.isPremium);
      }
      
      // Load session limit
      const sessionLimitValue = await featureLimitService.getSessionLimit('voice_recording', effectiveIsPremium);
      setSessionLimit(sessionLimitValue);
      console.log('[CreateAudio] Session limit loaded:', sessionLimitValue);
      
      if (usage && usage.currentPeriod) {
        console.log('[CreateAudio] Current period data (direct):', usage.currentPeriod);
        
        // Validate and sanitize the usage data
        const currentUsage = usage.currentPeriod.usage;
        const limit = usage.currentPeriod.limit;
        const remaining = usage.currentPeriod.remaining;
        
        console.log('[CreateAudio] Raw values - currentUsage:', currentUsage, 'limit:', limit, 'remaining:', remaining);
        console.log('[CreateAudio] Value types - currentUsage:', typeof currentUsage, 'limit:', typeof limit, 'remaining:', typeof remaining);
        
        // Only use values from database, no hardcoded fallbacks
        const safeCurrentUsage = (typeof currentUsage === 'number' && !isNaN(currentUsage)) ? currentUsage : 0;
        const safeLimit = limit;
        const safeRemaining = remaining;
        
        console.log('[CreateAudio] Safe values - currentUsage:', safeCurrentUsage, 'limit:', safeLimit, 'remaining:', safeRemaining);
        
        const usageData = {
          currentUsage: safeCurrentUsage,
          limit: safeLimit,
          remaining: safeRemaining
        };
        
        setRecordingUsage(usageData);
        
        // Cache the usage data
        const cacheData = {
          recordingUsage: usageData,
          sessionLimit: sessionLimitValue,
          timestamp: Date.now()
        };
        await featureCacheService.set(cacheKey, cacheData, 2 * 60 * 1000); // Cache for 2 minutes
        console.log('[CreateAudio] Cached usage data:', cacheData);
      } else {
        // No usage data available from database
        console.log('[CreateAudio] No usage data available from database');
        setRecordingUsage(null);
      }
    } catch (error) {
      console.error('Error loading recording usage:', error);
      console.log('[CreateAudio] Error loading usage data from database');
      // Don't set fallback values, only use database values
      setRecordingUsage(null);
      setSessionLimit(null);
    }
  };

  useEffect(() => {
    // Clear any cached usage data when user changes to prevent cross-user contamination
    const clearUserCache = async () => {
      try {
        const { featureCacheService } = await import('../services/FeatureCacheService');
        // Clear ALL cache entries to prevent cross-user data contamination
        await featureCacheService.clear();
        console.log('[CreateAudio] Cleared ALL cache for user change');
      } catch (error) {
        console.warn('[CreateAudio] Error clearing cache:', error);
      }
    };
    
    clearUserCache().then(() => {
      loadRecordingUsage();
    });
  }, [user?.id, user?.premium?.isActive, user?.premium?.status]);

  // Update canSave based on content
  useEffect(() => {
    const hasContent = Boolean(title.trim()) || hasRecording;
    setCanSave(hasContent && !isLoading);
  }, [title, hasRecording, isLoading]);

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Store the blob in a ref so it persists across renders and navigation
  const audioBlobRef = useRef<Blob | null>(null);

  const handleRecordingComplete = async (audioFile: any) => {
    try {
      console.log('[CreateAudio] Recording completed:', audioFile);
      
      // Store the blob for later use in transcription
      if (audioFile.blob) {
        audioBlobRef.current = audioFile.blob;
        console.log('[CreateAudio] Stored blob for transcription, size:', audioFile.blob.size);
      }
      
      // Record audio usage tracking
      try {
        console.log('[CreateAudio] ===== STARTING USAGE TRACKING =====');
        const { featureLimitService } = await import('../services/FeatureLimitService');
        await featureLimitService.initialize();
        
        const directPremiumCheck = Boolean(user?.premium?.isActive && user?.premium?.status !== 'canceled');
        const durationInMinutes = Math.round(audioFile.duration / 60);
        
        await featureLimitService.recordFeatureUsage(
          user?.id || '',
          'voice_recording',
          durationInMinutes,
          directPremiumCheck,
          'duration'
        );
        
        console.log(`[CreateAudio] ✅ SUCCESS: Recorded audio usage: ${durationInMinutes} minutes`);
        
        // Invalidate cache
        const { featureCacheService } = await import('../services/FeatureCacheService');
        const cacheKey = `voice_recording_usage_${user?.id}_${directPremiumCheck}`;
        await featureCacheService.remove(cacheKey);
        console.log('[CreateAudio] ===== USAGE TRACKING COMPLETE =====');
      } catch (usageError) {
        console.error('[CreateAudio] ❌ ERROR recording audio usage:', usageError);
      }

      // Upload audio file to Supabase storage
      console.log('[CreateAudio] Uploading audio to storage...');
      console.log('[CreateAudio] Audio file object:', {
        hasBlob: !!audioFile.blob,
        filename: audioFile.filename,
        duration: audioFile.duration
      });
      
      const tempNoteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { audioStorage } = await import('../services/AudioStorage');
      
      console.log('[CreateAudio] About to call uploadAudioFile with:', {
        filename: audioFile.filename,
        userId: userId,
        tempNoteId: tempNoteId,
        hasBlob: !!audioFile.blob
      });
      
      // Pass the blob if available (web recording provides this)
      const uploadedAudioUrl = await audioStorage.uploadAudioFile(
        audioFile.filename,
        userId,
        tempNoteId,
        audioFile.blob // Pass the blob for web uploads
      );
      
      console.log('[CreateAudio] Audio uploaded successfully:', uploadedAudioUrl);

      // Set audioUri state so saveNote can access it
      setAudioUri(uploadedAudioUrl);
      setRecordingDuration(audioFile.duration);
      setHasRecording(true);
      setCanSave(true);
      console.log('[CreateAudio] Set audioUri state:', uploadedAudioUrl);

      // Calculate file size for display
      const fileSizeKB = (audioFile.duration * 16) / 1000; // Rough estimate: 16KB per second
      const fileSize = fileSizeKB > 1024 
        ? `${(fileSizeKB / 1024).toFixed(1)} MB` 
        : `${fileSizeKB.toFixed(0)} KB`;

      // Set uploading audio state to show card on home screen
      const uploadState = {
        fileName: title.trim() || 'Audio Note',
        fileSize: `${Math.floor(audioFile.duration / 60)}:${String(Math.floor(audioFile.duration % 60)).padStart(2, '0')} • ${fileSize}`,
        duration: audioFile.duration,
        audioUrl: uploadedAudioUrl,
        progress: 10,
        status: 'uploading' as const,
        statusMessage: t('audioNote.audioUploaded'),
        title: title.trim(),
        tags: tags,
      };
      
      console.log('[CreateAudio] Setting upload state:', uploadState);
      setUploadingAudio(uploadState);

      // Use setTimeout to ensure state is set before navigation (fixes mobile timing issue)
      setTimeout(() => {
        console.log('[CreateAudio] Navigating to home screen to show upload card');
        // Navigate back to home screen to show the uploading card
        router.replace('/(tabs)');
        
        // Process in background - pass the blob for transcription
        processAudioInBackground(uploadedAudioUrl, audioFile.duration, tempNoteId, title.trim(), tags);
      }, 100);

    } catch (error) {
      console.error('[CreateAudio] Error processing recording:', error);
      
      // Show more specific error message based on the error type
      let errorMessage = t('audioNote.failedToProcessRecording');
      
      if (error instanceof Error) {
        if (error.message.includes('Network connection issue')) {
          errorMessage = t('audioNote.networkConnectionIssue');
        } else if (error.message.includes('Upload timeout')) {
          errorMessage = t('audioNote.uploadTimeout');
        } else if (error.message.includes('Audio storage bucket not configured')) {
          errorMessage = t('audioNote.audioStorageNotConfigured');
        } else if (error.message.includes('Audio storage permissions not configured')) {
          errorMessage = t('audioNote.audioStoragePermissionsNotConfigured');
        } else if (error.message.includes('Failed to upload audio file')) {
          errorMessage = error.message; // Use the specific error message from AudioStorage
        }
      }
      
      Alert.alert(t('audioNote.error'), errorMessage);
    }
  };

  // Process audio in background after navigating to home
  const processAudioInBackground = async (
    audioUrl: string,
    duration: number,
    noteId: string,
    noteTitle: string,
    noteTags: string[]
  ) => {
    console.log('[CreateAudio] ===== processAudioInBackground CALLED =====');
    console.log('[CreateAudio] Parameters:', {
      audioUrl,
      duration,
      noteId,
      noteTitle,
      noteTags,
      userId: user?.id,
      hasBlob: !!audioBlobRef.current,
      blobSize: audioBlobRef.current?.size,
      blobType: audioBlobRef.current?.type
    });
    
    try {
      // Ensure user is set before processing
      if (!user?.id) {
        throw new Error('No user authenticated');
      }
      
      // Set the current user on the storage service to ensure authentication
      supabaseNoteStorage.setCurrentUser(user.id);
      
      // Check if note already exists (from saveNote) or needs to be created (from handleRecordingComplete)
      let finalNoteId = noteId;
      if (noteId.startsWith('note_') && noteId.includes('_')) {
        // This is a temp ID from handleRecordingComplete, create the note
        console.log('[CreateAudio] Creating new note for background processing (temp ID detected)');
        updateUploadProgress(30, t('audioNote.creatingNote'));
        
        const note = await supabaseNoteStorage.createNote({
          title: noteTitle || 'Audio Note',
          content: '',
          tags: noteTags,
          summary: '',
          audioUrl: audioUrl,
          audioDuration: duration,
        });
        
        finalNoteId = note.id;
        updateUploadProgress(50, t('audioNote.noteCreatedSuccessfully'));
        console.log('[CreateAudio] Note created:', note.id);
      } else {
        // Note already exists (from saveNote), use the provided ID
        console.log('[CreateAudio] Using existing note ID:', noteId);
        finalNoteId = noteId;
      }

      // Process audio for transcription and summary
      try {
        updateUploadStatus('processing', t('audioNote.aiProcessingAudio'));
        updateUploadProgress(60, t('audioNote.transcribingAudio'));
        
        // Get the stored blob if available (for web recordings)
        const audioBlob = audioBlobRef.current;
        console.log('[CreateAudio] Processing with blob:', !!audioBlob);
        
        console.log('[CreateAudio] Calling AudioUtils.processAudioForTranscription with:', {
          audioUrl,
          userId,
          noteId: finalNoteId,
          hasBlob: !!audioBlob
        });
        
        const processingResult = await AudioUtils.processAudioForTranscription(
          audioUrl,
          userId,
          finalNoteId,
          (message, progress) => {
            console.log('[CreateAudio] Processing progress:', message, progress);
            updateUploadProgress(60 + (progress * 0.4), message); // Scale 0-100 to 60-100
          },
          audioBlob || undefined // Pass the blob if available
        );
        
        console.log('[CreateAudio] Processing result:', {
          success: processingResult.success,
          hasTranscription: !!processingResult.transcription,
          hasTitle: !!processingResult.title,
          hasSummary: !!processingResult.summary,
          hasKeyDetails: !!processingResult.keyDetails?.length,
          error: processingResult.error
        });
        
        // Clear the blob ref after successful processing
        if (audioBlob) {
          audioBlobRef.current = null;
          console.log('[CreateAudio] Cleared blob ref after processing');
        }

        // Always update note with any AI content that was generated
        // Even if processingResult.success is false, we may have partial results
        if (processingResult) {
          updateUploadProgress(95, t('audioNote.savingAiGeneratedContent'));
          console.log('[CreateAudio] Updating note with AI content:', {
            noteId: finalNoteId,
            title: processingResult.title || noteTitle || 'Audio Note',
            transcriptionLength: processingResult.transcription?.length || 0,
            summaryLength: processingResult.summary?.length || 0,
            keyDetailsCount: processingResult.keyDetails?.length || 0
          });
          
          await supabaseNoteStorage.updateNote(finalNoteId, {
            title: processingResult.title || noteTitle || 'Audio Note',
            content: processingResult.transcription || '',
            summary: processingResult.summary || '',
            keyDetails: processingResult.keyDetails || [],
          });
          
          console.log('[CreateAudio] ===== NOTE SUCCESSFULLY UPDATED WITH AI CONTENT =====');
          console.log('[CreateAudio] Final note state:', {
            hasTitle: !!processingResult.title,
            hasTranscription: !!processingResult.transcription,
            hasSummary: !!processingResult.summary,
            hasKeyDetails: !!processingResult.keyDetails?.length,
          });
        } else {
          console.warn('[CreateAudio] No processing result received, skipping note update');
        }
      } catch (processingError) {
        console.warn('[CreateAudio] Audio processing failed:', processingError);
      }

      // Mark as complete
      updateUploadStatus('completed', t('audioNote.audioNoteCreatedSuccessfully'));
      updateUploadProgress(100, t('audioNote.complete'));

      // Call the upload complete callback to refresh notes list
      console.log('[CreateAudio] Calling onUploadComplete to refresh notes list...');
      if (onUploadComplete) {
        await onUploadComplete();
      }

      // Clear the uploading state after 2 seconds
      setTimeout(() => {
        setUploadingAudio(null);
      }, 2000);

    } catch (error) {
      console.error('[CreateAudio] Error in background processing:', error);
      updateUploadStatus('error', t('audioNote.failedToProcessAudio'));
    }
  };

  const saveNote = async () => {
    if (!canSave || isLoading) return;

    try {
      setIsLoading(true);
      setShowProgressBar(true);
      setProgress(10);
      setProgressMessage('Saving note...');

      if (!noteId) {
        // Create new note
        const note = await supabaseNoteStorage.createNote({
          title: title.trim() || 'Audio Note',
          content: '',
          tags: tags,
          summary: '',
          audioUrl: audioUri,
          audioDuration: recordingDuration,
        });

        // Process audio in background BEFORE navigation so blob is still available
        if (audioUri && user?.id) {
          console.log('[CreateAudio] Starting background processing for saved note');
          console.log('[CreateAudio] Audio details:', {
            audioUri,
            duration: recordingDuration,
            noteId: note.id,
            hasBlob: !!audioBlobRef.current,
            blobSize: audioBlobRef.current?.size,
            blobType: audioBlobRef.current?.type
          });
          
          setProgress(50);
          setProgressMessage('Note created, processing audio...');
          
          // Process in background - don't await, let it run while we navigate
          processAudioInBackground(
            audioUri,
            recordingDuration,
            note.id,
            title.trim() || 'Audio Note',
            tags
          ).catch((error) => {
            console.error('[CreateAudio] Background processing error:', error);
          });

          // Navigate after starting processing (but don't wait for it)
          setTimeout(() => {
            router.replace(`/note/${note.id}` as any);
          }, 100);
        } else {
          console.warn('[CreateAudio] Cannot process audio - missing audioUri or user:', {
            hasAudioUri: !!audioUri,
            audioUri: audioUri,
            hasUser: !!user?.id,
            userId: user?.id
          });
          setProgress(100);
          setProgressMessage('Complete!');
          setShowProgressBar(false);
          setIsLoading(false);
          
          // Navigate to the note page
          router.replace(`/note/${note.id}` as any);
        }
      } else {
        // Update existing note
        await supabaseNoteStorage.updateNote(noteId, {
          title: title.trim() || 'Audio Note',
          content: '',
          tags: tags,
          summary: '',
        });

        setProgress(100);
        setProgressMessage('Complete!');
        setShowProgressBar(false);
        setIsLoading(false);

        // Navigate to the note page (replace to avoid back button going to create-audio)
        router.replace(`/note/${noteId}` as any);

        // Process audio in background if audio exists and hasn't been processed
        if (audioUri && user?.id) {
          console.log('[CreateAudio] Starting background processing for updated note');
          console.log('[CreateAudio] Audio details:', {
            audioUri,
            duration: recordingDuration,
            noteId,
            hasBlob: !!audioBlobRef.current,
            blobSize: audioBlobRef.current?.size
          });
          processAudioInBackground(
            audioUri,
            recordingDuration,
            noteId,
            title.trim() || 'Audio Note',
            tags
          ).catch((error) => {
            console.error('[CreateAudio] Background processing error:', error);
          });
        } else {
          console.warn('[CreateAudio] Cannot process audio for update - missing audioUri or user:', {
            hasAudioUri: !!audioUri,
            hasUser: !!user?.id
          });
        }
      }
    } catch (error) {
      console.error('[CreateAudio] Error saving note:', error);
      setShowProgressBar(false);
      setIsLoading(false);
      Alert.alert(t('audioNote.error'), t('audioNote.failedToSaveNote'));
    }
  };


  // Show loading state while authentication is in progress
  if (authLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={50} />
          <ThemedText style={[styles.loadingText, { color: textColor }]}>
            {t('audioNote.loadingAuthentication')}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <WebLayout sidebar={<UserSidebar />}>
        <ThemedView style={styles.webContainer}>
          {/* Header */}
          <ThemedView style={styles.webHeader}>
            <View style={styles.webHeaderLeft}>
              <TouchableOpacity 
                style={styles.webBackButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={20} color={textColor} />
                <ThemedText style={styles.webBackText}>{t('audioNote.back')}</ThemedText>
              </TouchableOpacity>
            </View>
            
            <View style={styles.webHeaderCenter}>
              <ThemedText style={styles.webHeaderTitle}>{t('audioNote.createAudioNote')}</ThemedText>
            </View>

            <View style={styles.webHeaderRight}>
              <TouchableOpacity
                style={{
                  ...styles.webSaveButton,
                  backgroundColor: canSave ? accentPrimary : backgroundTertiary,
                  opacity: canSave ? 1 : 0.5
                }}
                onPress={saveNote}
                disabled={!canSave || isLoading}
              >
                <ThemedText style={[styles.webSaveButtonText, { color: canSave ? "#FFFFFF" : textSecondaryColor }]}>
                  {isLoading ? t('audioNote.saving') : t('audioNote.saveNote')}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>

          {/* Progress Bar */}
          {showProgressBar && (
            <ThemedView style={styles.webProgressWrapper}>
              <ThemedView style={[styles.webProgressContainer, { backgroundColor: backgroundTertiary }]}>
                <View 
                  style={{
                    ...styles.webProgressBar, 
                    width: `${progress}%`,
                    backgroundColor: accentPrimary 
                  }} 
                />
              </ThemedView>
              <ThemedText style={styles.webProgressText}>
                {progressMessage || 'Processing...'} {progress}%
              </ThemedText>
            </ThemedView>
          )}

          {/* Main Content */}
          <View style={styles.webContent}>
            {/* Audio Recorder Section */}
              <ThemedView style={styles.webSection}>
              <View style={styles.webSectionHeader}>
                <ThemedText style={styles.webSectionTitle}>{t('audioNote.recordAudio')}</ThemedText>
                <View style={styles.webSectionBadge}>
                  <Ionicons name="mic" size={16} color={accentPrimary} />
                  <ThemedText style={styles.webSectionBadgeText}>{t('audioNote.voice')}</ThemedText>
                </View>
              </View>
              
              {/* Recording Usage Display */}
              <View style={styles.webUsageContainer}>
                <View style={styles.webUsageInfo}>
                  <Ionicons name="time" size={16} color={textSecondaryColor} />
                  <ThemedText style={[styles.webUsageText, { color: textSecondaryColor }]}>
                    {formatUsageDisplay()}
                  </ThemedText>
                </View>
                <View style={styles.webUsageInfo}>
                  <Ionicons name="stopwatch" size={16} color={textSecondaryColor} />
                  <ThemedText style={[styles.webUsageText, { color: textSecondaryColor }]}>
                    {formatSessionLimitDisplay()}
                  </ThemedText>
                </View>
                {!isPremium && recordingUsage && recordingUsage.limit !== 'unlimited' && (
                  <View style={styles.webUpgradeHint}>
                    <Ionicons name="star" size={14} color={accentPrimary} />
                    <ThemedText style={[styles.webUpgradeText, { color: accentPrimary }]}>
                      {t('audioNote.upgradeToPremiumForUnlimited')}
                    </ThemedText>
                  </View>
                )}
              </View>
              
              {/* Show upgrade card instead of recorder when out of minutes */}
              {!isPremium && recordingUsage && recordingUsage.remaining === 0 && recordingUsage.limit !== 'unlimited' ? (
                <ThemedView style={[styles.webUpgradeCard, { backgroundColor: backgroundSecondary }]}>
                  <View style={styles.webUpgradeCardContent}>
                    <View style={styles.webUpgradeCardIcon}>
                      <Ionicons name="star" size={32} color={accentPrimary} />
                    </View>
                    <View style={styles.webUpgradeCardText}>
                      <ThemedText style={[styles.webUpgradeCardTitle, { color: textColor }]}>
                        {t('audioNote.recordingLimitReached')}
                      </ThemedText>
                      <ThemedText style={[styles.webUpgradeCardDescription, { color: textSecondaryColor }]}>
                        {t('audioNote.usedAllMinutesWeb', { limit: recordingUsage.limit })}
                      </ThemedText>
                    </View>
                    <TouchableOpacity 
                      style={[styles.webUpgradeCardButton, { backgroundColor: accentPrimary }]}
                      onPress={() => router.push('/join-premium')}
                    >
                      <ThemedText style={styles.webUpgradeCardButtonText}>{t('audioNote.upgradeNow')}</ThemedText>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </ThemedView>
              ) : (
                <ThemedView style={styles.webRecorderContainer}>
                  <VoiceRecorderSimple
                    onRecordingComplete={handleRecordingComplete}
                    userId={userId}
                    noteId={noteId || undefined}
                    onProgress={setProgress}
                    disabled={Boolean(recordingUsage && (recordingUsage.remaining === 0 || (typeof recordingUsage.remaining === 'number' && recordingUsage.remaining <= 0)) && recordingUsage.limit !== 'unlimited')}
                  />
                </ThemedView>
              )}
            </ThemedView>

            {/* Title Section */}
            <ThemedView style={styles.webSection}>
              <View style={styles.webSectionHeader}>
                <ThemedText style={styles.webSectionTitle}>{t('audioNote.noteTitle')}</ThemedText>
                <View style={styles.webSectionBadge}>
                  <Ionicons name="document-text" size={16} color={accentPrimary} />
                  <ThemedText style={styles.webSectionBadgeText}>{t('audioNote.required')}</ThemedText>
                </View>
              </View>
              <TextInput
                style={[styles.webInput, { backgroundColor: backgroundSecondary, color: textColor, borderColor: backgroundTertiary }]}
                value={title}
                onChangeText={setTitle}
                placeholder={t('audioNote.enterDescriptiveTitle')}
                placeholderTextColor={textSecondaryColor}
              />
            </ThemedView>

            {/* Tags Section */}
            <ThemedView style={styles.webSection}>
              <View style={styles.webSectionHeader}>
                <ThemedText style={styles.webSectionTitle}>{t('audioNote.tags')}</ThemedText>
                <View style={styles.webSectionBadge}>
                  <Ionicons name="pricetag" size={16} color={accentPrimary} />
                  <ThemedText style={styles.webSectionBadgeText}>{t('audioNote.optional')}</ThemedText>
                </View>
              </View>
              <View style={styles.webTagInputContainer}>
                <TextInput
                  style={[styles.webTagInput, { backgroundColor: backgroundSecondary, color: textColor, borderColor: backgroundTertiary }]}
                  value={newTag}
                  onChangeText={setNewTag}
                  placeholder={t('audioNote.addTagEnter')}
                  placeholderTextColor={textSecondaryColor}
                  onSubmitEditing={addTag}
                />
                <TouchableOpacity 
                  style={[styles.webAddTagButton, { backgroundColor: accentPrimary }]} 
                  onPress={addTag}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              
              {tags.length > 0 && (
                <View style={styles.webTagsContainer}>
                  {tags.map((tag, index) => (
                    <View key={index} style={[styles.webTag, { backgroundColor: accentPrimary }]}>
                      <ThemedText style={styles.webTagText}>{tag}</ThemedText>
                      <TouchableOpacity
                        style={styles.webTagRemove}
                        onPress={() => removeTag(tag)}
                      >
                        <ThemedText style={styles.webTagRemoveText}>×</ThemedText>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ThemedView>
          </View>
        </ThemedView>
      </WebLayout>
    );
  }

  // Mobile layout
  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: backgroundTertiary }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          
          <ThemedText style={[styles.headerTitle, { color: textColor }]}>
            {t('audioNote.createAudioNote')}
          </ThemedText>
          
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress Bar */}
        {showProgressBar && (
          <View style={styles.mobileProgressWrapper}>
            <View style={[styles.progressContainer, { backgroundColor: backgroundTertiary }]}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${progress}%`,
                    backgroundColor: accentPrimary 
                  }
                ]} 
              />
            </View>
            <ThemedText style={[styles.progressText, { color: textColor }]}>
              {progressMessage || 'Processing...'} {progress}%
            </ThemedText>
            {__DEV__ && (
              <ThemedText style={[styles.debugText, { color: textColor }]}>
                Debug: showProgressBar={showProgressBar.toString()}, progress={progress}, message=&quot;{progressMessage}&quot;
              </ThemedText>
            )}
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Audio Recorder Section */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>{t('audioNote.recordAudio')}</ThemedText>
            
            {/* Recording Usage Display */}
            <View style={styles.usageContainer}>
              <View style={styles.usageInfo}>
                <Ionicons name="time" size={16} color={textSecondaryColor} />
                <ThemedText style={[styles.usageText, { color: textSecondaryColor }]}>
                  {formatUsageDisplay()}
                </ThemedText>
              </View>
              <View style={styles.usageInfo}>
                <Ionicons name="stopwatch" size={16} color={textSecondaryColor} />
                <ThemedText style={[styles.usageText, { color: textSecondaryColor }]}>
                  {formatSessionLimitDisplay()}
                </ThemedText>
              </View>
              {!isPremium && recordingUsage && recordingUsage.limit !== 'unlimited' && (
                <View style={styles.upgradeHint}>
                  <Ionicons name="star" size={14} color={accentPrimary} />
                  <ThemedText style={[styles.upgradeText, { color: accentPrimary }]}>
                    {t('audioNote.upgradeToPremiumForUnlimited')}
                  </ThemedText>
                </View>
              )}
            </View>
            
            {/* Show upgrade card instead of recorder when out of minutes */}
            {!isPremium && recordingUsage && recordingUsage.remaining === 0 && recordingUsage.limit !== 'unlimited' ? (
              <View style={[styles.upgradeCard, { backgroundColor: backgroundSecondary }]}>
                <View style={styles.upgradeCardContent}>
                  <View style={styles.upgradeCardIcon}>
                    <Ionicons name="star" size={28} color={accentPrimary} />
                  </View>
                  <View style={styles.upgradeCardText}>
                    <ThemedText style={[styles.upgradeCardTitle, { color: textColor }]}>
                      {t('audioNote.recordingLimitReached')}
                    </ThemedText>
                    <ThemedText style={[styles.upgradeCardDescription, { color: textSecondaryColor }]}>
                      {t('audioNote.usedAllMinutes', { limit: recordingUsage.limit })}
                    </ThemedText>
                  </View>
                  <TouchableOpacity 
                    style={[styles.upgradeCardButton, { backgroundColor: accentPrimary }]}
                    onPress={() => router.push('/join-premium')}
                  >
                    <ThemedText style={styles.upgradeCardButtonText}>{t('audioNote.upgradeNow')}</ThemedText>
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.recorderContainer, { backgroundColor: backgroundSecondary }]}>
                <VoiceRecorderSimple
                  onRecordingComplete={handleRecordingComplete}
                  userId={userId}
                  noteId={noteId || undefined}
                  onProgress={setProgress}
                  disabled={Boolean(recordingUsage && (recordingUsage.remaining === 0 || (typeof recordingUsage.remaining === 'number' && recordingUsage.remaining <= 0)) && recordingUsage.limit !== 'unlimited')}
                />
              </View>
            )}
          </View>

          {/* Title Section */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>{t('audioNote.title')}</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: backgroundSecondary, color: textColor, borderColor: backgroundTertiary }]}
              value={title}
              onChangeText={setTitle}
              placeholder={t('audioNote.enterNoteTitle')}
              placeholderTextColor={textSecondaryColor}
            />
          </View>

          {/* Tags Section */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>{t('audioNote.tags')}</ThemedText>
            <View style={styles.tagInputContainer}>
              <TextInput
                style={[styles.tagInput, { backgroundColor: backgroundSecondary, color: textColor, borderColor: backgroundTertiary }]}
                value={newTag}
                onChangeText={setNewTag}
                placeholder={t('audioNote.addTag')}
                placeholderTextColor={textSecondaryColor}
                onSubmitEditing={addTag}
              />
              <TouchableOpacity style={[styles.addTagButton, { backgroundColor: accentPrimary }]} onPress={addTag}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map((tag, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: accentPrimary }]}>
                    <ThemedText style={styles.tagText}>{tag}</ThemedText>
                    <TouchableOpacity onPress={() => removeTag(tag)}>
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Save Button */}
          <View style={styles.saveButtonContainer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { 
                  backgroundColor: canSave ? accentPrimary : backgroundTertiary,
                  opacity: canSave ? 1 : 0.5
                }
              ]}
              onPress={saveNote}
              disabled={!canSave || isLoading}
            >
              <ThemedText style={[styles.saveButtonText, { color: canSave ? "#FFFFFF" : textSecondaryColor }]}>
                {isLoading ? t('audioNote.saving') : t('audioNote.saveNote')}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Mobile styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  mobileProgressWrapper: {
    marginHorizontal: 40,
    marginBottom: 20,
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  debugText: {
    fontSize: 10,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.7,
  },
  content: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  usageContainer: {
    marginBottom: 16,
  },
  usageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  usageText: {
    fontSize: 14,
    marginLeft: 8,
  },
  upgradeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upgradeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  recorderContainer: {
    borderRadius: 12,
    padding: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tagInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  addTagButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  saveButtonContainer: {
    marginTop: 20,
  },
  saveButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 50,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Web styles
  webContainer: {
    flex: 1,
    padding: 32,
    maxWidth: '100%',
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  webBackText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  webHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  webHeaderTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  webHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webProgressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  webProgressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  webProgressBar: {
    height: '100%',
    borderRadius: 4,
  },
  webProgressText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginLeft: 12,
  },
  webContent: {
    flex: 1,
  },
  webSection: {
    marginBottom: 40,
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  webSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  webSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 0,
  },
  webSectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  webSectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  webUsageContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  webUsageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  webUsageText: {
    fontSize: 14,
    marginLeft: 8,
  },
  webUpgradeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  webUpgradeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  webRecorderContainer: {
    borderRadius: 12,
    padding: 20,
  },
  webInput: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  webTagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webTagInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    marginRight: 12,
  },
  webAddTagButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  webTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  webTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  webTagText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  webTagRemove: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  webTagRemoveText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  webSaveButton: {
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: '600',
  },
  webSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Upgrade Card Styles
  webUpgradeCard: {
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(106, 90, 205, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  webUpgradeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 20,
  },
  webUpgradeCardIcon: {
    flexShrink: 0,
  },
  webUpgradeCardText: {
    flex: 1,
  },
  webUpgradeCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  webUpgradeCardDescription: {
    fontSize: 16,
    lineHeight: 22,
  },
  webUpgradeCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexShrink: 0,
  },
  webUpgradeCardButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Mobile Upgrade Card Styles
  upgradeCard: {
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(106, 90, 205, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  upgradeCardContent: {
    padding: 20,
    alignItems: 'center',
  },
  upgradeCardIcon: {
    marginBottom: 12,
  },
  upgradeCardText: {
    alignItems: 'center',
    marginBottom: 16,
  },
  upgradeCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  upgradeCardDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  upgradeCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  upgradeCardButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
