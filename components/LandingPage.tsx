import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Image, Platform, ScrollView, StyleSheet, TouchableOpacity, View, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '../hooks/useThemeColor';
import { Logo } from './Logo';

export default function LandingPage() {
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
              <Logo size={60} showBackground={true} />
              <ThemedText style={[styles.logoText, { color: textColor }]}>WizNote</ThemedText>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={[styles.loginButton, { borderColor: accentPrimary }]} 
                onPress={() => router.push('/(auth)/login')}
              >
                <ThemedText style={[styles.loginButtonText, { color: accentPrimary }]}>Log In</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.signupButton, { backgroundColor: accentPrimary }]} 
                onPress={() => router.push('/signup')}
              >
                <ThemedText style={styles.signupButtonText}>Get Started Free</ThemedText>
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
                Join {userCount} Students Studying Smarter
              </ThemedText>
            </View>
            
            {/* Title */}
            <ThemedText style={[styles.heroTitleMobile, { color: textColor }]}>
              Stop Scribbling. Start Acing.
            </ThemedText>
            
            {/* Subtitle */}
            <ThemedText style={[styles.heroSubtitleMobile, { color: textSecondaryColor }]}>
              Turn lectures into flashcards with AI. Perfect for students who want to study smarter, not harder.
            </ThemedText>

            {/* CTA Buttons */}
            <View style={styles.heroButtonsMobile}>
              <TouchableOpacity 
                style={[styles.ctaButtonMobile, { backgroundColor: accentPrimary }]} 
                onPress={() => router.push('/signup')}
              >
                <ThemedText style={styles.ctaButtonText}>Start Free - No Credit Card</ThemedText>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.secondaryCtaMobile, { borderColor: accentPrimary }]} 
                onPress={() => {
                  const element = document.getElementById('features');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <ThemedText style={[styles.secondaryCtaText, { color: accentPrimary }]}>See How It Works</ThemedText>
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
                  Join {userCount} Students Studying Smarter
                </ThemedText>
              </View>
              
              <ThemedText style={[styles.heroTitle, { color: textColor }]}>
                Stop Scribbling.{'\n'}Start Acing.
              </ThemedText>
              
              <ThemedText style={[styles.heroSubtitle, { color: textSecondaryColor }]}>
                Turn lectures into flashcards with AI. Perfect for students who want to study smarter, not harder.
              </ThemedText>

              <View style={styles.heroButtons}>
                <TouchableOpacity 
                  style={[styles.ctaButton, { backgroundColor: accentPrimary }]} 
                  onPress={() => router.push('/signup')}
                >
                  <ThemedText style={styles.ctaButtonText}>Start Free - No Credit Card</ThemedText>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.secondaryCta, { borderColor: accentPrimary }]} 
                  onPress={() => {
                    const element = document.getElementById('features');
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <ThemedText style={[styles.secondaryCtaText, { color: accentPrimary }]}>See How It Works</ThemedText>
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
                        <ThemedText style={[styles.sectionTitleMobile, { color: textColor }]}>Recent Notes</ThemedText>
                        <View style={[styles.sortButton, { backgroundColor: backgroundSecondary }]}>
                          <ThemedText style={[styles.sortText, { color: textColor }]}>Newest First</ThemedText>
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
                        <ThemedText style={[styles.navText, { color: accentPrimary }]}>Notes</ThemedText>
                      </View>
                      <View style={styles.navItem}>
                        <Ionicons name="flash" size={20} color={textSecondaryColor} />
                        <ThemedText style={[styles.navText, { color: textSecondaryColor }]}>Cards</ThemedText>
                      </View>
                      <View style={styles.navItem}>
                        <Ionicons name="apps" size={20} color={textSecondaryColor} />
                        <ThemedText style={[styles.navText, { color: textSecondaryColor }]}>Quiz</ThemedText>
                      </View>
                      <View style={styles.navItem}>
                        <Ionicons name="settings" size={20} color={textSecondaryColor} />
                        <ThemedText style={[styles.navText, { color: textSecondaryColor }]}>Settings</ThemedText>
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
            From Lectures to A's in Minutes
          </ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>
            Everything you need to ace your exams
          </ThemedText>

          <View style={styles.featuresGrid}>
            <View style={[styles.featureCard, { backgroundColor }]}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(106, 90, 205, 0.1)' }]}>
                <Ionicons name="mic" size={32} color={accentPrimary} />
              </View>
              <ThemedText style={[styles.featureTitle, { color: textColor }]}>
                Record Lectures
              </ThemedText>
              <ThemedText style={[styles.featureDescription, { color: textSecondaryColor }]}>
                Never miss a word. Record lectures and get AI-powered transcriptions instantly.
              </ThemedText>
            </View>

            <View style={[styles.featureCard, { backgroundColor }]}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(106, 90, 205, 0.1)' }]}>
                <Ionicons name="layers" size={32} color={accentPrimary} />
              </View>
              <ThemedText style={[styles.featureTitle, { color: textColor }]}>
                Auto Flashcards
              </ThemedText>
              <ThemedText style={[styles.featureDescription, { color: textSecondaryColor }]}>
                AI generates flashcards from your notes automatically. Study mode included.
              </ThemedText>
            </View>

            <View style={[styles.featureCard, { backgroundColor }]}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(106, 90, 205, 0.1)' }]}>
                <Ionicons name="school" size={32} color={accentPrimary} />
              </View>
              <ThemedText style={[styles.featureTitle, { color: textColor }]}>
                Practice Quizzes
              </ThemedText>
              <ThemedText style={[styles.featureDescription, { color: textSecondaryColor }]}>
                Test your knowledge with AI-generated quizzes. Track your progress.
              </ThemedText>
            </View>

            <View style={[styles.featureCard, { backgroundColor }]}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(106, 90, 205, 0.1)' }]}>
                <Ionicons name="document-text" size={32} color={accentPrimary} />
              </View>
              <ThemedText style={[styles.featureTitle, { color: textColor }]}>
                Smart Summaries
              </ThemedText>
              <ThemedText style={[styles.featureDescription, { color: textSecondaryColor }]}>
                Get key points extracted automatically. Perfect for last-minute reviews.
              </ThemedText>
            </View>

            <View style={[styles.featureCard, { backgroundColor }]}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(106, 90, 205, 0.1)' }]}>
                <Ionicons name="cloud-upload" size={32} color={accentPrimary} />
              </View>
              <ThemedText style={[styles.featureTitle, { color: textColor }]}>
                PDF Upload
              </ThemedText>
              <ThemedText style={[styles.featureDescription, { color: textSecondaryColor }]}>
                Upload PDFs and extract text automatically. Works with textbooks and papers.
              </ThemedText>
            </View>

            <View style={[styles.featureCard, { backgroundColor }]}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(106, 90, 205, 0.1)' }]}>
                <Ionicons name="sync" size={32} color={accentPrimary} />
              </View>
              <ThemedText style={[styles.featureTitle, { color: textColor }]}>
                Sync Everywhere
              </ThemedText>
              <ThemedText style={[styles.featureDescription, { color: textSecondaryColor }]}>
                Access your notes on phone, tablet, or web. Real-time sync across devices.
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Social Proof / Testimonials Section */}
        <View style={styles.testimonialsSection}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            Loved by Students
          </ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>
            See what students are saying
          </ThemedText>

          <View style={styles.testimonialsGrid}>
            <View style={[styles.testimonialCard, { backgroundColor: backgroundSecondary }]}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons key={star} name="star" size={16} color="#FFD700" />
                ))}
              </View>
              <ThemedText style={[styles.testimonialText, { color: textColor }]}>
                "This app saved my GPA! Recording lectures and getting instant flashcards is a game changer."
              </ThemedText>
              <ThemedText style={[styles.testimonialAuthor, { color: textSecondaryColor }]}>
                - Sarah M., College Student
              </ThemedText>
            </View>

            <View style={[styles.testimonialCard, { backgroundColor: backgroundSecondary }]}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons key={star} name="star" size={16} color="#FFD700" />
                ))}
              </View>
              <ThemedText style={[styles.testimonialText, { color: textColor }]}>
                "I went from struggling to straight A's. The AI summaries help me review before exams."
              </ThemedText>
              <ThemedText style={[styles.testimonialAuthor, { color: textSecondaryColor }]}>
                - Marcus T., High School Senior
              </ThemedText>
            </View>

            <View style={[styles.testimonialCard, { backgroundColor: backgroundSecondary }]}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons key={star} name="star" size={16} color="#FFD700" />
                ))}
              </View>
              <ThemedText style={[styles.testimonialText, { color: textColor }]}>
                "Perfect for my study group! We share notes and quiz each other. Best study app ever."
              </ThemedText>
              <ThemedText style={[styles.testimonialAuthor, { color: textSecondaryColor }]}>
                - Jenny L., Pre-Med Student
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Pricing Section */}
        <View style={[styles.pricingSection, { backgroundColor: backgroundSecondary }]}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            Student-Friendly Pricing
          </ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>
            Start free, upgrade anytime
          </ThemedText>

          <View style={styles.pricingCards}>
            {/* Free Plan */}
            <View style={[styles.pricingCard, { backgroundColor }]}>
              <ThemedText style={[styles.planName, { color: textColor }]}>Free</ThemedText>
              <View style={styles.priceContainer}>
                <ThemedText style={[styles.price, { color: textColor }]}>$0</ThemedText>
                <ThemedText style={[styles.priceInterval, { color: textSecondaryColor }]}>/month</ThemedText>
              </View>
              <ThemedText style={[styles.planDescription, { color: textSecondaryColor }]}>
                Perfect for trying it out
              </ThemedText>
              <View style={styles.planFeatures}>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color={accentSuccess} />
                  <ThemedText style={[styles.planFeatureText, { color: textSecondaryColor }]}>
                    5 AI transcriptions/month
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color={accentSuccess} />
                  <ThemedText style={[styles.planFeatureText, { color: textSecondaryColor }]}>
                    30 min audio recording
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color={accentSuccess} />
                  <ThemedText style={[styles.planFeatureText, { color: textSecondaryColor }]}>
                    10 AI summaries/month
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color={accentSuccess} />
                  <ThemedText style={[styles.planFeatureText, { color: textSecondaryColor }]}>
                    20 flashcards/month
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color={accentSuccess} />
                  <ThemedText style={[styles.planFeatureText, { color: textSecondaryColor }]}>
                    5 PDF uploads/month
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.planButton, { borderColor: accentPrimary }]} 
                onPress={() => router.push('/signup')}
              >
                <ThemedText style={[styles.planButtonText, { color: accentPrimary }]}>
                  Get Started
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Premium Plan */}
            <View style={[styles.pricingCard, styles.popularCard, { backgroundColor: accentPrimary }]}>
              <View style={[styles.popularBadge, { backgroundColor: '#FFFFFF' }]}>
                <ThemedText style={[styles.popularBadgeText, { color: accentPrimary }]}>Most Popular</ThemedText>
              </View>
              <ThemedText style={[styles.planName, { color: '#FFFFFF' }]}>Premium</ThemedText>
              <View style={styles.priceContainer}>
                <ThemedText style={[styles.price, { color: '#FFFFFF' }]}>$9.99</ThemedText>
                <ThemedText style={[styles.priceInterval, { color: '#FFFFFF', opacity: 0.8 }]}>/month</ThemedText>
              </View>
              <ThemedText style={[styles.planDescription, { color: '#FFFFFF', opacity: 0.9 }]}>
                Everything unlimited
              </ThemedText>
              <View style={styles.planFeatures}>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <ThemedText style={[styles.planFeatureText, { color: '#FFFFFF' }]}>
                    Unlimited AI transcriptions
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <ThemedText style={[styles.planFeatureText, { color: '#FFFFFF' }]}>
                    Unlimited audio recording
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <ThemedText style={[styles.planFeatureText, { color: '#FFFFFF' }]}>
                    Unlimited AI summaries
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <ThemedText style={[styles.planFeatureText, { color: '#FFFFFF' }]}>
                    Unlimited flashcards
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <ThemedText style={[styles.planFeatureText, { color: '#FFFFFF' }]}>
                    Unlimited PDF uploads
                  </ThemedText>
                </View>
                <View style={styles.planFeature}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <ThemedText style={[styles.planFeatureText, { color: '#FFFFFF' }]}>
                    Priority AI processing
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.planButton, { backgroundColor: '#FFFFFF' }]} 
                onPress={() => router.push('/signup')}
              >
                <ThemedText style={[styles.planButtonText, { color: accentPrimary }]}>
                  Start 7-Day Free Trial
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Final CTA */}
        <View style={styles.finalCta}>
          <ThemedText style={[styles.finalCtaTitle, { color: textColor }]}>
            Ready to Study Smarter?
          </ThemedText>
          <ThemedText style={[styles.finalCtaSubtitle, { color: textSecondaryColor }]}>
            Join thousands of students already acing their exams with WizNote
          </ThemedText>
          <TouchableOpacity 
            style={[styles.ctaButton, { backgroundColor: accentPrimary }]} 
            onPress={() => router.push('/signup')}
          >
            <ThemedText style={styles.ctaButtonText}>Get Started Free</ThemedText>
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
                <ThemedText style={[styles.appBadgeLabel, { color: '#FFFFFF' }]}>GET IT ON</ThemedText>
                <ThemedText style={[styles.appBadgeStore, { color: '#FFFFFF' }]}>Google Play</ThemedText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.appBadge, { backgroundColor: '#888888', opacity: 0.6 }]}
              onPress={() => alert('iOS app coming soon! 🚀')}
            >
              <Ionicons name="logo-apple" size={24} color="#FFFFFF" />
              <View style={styles.appBadgeText}>
                <ThemedText style={[styles.appBadgeLabel, { color: '#FFFFFF' }]}>Coming Soon</ThemedText>
                <ThemedText style={[styles.appBadgeStore, { color: '#FFFFFF' }]}>App Store</ThemedText>
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
                AI-powered note-taking for students
              </ThemedText>
            </View>
            <View style={styles.footerSection}>
              <ThemedText style={[styles.footerTitle, { color: textColor }]}>Product</ThemedText>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <ThemedText style={[styles.footerLink, { color: textSecondaryColor }]}>Log In</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/signup')}>
                <ThemedText style={[styles.footerLink, { color: textSecondaryColor }]}>Sign Up</ThemedText>
              </TouchableOpacity>
            </View>
            <View style={styles.footerSection}>
              <ThemedText style={[styles.footerTitle, { color: textColor }]}>Legal</ThemedText>
              <TouchableOpacity onPress={() => router.push('/privacy')}>
                <ThemedText style={[styles.footerLink, { color: textSecondaryColor }]}>Privacy Policy</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/terms')}>
                <ThemedText style={[styles.footerLink, { color: textSecondaryColor }]}>Terms of Service</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          <ThemedText style={[styles.copyright, { color: textSecondaryColor }]}>
            © 2025 WizNote. All rights reserved.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        paddingVertical: 12,
        paddingHorizontal: 16,
      },
      '@media (max-width: 480px)': {
        paddingVertical: 10,
        paddingHorizontal: 12,
      },
    } : {}),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        flexDirection: 'column',
        gap: 16,
        alignItems: 'stretch',
      },
    } : {}),
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        alignSelf: 'center',
        gap: 8,
      },
    } : {}),
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 20,
      },
    } : {}),
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        width: '100%',
        flexDirection: 'column',
        gap: 8,
      },
    } : {}),
  },
  loginButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        paddingVertical: 12,
        flex: 1,
      },
    } : {}),
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  signupButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        paddingVertical: 12,
        flex: 1,
      },
    } : {}),
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Mobile-specific hero section
  heroSectionMobile: {
    flexDirection: 'column',
    paddingVertical: 40,
    paddingHorizontal: 16,
    width: '100%',
    gap: 24,
    alignItems: 'stretch',
  },
  heroTitleMobile: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 40,
    marginBottom: 16,
    textAlign: 'center',
  },
  heroSubtitleMobile: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  heroButtonsMobile: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'stretch',
  },
  ctaButtonMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
  },
  secondaryCtaMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    width: '100%',
  },
  appBadgesMobile: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'stretch',
    marginTop: 32,
  },
  trustIndicatorsMobile: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 32,
    alignItems: 'flex-start',
  },
  heroSection: {
    flexDirection: 'row',
    paddingVertical: 80,
    paddingHorizontal: 24,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
    gap: 60,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        flexDirection: 'column',
        paddingVertical: 40,
        paddingHorizontal: 16,
        gap: 40,
        alignItems: 'stretch',
      },
      '@media (max-width: 480px)': {
        paddingVertical: 32,
        paddingHorizontal: 12,
        gap: 32,
      },
    } : {}),
  },
  heroContent: {
    flex: 1,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        width: '100%',
      },
    } : {}),
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 56,
    fontWeight: 'bold',
    lineHeight: 64,
    marginBottom: 24,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 32,
        lineHeight: 40,
        marginBottom: 16,
      },
      '@media (max-width: 480px)': {
        fontSize: 28,
        lineHeight: 36,
      },
    } : {}),
  },
  heroSubtitle: {
    fontSize: 20,
    lineHeight: 30,
    marginBottom: 32,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 24,
      },
    } : {}),
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        flexDirection: 'column',
        gap: 12,
        marginBottom: 24,
      },
    } : {}),
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 14,
      },
    } : {}),
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 16,
      },
    } : {}),
  },
  secondaryCta: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        paddingVertical: 14,
      },
    } : {}),
  },
  secondaryCtaText: {
    fontSize: 18,
    fontWeight: '600',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 16,
      },
    } : {}),
  },
  appBadges: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
    flexWrap: 'wrap',
  },
  appBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 12,
    minWidth: 160,
  },
  appBadgeText: {
    flexDirection: 'column',
  },
  appBadgeLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  appBadgeStore: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  trustIndicators: {
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap',
    marginTop: 16,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustText: {
    fontSize: 14,
  },
  productHuntBadge: {
    marginTop: 24,
    alignItems: 'center',
  },
  heroImage: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 500,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        minHeight: 300,
        maxHeight: 400,
        width: '100%',
        flex: 'none',
      },
      '@media (max-width: 480px)': {
        minHeight: 250,
        maxHeight: 350,
      },
    } : {}),
  },
  heroImageText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  phoneMockup: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneFrame: {
    width: 280,
    height: 560,
    borderRadius: 40,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 15,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        width: 220,
        height: 440,
        borderRadius: 30,
      },
      '@media (max-width: 480px)': {
        width: 180,
        height: 360,
        borderRadius: 24,
      },
    } : {}),
  },
  phoneScreen: {
    flex: 1,
    borderRadius: 28,
    padding: 16,
    justifyContent: 'space-between',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statusTime: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusIcons: {
    flexDirection: 'row',
    gap: 6,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesSection: {
    flex: 1,
    paddingVertical: 12,
    minHeight: 200,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        minHeight: 300,
      },
      '@media (max-width: 480px)': {
        minHeight: 400,
      },
    } : {}),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleMobile: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  sortText: {
    fontSize: 14,
  },
  noteCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        padding: 20,
        minHeight: 180,
      },
      '@media (max-width: 480px)': {
        padding: 24,
        minHeight: 220,
      },
    } : {}),
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  noteTime: {
    fontSize: 14,
  },
  noteTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    marginBottom: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  notePreview: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 15,
        lineHeight: 22,
      },
      '@media (max-width: 480px)': {
        fontSize: 16,
        lineHeight: 24,
      },
    } : {}),
  },
  noteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderRadius: 16,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 12,
    fontWeight: '500',
  },
  featuresSection: {
    paddingVertical: 80,
    paddingHorizontal: 24,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        paddingVertical: 40,
        paddingHorizontal: 16,
      },
      '@media (max-width: 480px)': {
        paddingVertical: 32,
        paddingHorizontal: 12,
      },
    } : {}),
  },
  sectionTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 28,
        marginBottom: 12,
      },
      '@media (max-width: 480px)': {
        fontSize: 24,
      },
    } : {}),
  },
  sectionSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 60,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 16,
        marginBottom: 32,
      },
      '@media (max-width: 480px)': {
        fontSize: 14,
        marginBottom: 24,
      },
    } : {}),
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        gap: 16,
        flexDirection: 'column',
      },
    } : {}),
  },
  featureCard: {
    width: 350,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        width: '100%',
        padding: 24,
      },
      '@media (max-width: 480px)': {
        padding: 20,
      },
    } : {}),
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  featureDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  testimonialsSection: {
    paddingVertical: 80,
    paddingHorizontal: 24,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        paddingVertical: 40,
        paddingHorizontal: 16,
      },
      '@media (max-width: 480px)': {
        paddingVertical: 32,
        paddingHorizontal: 12,
      },
    } : {}),
  },
  testimonialsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        gap: 16,
        flexDirection: 'column',
      },
    } : {}),
  },
  testimonialCard: {
    width: 350,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        width: '100%',
        padding: 24,
      },
      '@media (max-width: 480px)': {
        padding: 20,
      },
    } : {}),
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
  testimonialText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  testimonialAuthor: {
    fontSize: 14,
    fontWeight: '600',
  },
  pricingSection: {
    paddingVertical: 80,
    paddingHorizontal: 24,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        paddingVertical: 40,
        paddingHorizontal: 16,
      },
      '@media (max-width: 480px)': {
        paddingVertical: 32,
        paddingHorizontal: 12,
      },
    } : {}),
  },
  pricingCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
    maxWidth: 900,
    marginHorizontal: 'auto',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        flexDirection: 'column',
        gap: 24,
      },
    } : {}),
  },
  pricingCard: {
    width: 350,
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        width: '100%',
        padding: 32,
      },
      '@media (max-width: 480px)': {
        padding: 24,
      },
    } : {}),
  },
  popularCard: {
    borderWidth: 3,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  priceInterval: {
    fontSize: 18,
    marginLeft: 4,
  },
  planDescription: {
    fontSize: 16,
    marginBottom: 24,
  },
  planFeatures: {
    gap: 12,
    marginBottom: 32,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planFeatureText: {
    fontSize: 16,
  },
  planButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  finalCta: {
    paddingVertical: 80,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        paddingVertical: 40,
        paddingHorizontal: 16,
      },
      '@media (max-width: 480px)': {
        paddingVertical: 32,
        paddingHorizontal: 12,
      },
    } : {}),
  },
  finalCtaTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 28,
        marginBottom: 12,
      },
      '@media (max-width: 480px)': {
        fontSize: 24,
      },
    } : {}),
  },
  finalCtaSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 16,
        marginBottom: 24,
      },
    } : {}),
  },
  footer: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        paddingVertical: 40,
        paddingHorizontal: 16,
      },
      '@media (max-width: 480px)': {
        paddingVertical: 32,
        paddingHorizontal: 12,
      },
    } : {}),
  },
  footerContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 60,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    marginBottom: 40,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        flexDirection: 'column',
        gap: 32,
        marginBottom: 32,
      },
    } : {}),
  },
  footerSection: {
    flex: 1,
    minWidth: 200,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        minWidth: 'auto',
      },
    } : {}),
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footerLink: {
    fontSize: 14,
    marginBottom: 8,
  },
  copyright: {
    fontSize: 14,
    textAlign: 'center',
  },
});


