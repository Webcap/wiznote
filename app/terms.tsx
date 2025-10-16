import { Ionicons } from '@expo/vector-icons';
import { Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useThemeColor } from '../hooks/useThemeColor';
import { PrivacyPolicyStyles as styles } from '../styles/PrivacyPolicyStyles';
import { useRouter } from 'expo-router';

// Import web components
import { UserSidebar } from '../components/web/UserSidebar';
import { WebLayout } from '../components/web/WebLayout';
import { useAuth } from '../hooks/useAuth';

export default function TermsOfServiceScreen() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const backgroundTertiary = useThemeColor({}, 'backgroundTertiary');

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <WebLayout
        title="Terms of Service"
        subtitle="Terms and conditions of use"
        sidebar={isAuthenticated ? <UserSidebar activePage="terms" /> : null}
        header={
          <View style={styles.webHeader}>
            <View style={styles.webHeaderSpacer} />
            <View style={styles.webHeaderCenter}>
              <ThemedText style={styles.webHeaderTitle}>Terms of Service</ThemedText>
              <ThemedText style={styles.webHeaderSubtitle}>Last updated: October 2025</ThemedText>
            </View>
            <View style={styles.webHeaderSpacer} />
          </View>
        }
      >
        <ScrollView style={styles.webContent} contentContainerStyle={styles.webContentContainer}>
          <ThemedView style={styles.webMainContent}>
            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Acceptance of Terms
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              Welcome to WizNote. By accessing or using our note-taking application and services, 
              you agree to be bound by these Terms of Service ("Terms"). If you do not agree to 
              these Terms, please do not use our application. We reserve the right to modify these 
              Terms at any time, and your continued use of the application constitutes acceptance 
              of any changes.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Description of Service
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              WizNote is a note-taking application that provides:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Text and audio note creation and management
              • AI-powered transcription services for audio recordings
              • Automated generation of summaries, key details, quizzes, and flashcards
              • Cloud storage and synchronization across devices
              • Note sharing and collaboration features
              • Premium subscription features with enhanced capabilities
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              We reserve the right to modify, suspend, or discontinue any aspect of the service 
              at any time, with or without notice.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Account Registration and Security
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              To use WizNote, you must create an account. You agree to:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Provide accurate, current, and complete information during registration
              • Maintain and promptly update your account information
              • Keep your password secure and confidential
              • Accept responsibility for all activities that occur under your account
              • Notify us immediately of any unauthorized use of your account
              • Be at least 13 years of age (or the minimum age required in your jurisdiction)
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              You are solely responsible for maintaining the confidentiality of your account 
              credentials. We are not liable for any loss or damage arising from your failure 
              to protect your account information.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              User Content and Ownership
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              You retain all ownership rights to the content you create, upload, or store in 
              WizNote ("User Content"). By using our service, you grant us a limited license to:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Store, process, and display your User Content
              • Process your content through AI services to provide features (transcription, summaries, etc.)
              • Back up and secure your content on our servers
              • Enable sharing features when you choose to share content with others
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              This license exists solely to operate and improve our service and terminates when 
              you delete your content or account. We do not claim ownership of your User Content.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Acceptable Use Policy
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              You agree not to use WizNote to:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Violate any applicable laws or regulations
              • Infringe on intellectual property rights of others
              • Upload malicious code, viruses, or harmful software
              • Harass, abuse, or harm other users
              • Attempt to gain unauthorized access to our systems
              • Use automated systems to access the service without permission
              • Reverse engineer or attempt to extract source code
              • Resell or redistribute our service without authorization
              • Store or share illegal, harmful, or offensive content
              • Circumvent usage limits or premium features
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              Violation of this policy may result in immediate termination of your account and 
              potential legal action.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Subscription and Billing
            </ThemedText>
            
            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              Free and Premium Tiers
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              WizNote offers both free and premium subscription tiers:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Free Tier: Limited access to AI features and recording time
              • Premium Tier: Unlimited access to all features and capabilities
            </ThemedText>

            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              Payment Terms
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Premium subscriptions are billed on a recurring basis (monthly or annually)
              • All fees are non-refundable except as required by law
              • You authorize us to charge your payment method for all fees incurred
              • Prices may change with 30 days' notice to active subscribers
              • Failed payments may result in service suspension or termination
              • You can cancel your subscription at any time through the app
            </ThemedText>

            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              Cancellation and Refunds
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • You may cancel your premium subscription at any time
              • Upon cancellation, you retain access until the end of the current billing period
              • No refunds are provided for partial billing periods
              • After cancellation, your account reverts to the free tier
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              AI Services and Accuracy
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              Our AI-powered features, including transcription, summaries, quizzes, and flashcards, 
              are provided "as is" without guarantees of accuracy or completeness. You acknowledge that:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • AI-generated content may contain errors or inaccuracies
              • Transcriptions may not perfectly capture all audio content
              • You should review and verify all AI-generated content
              • We are not liable for decisions made based on AI-generated content
              • AI services may be temporarily unavailable due to technical issues
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Usage Limits and Fair Use
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              Free tier users are subject to usage limits on:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Audio recording time
              • AI feature usage (summaries, quizzes, flashcards)
              • Storage capacity
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              We reserve the right to enforce fair use policies and may restrict or suspend 
              accounts that engage in excessive or abusive usage patterns, even for premium users.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Data Privacy and Security
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              Your privacy is important to us. Our data collection and usage practices are 
              detailed in our Privacy Policy. By using WizNote, you also agree to our Privacy 
              Policy. We implement industry-standard security measures, but cannot guarantee 
              absolute security. You are responsible for maintaining backups of critical content.
            </ThemedText>

            <TouchableOpacity
              onPress={() => router.push('/privacy')}
              style={styles.deletionButton}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color={accentPrimary} />
              <ThemedText style={[styles.deletionButtonText, { color: accentPrimary }]}>
                View Privacy Policy
              </ThemedText>
              <Ionicons name="chevron-forward" size={20} color={accentPrimary} />
            </TouchableOpacity>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Intellectual Property Rights
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              WizNote and its original content, features, and functionality are owned by us and 
              are protected by international copyright, trademark, and other intellectual property laws. 
              You may not:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Copy, modify, or create derivative works of our software
              • Use our trademarks or branding without permission
              • Remove or alter any copyright notices
              • Claim ownership of any portion of our service
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Third-Party Services
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              WizNote integrates with third-party services including:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Supabase (cloud storage and authentication)
              • Stripe (payment processing)
              • Google Gemini (AI processing)
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              Your use of these services through WizNote is subject to their respective terms and 
              conditions. We are not responsible for the availability, accuracy, or functionality 
              of third-party services.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Disclaimers and Limitation of Liability
            </ThemedText>
            
            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              Service Availability
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              WizNote is provided "as is" and "as available" without warranties of any kind. We do 
              not guarantee uninterrupted, secure, or error-free service. We may experience downtime 
              for maintenance, updates, or unforeseen technical issues.
            </ThemedText>

            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              Limitation of Liability
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              To the maximum extent permitted by law, WizNote and its affiliates shall not be liable for:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Loss of data, profits, or business opportunities
              • Indirect, incidental, or consequential damages
              • Damages resulting from unauthorized access to your account
              • Errors or inaccuracies in AI-generated content
              • Service interruptions or data breaches
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              Our total liability shall not exceed the amount you paid us in the 12 months 
              preceding the claim, or $100, whichever is greater.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Indemnification
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              You agree to indemnify and hold harmless WizNote, its affiliates, and their respective 
              officers, directors, and employees from any claims, damages, losses, or expenses 
              (including legal fees) arising from:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Your use of the service
              • Your violation of these Terms
              • Your violation of any third-party rights
              • Your User Content
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Termination
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              We reserve the right to suspend or terminate your account at any time for:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Violation of these Terms or our policies
              • Fraudulent, abusive, or illegal activity
              • Extended periods of inactivity
              • Non-payment of fees
              • Any reason at our sole discretion
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              Upon termination, your right to access and use WizNote immediately ceases. We may 
              delete your account and User Content, though we will attempt to provide reasonable 
              notice when possible. You may also terminate your account at any time through the 
              app settings.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Dispute Resolution
            </ThemedText>
            
            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              Informal Resolution
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              If you have any concerns or disputes, please contact us first at support@wiznote.app. 
              We will attempt to resolve the issue informally.
            </ThemedText>

            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              Governing Law
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              These Terms shall be governed by and construed in accordance with the laws of the 
              jurisdiction in which WizNote is registered, without regard to conflict of law provisions.
            </ThemedText>

            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              Arbitration
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              Any disputes arising from these Terms or your use of WizNote shall be resolved through 
              binding arbitration, except where prohibited by law. You waive your right to participate 
              in class action lawsuits.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Changes to Terms
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              We reserve the right to modify these Terms at any time. We will notify users of 
              material changes via email or in-app notification. Your continued use of WizNote 
              after changes take effect constitutes acceptance of the revised Terms. If you do 
              not agree to the new Terms, you must stop using the service.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Severability
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              If any provision of these Terms is found to be unenforceable or invalid, that 
              provision shall be limited or eliminated to the minimum extent necessary, and the 
              remaining provisions shall remain in full force and effect.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Entire Agreement
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              These Terms, together with our Privacy Policy, constitute the entire agreement 
              between you and WizNote regarding the use of our service and supersede any prior 
              agreements or understandings.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Contact Information
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              If you have any questions about these Terms of Service, please contact us:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Email: legal@wiznote.app
              • Support Email: support@wiznote.app
              • Through our in-app support system
            </ThemedText>

            <View style={styles.webFooter}>
              <ThemedText style={[styles.webFooterText, { color: textSecondaryColor }]}>
                These Terms of Service are effective as of January 2025 and will remain in effect 
                except with respect to any changes in its provisions in the future, which will be 
                in effect immediately after being posted on this page.
              </ThemedText>
            </View>
          </ThemedView>
        </ScrollView>
      </WebLayout>
    );
  }

  // Mobile layout
  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.mobileContent}>
        {/* Header */}
        <View style={styles.mobileHeader}>
          <View style={styles.mobileHeaderSpacer} />
          <ThemedText style={[styles.mobileHeaderTitle, { color: textColor }]}>
            Terms of Service
          </ThemedText>
          <View style={styles.mobileHeaderSpacer} />
        </View>

        <ThemedText style={[styles.mobileLastUpdated, { color: textSecondaryColor }]}>
          Last updated: January 2025
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Acceptance of Terms
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          Welcome to WizNote. By accessing or using our note-taking application and services, 
          you agree to be bound by these Terms of Service ("Terms"). If you do not agree to 
          these Terms, please do not use our application. We reserve the right to modify these 
          Terms at any time, and your continued use of the application constitutes acceptance 
          of any changes.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Description of Service
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          WizNote is a note-taking application that provides:{'\n'}
          • Text and audio note creation and management{'\n'}
          • AI-powered transcription services for audio recordings{'\n'}
          • Automated generation of summaries, key details, quizzes, and flashcards{'\n'}
          • Cloud storage and synchronization across devices{'\n'}
          • Note sharing and collaboration features{'\n'}
          • Premium subscription features with enhanced capabilities{'\n'}
          {'\n'}
          We reserve the right to modify, suspend, or discontinue any aspect of the service 
          at any time, with or without notice.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Account Registration and Security
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          To use WizNote, you must create an account. You agree to:{'\n'}
          • Provide accurate, current, and complete information during registration{'\n'}
          • Maintain and promptly update your account information{'\n'}
          • Keep your password secure and confidential{'\n'}
          • Accept responsibility for all activities that occur under your account{'\n'}
          • Notify us immediately of any unauthorized use of your account{'\n'}
          • Be at least 13 years of age (or the minimum age required in your jurisdiction){'\n'}
          {'\n'}
          You are solely responsible for maintaining the confidentiality of your account 
          credentials. We are not liable for any loss or damage arising from your failure 
          to protect your account information.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          User Content and Ownership
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          You retain all ownership rights to the content you create, upload, or store in 
          WizNote ("User Content"). By using our service, you grant us a limited license to:{'\n'}
          • Store, process, and display your User Content{'\n'}
          • Process your content through AI services to provide features (transcription, summaries, etc.){'\n'}
          • Back up and secure your content on our servers{'\n'}
          • Enable sharing features when you choose to share content with others{'\n'}
          {'\n'}
          This license exists solely to operate and improve our service and terminates when 
          you delete your content or account. We do not claim ownership of your User Content.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Acceptable Use Policy
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          You agree not to use WizNote to:{'\n'}
          • Violate any applicable laws or regulations{'\n'}
          • Infringe on intellectual property rights of others{'\n'}
          • Upload malicious code, viruses, or harmful software{'\n'}
          • Harass, abuse, or harm other users{'\n'}
          • Attempt to gain unauthorized access to our systems{'\n'}
          • Use automated systems to access the service without permission{'\n'}
          • Reverse engineer or attempt to extract source code{'\n'}
          • Resell or redistribute our service without authorization{'\n'}
          • Store or share illegal, harmful, or offensive content{'\n'}
          • Circumvent usage limits or premium features{'\n'}
          {'\n'}
          Violation of this policy may result in immediate termination of your account and 
          potential legal action.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Subscription and Billing
        </ThemedText>
        
        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          Free and Premium Tiers
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          WizNote offers both free and premium subscription tiers:{'\n'}
          • Free Tier: Limited access to AI features and recording time{'\n'}
          • Premium Tier: Unlimited access to all features and capabilities
        </ThemedText>

        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          Payment Terms
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          • Premium subscriptions are billed on a recurring basis (monthly or annually){'\n'}
          • All fees are non-refundable except as required by law{'\n'}
          • You authorize us to charge your payment method for all fees incurred{'\n'}
          • Prices may change with 30 days' notice to active subscribers{'\n'}
          • Failed payments may result in service suspension or termination{'\n'}
          • You can cancel your subscription at any time through the app
        </ThemedText>

        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          Cancellation and Refunds
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          • You may cancel your premium subscription at any time{'\n'}
          • Upon cancellation, you retain access until the end of the current billing period{'\n'}
          • No refunds are provided for partial billing periods{'\n'}
          • After cancellation, your account reverts to the free tier
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          AI Services and Accuracy
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          Our AI-powered features, including transcription, summaries, quizzes, and flashcards, 
          are provided "as is" without guarantees of accuracy or completeness. You acknowledge that:{'\n'}
          • AI-generated content may contain errors or inaccuracies{'\n'}
          • Transcriptions may not perfectly capture all audio content{'\n'}
          • You should review and verify all AI-generated content{'\n'}
          • We are not liable for decisions made based on AI-generated content{'\n'}
          • AI services may be temporarily unavailable due to technical issues
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Usage Limits and Fair Use
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          Free tier users are subject to usage limits on:{'\n'}
          • Audio recording time{'\n'}
          • AI feature usage (summaries, quizzes, flashcards){'\n'}
          • Storage capacity{'\n'}
          {'\n'}
          We reserve the right to enforce fair use policies and may restrict or suspend 
          accounts that engage in excessive or abusive usage patterns, even for premium users.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Data Privacy and Security
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          Your privacy is important to us. Our data collection and usage practices are 
          detailed in our Privacy Policy. By using WizNote, you also agree to our Privacy 
          Policy. We implement industry-standard security measures, but cannot guarantee 
          absolute security. You are responsible for maintaining backups of critical content.
        </ThemedText>

        <TouchableOpacity
          onPress={() => router.push('/privacy')}
          style={styles.deletionButton}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={accentPrimary} />
          <ThemedText style={[styles.deletionButtonText, { color: accentPrimary }]}>
            View Privacy Policy
          </ThemedText>
          <Ionicons name="chevron-forward" size={20} color={accentPrimary} />
        </TouchableOpacity>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Intellectual Property Rights
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          WizNote and its original content, features, and functionality are owned by us and 
          are protected by international copyright, trademark, and other intellectual property laws. 
          You may not:{'\n'}
          • Copy, modify, or create derivative works of our software{'\n'}
          • Use our trademarks or branding without permission{'\n'}
          • Remove or alter any copyright notices{'\n'}
          • Claim ownership of any portion of our service
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Third-Party Services
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          WizNote integrates with third-party services including:{'\n'}
          • Supabase (cloud storage and authentication){'\n'}
          • Stripe (payment processing){'\n'}
          • Google Gemini (AI processing){'\n'}
          {'\n'}
          Your use of these services through WizNote is subject to their respective terms and 
          conditions. We are not responsible for the availability, accuracy, or functionality 
          of third-party services.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Disclaimers and Limitation of Liability
        </ThemedText>
        
        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          Service Availability
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          WizNote is provided "as is" and "as available" without warranties of any kind. We do 
          not guarantee uninterrupted, secure, or error-free service. We may experience downtime 
          for maintenance, updates, or unforeseen technical issues.
        </ThemedText>

        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          Limitation of Liability
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          To the maximum extent permitted by law, WizNote and its affiliates shall not be liable for:{'\n'}
          • Loss of data, profits, or business opportunities{'\n'}
          • Indirect, incidental, or consequential damages{'\n'}
          • Damages resulting from unauthorized access to your account{'\n'}
          • Errors or inaccuracies in AI-generated content{'\n'}
          • Service interruptions or data breaches{'\n'}
          {'\n'}
          Our total liability shall not exceed the amount you paid us in the 12 months 
          preceding the claim, or $100, whichever is greater.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Indemnification
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          You agree to indemnify and hold harmless WizNote, its affiliates, and their respective 
          officers, directors, and employees from any claims, damages, losses, or expenses 
          (including legal fees) arising from:{'\n'}
          • Your use of the service{'\n'}
          • Your violation of these Terms{'\n'}
          • Your violation of any third-party rights{'\n'}
          • Your User Content
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Termination
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          We reserve the right to suspend or terminate your account at any time for:{'\n'}
          • Violation of these Terms or our policies{'\n'}
          • Fraudulent, abusive, or illegal activity{'\n'}
          • Extended periods of inactivity{'\n'}
          • Non-payment of fees{'\n'}
          • Any reason at our sole discretion{'\n'}
          {'\n'}
          Upon termination, your right to access and use WizNote immediately ceases. We may 
          delete your account and User Content, though we will attempt to provide reasonable 
          notice when possible. You may also terminate your account at any time through the 
          app settings.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Dispute Resolution
        </ThemedText>
        
        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          Informal Resolution
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          If you have any concerns or disputes, please contact us first at support@wiznote.app. 
          We will attempt to resolve the issue informally.
        </ThemedText>

        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          Governing Law
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          These Terms shall be governed by and construed in accordance with the laws of the 
          jurisdiction in which WizNote is registered, without regard to conflict of law provisions.
        </ThemedText>

        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          Arbitration
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          Any disputes arising from these Terms or your use of WizNote shall be resolved through 
          binding arbitration, except where prohibited by law. You waive your right to participate 
          in class action lawsuits.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Changes to Terms
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          We reserve the right to modify these Terms at any time. We will notify users of 
          material changes via email or in-app notification. Your continued use of WizNote 
          after changes take effect constitutes acceptance of the revised Terms. If you do 
          not agree to the new Terms, you must stop using the service.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Severability
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          If any provision of these Terms is found to be unenforceable or invalid, that 
          provision shall be limited or eliminated to the minimum extent necessary, and the 
          remaining provisions shall remain in full force and effect.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Entire Agreement
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          These Terms, together with our Privacy Policy, constitute the entire agreement 
          between you and WizNote regarding the use of our service and supersede any prior 
          agreements or understandings.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Contact Information
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          If you have any questions about these Terms of Service, please contact us:{'\n'}
          • Email: legal@wiznote.app{'\n'}
          • Support Email: support@wiznote.app{'\n'}
          • Through our in-app support system
        </ThemedText>

        <View style={styles.mobileFooter}>
          <ThemedText style={[styles.mobileFooterText, { color: textSecondaryColor }]}>
            These Terms of Service are effective as of October 2025 and will remain in effect 
            except with respect to any changes in its provisions in the future, which will be 
            in effect immediately after being posted on this page.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

