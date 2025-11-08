import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Image, Platform, ScrollView, TouchableOpacity, View, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '../hooks/useThemeColor';
import { useTranslation } from '../hooks/useTranslation';
import { LanguageSelector } from './LanguageSelector';
import { styles } from './LandingPage.styles';

export default function LandingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const accentSuccess = useThemeColor({}, 'accentSuccess');
  
  const [userCount] = useState('1,000+');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    if (Platform.OS === 'web') {
      const updateSize = () => {
        const { width } = Dimensions.get('window');
        setIsMobile(width < 768);
      };

      updateSize();
      const subscription = Dimensions.addEventListener('change', updateSize);
      return () => subscription?.remove();
    }
  }, []);

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Navigation Header */}
        <View style={[styles.header, { backgroundColor: backgroundSecondary }]}>
          <View style={styles.headerContent}>
            <View style={styles.logo}>
              <Image
                source={require('../assets/images/WiznoteLogoNov25.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <ThemedText style={[styles.logoText, { color: textColor }]}>WizNote</ThemedText>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={[styles.loginButton, { borderColor: accentPrimary }]} 
                onPress={() => router.push('/(auth)/login')}
              >
                <ThemedText style={[styles.loginButtonText, { color: accentPrimary }]}>{t('landing.logIn')}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.signupButton, { backgroundColor: accentPrimary }]} 
                onPress={() => router.push('/signup')}
              >
                <ThemedText style={styles.signupButtonText}>{t('landing.getStartedFree')}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Hero Section */}
        {isMobile ? (
          // Mobile Layout: Stack vertically
          <View style={styles.heroSectionMobile}>
            {/* Top: Badge */}
            <View style={[styles.badge, { backgroundColor: 'rgba(106, 90, 205, 0.1)' }]}>
              <Ionicons name="trending-up" size={16} color={accentPrimary} />
              <ThemedText style={[styles.badgeText, { color: accentPrimary }]}>
                {t('landing.joinStudents').replace('{{count}}', userCount)}
              </ThemedText>
            </View>
            
            {/* Title */}
            <ThemedText style={[styles.heroTitleMobile, { color: textColor }]}>
              {t('landing.heroTitle')}
            </ThemedText>
            
            {/* Subtitle */}
            <ThemedText style={[styles.heroSubtitleMobile, { color: textSecondaryColor }]}>
              {t('landing.heroSubtitle')}
            </ThemedText>

            {/* CTA Buttons */}
            <View style={styles.heroButtonsMobile}>
              <TouchableOpacity 
                style={[styles.ctaButtonMobile, { backgroundColor: accentPrimary }]} 
                onPress={() => router.push('/signup')}
              >
                <ThemedText style={styles.ctaButtonText}>{t('landing.startFreeNoCard')}</ThemedText>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.secondaryCtaMobile, { borderColor: accentPrimary }]} 
                onPress={() => {
                  const element = document.getElementById('features');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <ThemedText style={[styles.secondaryCtaText, { color: accentPrimary }]}>{t('landing.seeHowItWorks')}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Desktop Layout: Original side-by-side design
          <View style={styles.heroSection}>
            <View style={styles.heroContent}>
              <View style={[styles.badge, { backgroundColor: 'rgba(138, 43, 226, 0.1)', borderWidth: 1, borderColor: 'rgba(138, 43, 226, 0.3)' }]}>
                <Ionicons name="trending-up" size={16} color={accentPrimary} />
                <ThemedText style={[styles.badgeText, { color: accentPrimary }]}>
                  {t('landing.joinStudents').replace('{{count}}', userCount)}
                </ThemedText>
              </View>
              
              <ThemedText style={[styles.heroTitle, { color: textColor }]}>
                {t('landing.heroTitle').replace('.', '.\n')}
              </ThemedText>
              
              <ThemedText style={[styles.heroSubtitle, { color: textSecondaryColor }]}>
                {t('landing.heroSubtitle')}
              </ThemedText>

              <View style={styles.heroButtons}>
                <TouchableOpacity 
                  style={[styles.ctaButton, { backgroundColor: accentPrimary }]} 
                  onPress={() => router.push('/signup')}
                >
                  <ThemedText style={styles.ctaButtonText}>{t('landing.startFreeNoCard')}</ThemedText>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.secondaryCta, { borderColor: accentPrimary }]} 
                  onPress={() => {
                    const element = document.getElementById('features');
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <ThemedText style={[styles.secondaryCtaText, { color: accentPrimary }]}>{t('landing.seeHowItWorks')}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Phone Mockup - Only shown on desktop web, hidden on mobile devices */}
            {Platform.OS === 'web' && !isMobile && (
              <View style={styles.phoneMockup}>
                <View style={[styles.phoneFrame, { backgroundColor: '#000000' }]}>
                  <View style={[styles.phoneScreen, { backgroundColor }]}>
                    {/* Status Bar */}
                    <View style={[styles.statusBar, { backgroundColor }]}>
                      <ThemedText style={[styles.statusTime, { color: textColor }]}>10:21</ThemedText>
                      <View style={styles.statusIcons}>
                        <Ionicons name="cellular" size={14} color={textColor} />
                        <Ionicons name="wifi" size={14} color={textColor} />
                        <Ionicons name="battery-half" size={14} color={textColor} />
                      </View>
                    </View>
                    
                    {/* App Header */}
                    <View style={styles.appHeader}>
                      <View style={styles.logoSection}>
                        <View style={[styles.appLogo, { backgroundColor: accentPrimary }]}>
                          <Ionicons name="document-text" size={20} color="#FFFFFF" />
                        </View>
                        <ThemedText style={[styles.appName, { color: textColor }]}>WizNote</ThemedText>
                      </View>
                      <View style={[styles.createButton, { backgroundColor: accentPrimary }]}>
                        <Ionicons name="add" size={20} color="#FFFFFF" />
                      </View>
                    </View>
                    
                    {/* Recent Notes Section */}
                    <View style={styles.notesSection}>
                      <View style={styles.sectionHeader}>
                        <ThemedText style={[styles.sectionTitleMobile, { color: textColor }]}>{t('landing.recentNotes')}</ThemedText>
                        <View style={[styles.sortButton, { backgroundColor: backgroundSecondary }]}>
                          <ThemedText style={[styles.sortText, { color: textColor }]}>{t('landing.newestFirst')}</ThemedText>
                          <Ionicons name="chevron-down" size={14} color={textColor} />
                        </View>
                      </View>
                      
                      {/* Sample Note Card */}
                      <View style={[styles.noteCard, { backgroundColor: backgroundSecondary }]}>
                        <View style={styles.noteHeader}>
                          <ThemedText style={[styles.noteTitle, { color: textColor }]}>CompTIA A+</ThemedText>
                          <ThemedText style={[styles.noteTime, { color: textSecondaryColor }]}>Just now</ThemedText>
                        </View>
                        <View style={[styles.noteTag, { backgroundColor: 'rgba(76, 175, 80, 0.2)' }]}>
                          <Ionicons name="document-text" size={12} color="#4CAF50" />
                          <ThemedText style={[styles.tagText, { color: '#4CAF50' }]}>Text</ThemedText>
                        </View>
                        <ThemedText style={[styles.notePreview, { color: textSecondaryColor }]} numberOfLines={2}>
                          Perfect 👍 You want Module 1 Notes for CompTIA A+ (Core 1 - 220-1101). Here's a clean, comprehensive overview...
                        </ThemedText>
                        <View style={styles.noteActions}>
                          <View style={[styles.actionButton, { backgroundColor: backgroundSecondary }]}>
                            <Ionicons name="pin" size={14} color={textSecondaryColor} />
                          </View>
                          <View style={[styles.actionButton, { backgroundColor: backgroundSecondary }]}>
                            <Ionicons name="download" size={14} color={textSecondaryColor} />
                          </View>
                          <View style={[styles.actionButton, { backgroundColor: backgroundSecondary }]}>
                            <Ionicons name="trash" size={14} color={textSecondaryColor} />
                          </View>
                        </View>
                      </View>
                    </View>
                    
                        {/* Bottom Navigation */}
                        <View style={[styles.bottomNav, { backgroundColor: backgroundSecondary }]}>
                          <View style={styles.navItem}>
                            <Ionicons name="document-text" size={20} color={accentPrimary} />
                            <ThemedText style={[styles.navText, { color: accentPrimary }]}>{t('landing.notes')}</ThemedText>
                          </View>
                          <View style={styles.navItem}>
                            <Ionicons name="flash" size={20} color={textSecondaryColor} />
                            <ThemedText style={[styles.navText, { color: textSecondaryColor }]}>{t('landing.cards')}</ThemedText>
                          </View>
                          <View style={styles.navItem}>
                            <Ionicons name="apps" size={20} color={textSecondaryColor} />
                            <ThemedText style={[styles.navText, { color: textSecondaryColor }]}>{t('landing.quiz')}</ThemedText>
                          </View>
                          <View style={styles.navItem}>
                            <Ionicons name="settings" size={20} color={textSecondaryColor} />
                            <ThemedText style={[styles.navText, { color: textSecondaryColor }]}>{t('settings.settings')}</ThemedText>
                          </View>
                        </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Features Section */}
        <View id="features" style={[styles.featuresSection, { backgroundColor: backgroundSecondary }]}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            {t('landing.fromLecturesToAs')}
          </ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>
            {t('landing.everythingYouNeed')}
          </ThemedText>

          <View style={styles.featuresGrid}>
            <View style={[styles.featureCard, { backgroundColor }]}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(106, 90, 205, 0.1)' }]}>
                <Ionicons name="mic" size={32} color={accentPrimary} />
              </View>
              <ThemedText style={[styles.featureTitle, { color: textColor }]}>
                {t('landing.recordLectures')}
              </ThemedText>
              <ThemedText style={[styles.featureDescription, { color: textSecondaryColor }]}>
                {t('landing.recordLecturesDesc')}
              </ThemedText>
            </View>

            <View style={[styles.featureCard, { backgroundColor }]}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(106, 90, 205, 0.1)' }]}>
                <Ionicons name="layers" size={32} color={accentPrimary} />
              </View>
              <ThemedText style={[styles.featureTitle, { color: textColor }]}>
                {t('landing.autoFlashcards')}
              </ThemedText>
              <ThemedText style={[styles.featureDescription, { color: textSecondaryColor }]}>
                {t('landing.autoFlashcardsDesc')}
              </ThemedText>
            </View>

            <View style={[styles.featureCard, { backgroundColor }]}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(106, 90, 205, 0.1)' }]}>
                <Ionicons name="school" size={32} color={accentPrimary} />
              </View>
              <ThemedText style={[styles.featureTitle, { color: textColor }]}>
                {t('landing.practiceQuizzes')}
              </ThemedText>
              <ThemedText style={[styles.featureDescription, { color: textSecondaryColor }]}>
                {t('landing.practiceQuizzesDesc')}
              </ThemedText>
            </View>

            <View style={[styles.featureCard, { backgroundColor }]}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(106, 90, 205, 0.1)' }]}>
                <Ionicons name="document-text" size={32} color={accentPrimary} />
              </View>
              <ThemedText style={[styles.featureTitle, { color: textColor }]}>
                {t('landing.smartSummaries')}
              </ThemedText>
              <ThemedText style={[styles.featureDescription, { color: textSecondaryColor }]}>
                {t('landing.smartSummariesDesc')}
              </ThemedText>
            </View>

            <View style={[styles.featureCard, { backgroundColor }]}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(106, 90, 205, 0.1)' }]}>
                <Ionicons name="cloud-upload" size={32} color={accentPrimary} />
              </View>
              <ThemedText style={[styles.featureTitle, { color: textColor }]}>
                {t('landing.pdfUpload')}
              </ThemedText>
              <ThemedText style={[styles.featureDescription, { color: textSecondaryColor }]}>
                {t('landing.pdfUploadDesc')}
              </ThemedText>
            </View>

            <View style={[styles.featureCard, { backgroundColor }]}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(106, 90, 205, 0.1)' }]}>
                <Ionicons name="sync" size={32} color={accentPrimary} />
              </View>
              <ThemedText style={[styles.featureTitle, { color: textColor }]}>
                {t('landing.syncEverywhere')}
              </ThemedText>
              <ThemedText style={[styles.featureDescription, { color: textSecondaryColor }]}>
                {t('landing.syncEverywhereDesc')}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Social Proof / Testimonials Section */}
        <View style={styles.testimonialsSection}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            {t('landing.lovedByStudents')}
          </ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>
            {t('landing.seeWhatStudentsAreSaying')}
          </ThemedText>

          <View style={styles.testimonialsGrid}>
            <View style={[styles.testimonialCard, { backgroundColor: backgroundSecondary }]}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons key={star} name="star" size={16} color="#FFD700" />
                ))}
              </View>
              <ThemedText style={[styles.testimonialText, { color: textColor }]}>
                {t('landing.testimonial1')}
              </ThemedText>
              <ThemedText style={[styles.testimonialAuthor, { color: textSecondaryColor }]}>
                {t('landing.testimonial1Author')}
              </ThemedText>
            </View>

            <View style={[styles.testimonialCard, { backgroundColor: backgroundSecondary }]}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons key={star} name="star" size={16} color="#FFD700" />
                ))}
              </View>
              <ThemedText style={[styles.testimonialText, { color: textColor }]}>
                {t('landing.testimonial2')}
              </ThemedText>
              <ThemedText style={[styles.testimonialAuthor, { color: textSecondaryColor }]}>
                {t('landing.testimonial2Author')}
              </ThemedText>
            </View>

            <View style={[styles.testimonialCard, { backgroundColor: backgroundSecondary }]}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons key={star} name="star" size={16} color="#FFD700" />
                ))}
              </View>
              <ThemedText style={[styles.testimonialText, { color: textColor }]}>
                {t('landing.testimonial3')}
              </ThemedText>
              <ThemedText style={[styles.testimonialAuthor, { color: textSecondaryColor }]}>
                {t('landing.testimonial3Author')}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Pricing Section */}
        <View style={[styles.pricingSection, { backgroundColor: backgroundSecondary }]}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            {t('landing.studentFriendlyPricing')}
          </ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>
            {t('landing.startFreeUpgradeAnytime')}
          </ThemedText>

          <View style={styles.pricingCards}>
            {/* Free Plan */}
            <View style={[styles.pricingCard, { backgroundColor }]}>
              <ThemedText style={[styles.planName, { color: textColor }]}>{t('landing.free')}</ThemedText>
              <View style={styles.priceContainer}>
                <ThemedText style={[styles.price, { color: textColor }]}>$0</ThemedText>
                <ThemedText style={[styles.priceInterval, { color: textSecondaryColor }]}>{t('landing.month')}</ThemedText>
              </View>
              <ThemedText style={[styles.planDescription, { color: textSecondaryColor }]}>
                {t('landing.perfectForTrying')}
              </ThemedText>
              <View style={styles.planFeatures}>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color={accentSuccess} />
                  <ThemedText style={[styles.planFeatureText, { color: textSecondaryColor }]}>
                    5 {t('landing.aiTranscriptionsPerMonth')}
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color={accentSuccess} />
                  <ThemedText style={[styles.planFeatureText, { color: textSecondaryColor }]}>
                    30 {t('landing.minAudioRecording')}
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color={accentSuccess} />
                  <ThemedText style={[styles.planFeatureText, { color: textSecondaryColor }]}>
                    10 {t('landing.aiSummariesPerMonth')}
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color={accentSuccess} />
                  <ThemedText style={[styles.planFeatureText, { color: textSecondaryColor }]}>
                    20 {t('landing.flashcardsPerMonth')}
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color={accentSuccess} />
                  <ThemedText style={[styles.planFeatureText, { color: textSecondaryColor }]}>
                    5 {t('landing.pdfUploadsPerMonth')}
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.planButton, { borderColor: accentPrimary }]} 
                onPress={() => router.push('/signup')}
              >
                <ThemedText style={[styles.planButtonText, { color: accentPrimary }]}>
                  {t('landing.getStarted')}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Premium Plan */}
            <View style={[styles.pricingCard, styles.popularCard, { backgroundColor: accentPrimary }]}>
              <View style={[styles.popularBadge, { backgroundColor: '#FFFFFF' }]}>
                <ThemedText style={[styles.popularBadgeText, { color: accentPrimary }]}>{t('landing.mostPopular')}</ThemedText>
              </View>
              <ThemedText style={[styles.planName, { color: '#FFFFFF' }]}>{t('landing.premium')}</ThemedText>
              <View style={styles.priceContainer}>
                <ThemedText style={[styles.price, { color: '#FFFFFF' }]}>$9.99</ThemedText>
                <ThemedText style={[styles.priceInterval, { color: '#FFFFFF', opacity: 0.8 }]}>{t('landing.month')}</ThemedText>
              </View>
              <ThemedText style={[styles.planDescription, { color: '#FFFFFF', opacity: 0.9 }]}>
                {t('landing.everythingUnlimited')}
              </ThemedText>
              <View style={styles.planFeatures}>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <ThemedText style={[styles.planFeatureText, { color: '#FFFFFF' }]}>
                    {t('landing.unlimitedAiTranscriptions')}
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <ThemedText style={[styles.planFeatureText, { color: '#FFFFFF' }]}>
                    {t('landing.unlimitedAudioRecording')}
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <ThemedText style={[styles.planFeatureText, { color: '#FFFFFF' }]}>
                    {t('landing.unlimitedAiSummaries')}
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <ThemedText style={[styles.planFeatureText, { color: '#FFFFFF' }]}>
                    {t('landing.unlimitedFlashcards')}
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <ThemedText style={[styles.planFeatureText, { color: '#FFFFFF' }]}>
                    {t('landing.unlimitedPdfUploads')}
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <ThemedText style={[styles.planFeatureText, { color: '#FFFFFF' }]}>
                    {t('landing.priorityAiProcessing')}
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.planButton, { backgroundColor: '#FFFFFF' }]} 
                onPress={() => router.push('/signup')}
              >
                <ThemedText style={[styles.planButtonText, { color: accentPrimary }]}>
                  {t('landing.start7DayFreeTrial')}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Final CTA */}
        <View style={styles.finalCta}>
          <ThemedText style={[styles.finalCtaTitle, { color: textColor }]}>
            {t('landing.readyToStudySmarter')}
          </ThemedText>
          <ThemedText style={[styles.finalCtaSubtitle, { color: textSecondaryColor }]}>
            {t('landing.joinThousandsOfStudents')}
          </ThemedText>
          <TouchableOpacity 
            style={[styles.ctaButton, { backgroundColor: accentPrimary }]} 
            onPress={() => router.push('/signup')}
          >
            <ThemedText style={styles.ctaButtonText}>{t('landing.getStartedFree')}</ThemedText>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* App Store Badges */}
          <View style={styles.appBadges}>
            <TouchableOpacity 
              style={[styles.appBadge, { backgroundColor: '#000000' }]}
              onPress={() => window.open('https://play.google.com/store/apps/details?id=com.WizNote.app', '_blank')}
            >
              <Ionicons name="logo-google-playstore" size={24} color="#FFFFFF" />
              <View style={styles.appBadgeText}>
                <ThemedText style={[styles.appBadgeLabel, { color: '#FFFFFF' }]}>{t('landing.getItOn')}</ThemedText>
                <ThemedText style={[styles.appBadgeStore, { color: '#FFFFFF' }]}>{t('landing.googlePlay')}</ThemedText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.appBadge, { backgroundColor: '#888888', opacity: 0.6 }]}
              onPress={() => alert('iOS app coming soon! 🚀')}
            >
              <Ionicons name="logo-apple" size={24} color="#FFFFFF" />
              <View style={styles.appBadgeText}>
                <ThemedText style={[styles.appBadgeLabel, { color: '#FFFFFF' }]}>{t('landing.comingSoon')}</ThemedText>
                <ThemedText style={[styles.appBadgeStore, { color: '#FFFFFF' }]}>{t('landing.appStore')}</ThemedText>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: backgroundSecondary }]}>
          <View style={styles.footerContent}>
            <View style={styles.footerSection}>
              <ThemedText style={[styles.footerTitle, { color: textColor }]}>WizNote</ThemedText>
              <ThemedText style={[styles.footerText, { color: textSecondaryColor }]}>
                {t('landing.aiPoweredNoteTaking')}
              </ThemedText>
              <LanguageSelector />
            </View>
            <View style={styles.footerSection}>
              <ThemedText style={[styles.footerTitle, { color: textColor }]}>{t('landing.product')}</ThemedText>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <ThemedText style={[styles.footerLink, { color: textSecondaryColor }]}>{t('landing.logIn')}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/signup')}>
                <ThemedText style={[styles.footerLink, { color: textSecondaryColor }]}>{t('landing.signUp')}</ThemedText>
              </TouchableOpacity>
            </View>
            <View style={styles.footerSection}>
              <ThemedText style={[styles.footerTitle, { color: textColor }]}>{t('landing.legal')}</ThemedText>
              <TouchableOpacity onPress={() => router.push('/privacy')}>
                <ThemedText style={[styles.footerLink, { color: textSecondaryColor }]}>{t('landing.privacyPolicy')}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/terms')}>
                <ThemedText style={[styles.footerLink, { color: textSecondaryColor }]}>{t('landing.termsOfService')}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.footerBottom}>
            <ThemedText style={[styles.copyright, { color: textSecondaryColor }]}>
              {t('landing.copyright')}
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}


