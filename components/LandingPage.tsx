import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '../hooks/useThemeColor';

export default function LandingPage() {
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const accentSuccess = useThemeColor({}, 'accentSuccess');
  
  const [userCount] = useState('1,000+');

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
              <Ionicons name="book" size={32} color={accentPrimary} />
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
                onPress={() => router.push('/(auth)/signup')}
              >
                <ThemedText style={styles.signupButtonText}>Get Started Free</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <View style={[styles.badge, { backgroundColor: 'rgba(106, 90, 205, 0.1)' }]}>
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
                onPress={() => router.push('/(auth)/signup')}
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

            {/* Trust Indicators */}
            <View style={styles.trustIndicators}>
              <View style={styles.trustItem}>
                <Ionicons name="checkmark-circle" size={20} color={accentSuccess} />
                <ThemedText style={[styles.trustText, { color: textSecondaryColor }]}>
                  7-day free trial
                </ThemedText>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="checkmark-circle" size={20} color={accentSuccess} />
                <ThemedText style={[styles.trustText, { color: textSecondaryColor }]}>
                  No credit card required
                </ThemedText>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="checkmark-circle" size={20} color={accentSuccess} />
                <ThemedText style={[styles.trustText, { color: textSecondaryColor }]}>
                  Works on all devices
                </ThemedText>
              </View>
            </View>

            {/* Product Hunt Badge */}
            <View style={styles.productHuntBadge}>
              <a href="https://www.producthunt.com/products/wiznote-2?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-wiznote&#0045;2" target="_blank">
                <img 
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1030513&theme=light&t=1761333974901" 
                  alt="WizNote - Record&#0044;&#0032;transcribe&#0044;&#0032;study&#0032;smarter&#0032;with&#0032;AI&#0045;powered&#0032;notes | Product Hunt" 
                  style={{width: '250px', height: '54px'}} 
                  width="250" 
                  height="54" 
                />
              </a>
            </View>
          </View>

          {/* Hero Image/Demo Placeholder */}
          <View style={styles.heroImage}>
            <View style={styles.phoneMockup}>
              <View style={[styles.phoneFrame, { backgroundColor: '#000000' }]}>
                <View style={[styles.phoneScreen, { backgroundColor: '#1A1A1A' }]}>
                  {/* Status Bar */}
                  <View style={styles.statusBar}>
                    <ThemedText style={[styles.statusTime, { color: '#FFFFFF' }]}>10:21</ThemedText>
                    <View style={styles.statusIcons}>
                      <Ionicons name="cellular" size={16} color="#FFFFFF" />
                      <Ionicons name="wifi" size={16} color="#FFFFFF" />
                      <Ionicons name="battery-full" size={16} color="#FFFFFF" />
                    </View>
                  </View>
                  
                  {/* App Header */}
                  <View style={styles.appHeader}>
                    <View style={styles.logoSection}>
                      <View style={[styles.appLogo, { backgroundColor: accentPrimary }]}>
                        <Ionicons name="document-text" size={20} color="#FFFFFF" />
                      </View>
                      <ThemedText style={[styles.appName, { color: '#FFFFFF' }]}>WizNote</ThemedText>
                    </View>
                    <View style={[styles.createButton, { backgroundColor: accentPrimary }]}>
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                    </View>
                  </View>
                  
                  {/* Recent Notes Section */}
                  <View style={styles.notesSection}>
                    <View style={styles.sectionHeader}>
                      <ThemedText style={[styles.sectionTitleMobile, { color: '#FFFFFF' }]}>Recent Notes</ThemedText>
                      <View style={[styles.sortButton, { backgroundColor: '#333333' }]}>
                        <Ionicons name="chevron-down" size={14} color="#FFFFFF" />
                        <ThemedText style={[styles.sortText, { color: '#FFFFFF' }]}>Newest First</ThemedText>
                      </View>
                    </View>
                    
                    {/* Note Card */}
                    <View style={[styles.noteCard, { backgroundColor: '#2A2A2A' }]}>
                      <View style={styles.noteHeader}>
                        <ThemedText style={[styles.noteTitle, { color: '#FFFFFF' }]}>CompTIA A+</ThemedText>
                        <ThemedText style={[styles.noteTime, { color: '#888888' }]}>Just now</ThemedText>
                      </View>
                      <View style={[styles.noteTag, { backgroundColor: '#4CAF50' }]}>
                        <Ionicons name="document-text" size={12} color="#FFFFFF" />
                        <ThemedText style={[styles.tagText, { color: '#FFFFFF' }]}>Text</ThemedText>
                      </View>
                      <ThemedText style={[styles.notePreview, { color: '#CCCCCC' }]} numberOfLines={3}>
                        Perfect 👍 You want Module 1 Notes for CompTIA A+ (Core 1 - 220-1101). Here's a clean, condensed note-style breakdown...
                      </ThemedText>
                      <View style={styles.noteActions}>
                        <View style={[styles.actionButton, { backgroundColor: '#333333' }]}>
                          <Ionicons name="pin" size={16} color="#FFFFFF" />
                        </View>
                        <View style={[styles.actionButton, { backgroundColor: '#333333' }]}>
                          <Ionicons name="download" size={16} color="#FFFFFF" />
                        </View>
                        <View style={[styles.actionButton, { backgroundColor: '#333333' }]}>
                          <Ionicons name="trash" size={16} color="#FF6B6B" />
                        </View>
                      </View>
                    </View>
                  </View>
                  
                  {/* Bottom Navigation */}
                  <View style={[styles.bottomNav, { backgroundColor: '#FFFFFF' }]}>
                    <View style={styles.navItem}>
                      <Ionicons name="home" size={20} color={accentPrimary} />
                      <ThemedText style={[styles.navText, { color: accentPrimary }]}>Home</ThemedText>
                    </View>
                    <View style={styles.navItem}>
                      <Ionicons name="people" size={20} color="#888888" />
                      <ThemedText style={[styles.navText, { color: '#888888' }]}>Shared</ThemedText>
                    </View>
                    <View style={styles.navItem}>
                      <Ionicons name="search" size={20} color="#888888" />
                      <ThemedText style={[styles.navText, { color: '#888888' }]}>Search</ThemedText>
                    </View>
                    <View style={styles.navItem}>
                      <Ionicons name="settings" size={20} color="#888888" />
                      <ThemedText style={[styles.navText, { color: '#888888' }]}>Settings</ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            </View>
            <ThemedText style={[styles.heroImageText, { color: textSecondaryColor }]}>
              WizNote Mobile App
            </ThemedText>
          </View>
        </View>

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
                onPress={() => router.push('/(auth)/signup')}
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
                onPress={() => router.push('/(auth)/signup')}
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
            onPress={() => router.push('/(auth)/signup')}
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
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
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
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  loginButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  signupButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
  },
  heroContent: {
    flex: 1,
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
  },
  heroSubtitle: {
    fontSize: 20,
    lineHeight: 30,
    marginBottom: 32,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryCta: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
  },
  secondaryCtaText: {
    fontSize: 18,
    fontWeight: '600',
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
  },
  sectionTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 60,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    justifyContent: 'center',
  },
  featureCard: {
    width: 350,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
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
  },
  testimonialsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    justifyContent: 'center',
  },
  testimonialCard: {
    width: 350,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
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
  },
  pricingCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
    maxWidth: 900,
    marginHorizontal: 'auto',
    justifyContent: 'center',
  },
  pricingCard: {
    width: 350,
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    position: 'relative',
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
  },
  finalCtaTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  finalCtaSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
  },
  footer: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  footerContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 60,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    marginBottom: 40,
  },
  footerSection: {
    flex: 1,
    minWidth: 200,
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


