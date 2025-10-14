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

export default function PrivacyPolicyScreen() {
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
        title="Privacy Policy"
        subtitle="How we protect your data"
        sidebar={isAuthenticated ? <UserSidebar activePage="privacy" /> : null}
        header={
          <View style={styles.webHeader}>
            <View style={styles.webHeaderSpacer} />
            <View style={styles.webHeaderCenter}>
              <ThemedText style={styles.webHeaderTitle}>Privacy Policy</ThemedText>
              <ThemedText style={styles.webHeaderSubtitle}>Last updated: October 2025</ThemedText>
            </View>
            <View style={styles.webHeaderSpacer} />
          </View>
        }
      >
        <ScrollView style={styles.webContent} contentContainerStyle={styles.webContentContainer}>
          <ThemedView style={styles.webMainContent}>
            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Introduction
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              Welcome to WizNote ("we," "our," or "us"). This Privacy Policy explains how we collect, 
              use, disclose, and safeguard your information when you use our note-taking application 
              and related services. Please read this privacy policy carefully. If you do not agree 
              with the terms of this privacy policy, please do not access the application.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Information We Collect
            </ThemedText>
            
            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              Personal Information
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Account Information: Email address, display name, and authentication credentials
              • Profile Data: User preferences, theme settings, and notification preferences
              • Subscription Information: Premium status, billing details, and payment information
            </ThemedText>

            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              Content Data
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Notes: Text content, titles, tags, and metadata you create
              • Audio Recordings: Voice recordings and their transcriptions
              • AI-Generated Content: Summaries, key details, quizzes, and flashcards created by our AI services
              • Shared Content: Notes you choose to share with other users
            </ThemedText>

            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              Usage Data
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Feature Usage: How you interact with our AI features, recording limits, and premium features
              • Device Information: Device type, operating system, and app version
              • Analytics Data: App performance, crash reports, and user behavior patterns
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              How We Use Your Information
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              We use the information we collect to:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Provide and maintain our note-taking services
              • Process audio recordings and generate transcriptions
              • Create AI-powered summaries, key details, quizzes, and flashcards
              • Manage your account and subscription
              • Enforce usage limits and feature restrictions
              • Improve our services and develop new features
              • Provide customer support
              • Ensure security and prevent fraud
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              AI and Machine Learning
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              Our application uses artificial intelligence and machine learning services to:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Transcribe audio recordings into text
              • Generate summaries of your notes and audio content
              • Extract key details and important points
              • Create quizzes and flashcards from your content
              • Provide intelligent content suggestions
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              Your content may be processed by third-party AI services (such as Google Gemini) 
              to provide these features. We ensure that any data sent to these services is 
              handled according to their privacy policies and our data protection standards.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Data Storage and Security
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Your data is stored securely using industry-standard encryption
              • We use Supabase for secure cloud storage and authentication
              • Audio files and transcriptions are encrypted both in transit and at rest
              • We implement access controls and monitoring to protect your information
              • Regular security audits and updates are performed
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Data Sharing and Disclosure
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              We do not sell, trade, or rent your personal information to third parties. We may share 
              your information only in the following circumstances:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • With your explicit consent (e.g., when you share a note with another user){'\n'}
              • With service providers who assist us in operating our application (under strict confidentiality agreements):{'\n'}
                - Supabase: Cloud hosting, database, and authentication services{'\n'}
                - Stripe: Payment processing for Premium subscriptions (collects payment info, device identifiers for fraud prevention){'\n'}
                - Google Gemini: AI processing for transcription, summaries, and content generation{'\n'}
              • When required by law or to protect our rights and safety{'\n'}
              • In connection with a business transfer or acquisition
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              Note: Stripe, our payment processor, automatically collects device identifiers and network 
              information to prevent fraud and ensure secure transactions. This is a standard security 
              practice required by payment processors.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Your Rights and Choices
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              You have the right to:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Access and download your data
              • Update or correct your personal information
              • Delete your account and associated data
              • Control your privacy settings and preferences
              • Opt out of certain data processing activities
              • Request a copy of your data in a portable format
            </ThemedText>

            <TouchableOpacity
              onPress={() => router.push('/delete-account-request')}
              style={styles.deletionButton}
            >
              <Ionicons name="trash-outline" size={20} color="#DC3545" />
              <ThemedText style={styles.deletionButtonText}>
                Request Account Deletion
              </ThemedText>
              <Ionicons name="chevron-forward" size={20} color="#DC3545" />
            </TouchableOpacity>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Premium Features and Usage Limits
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Free users have limited access to AI features and voice recording time
              • Premium users enjoy unlimited access to all features
              • Usage is tracked to enforce these limits and improve our services
              • You can upgrade to Premium at any time through our subscription system
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Children's Privacy
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              Our services are not intended for children under 13 years of age. We do not knowingly 
              collect personal information from children under 13. If you are a parent or guardian 
              and believe your child has provided us with personal information, please contact us.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              International Data Transfers
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              Your information may be transferred to and processed in countries other than your own. 
              We ensure that such transfers comply with applicable data protection laws and implement 
              appropriate safeguards to protect your information.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Changes to This Privacy Policy
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy on this page and updating the "Last updated" date. 
              You are advised to review this Privacy Policy periodically for any changes.
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              Contact Us
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              • Email: privacy@wiznote.app
              • Through our in-app support system
              • By visiting our support page in the application
            </ThemedText>

            <View style={styles.webFooter}>
              <ThemedText style={[styles.webFooterText, { color: textSecondaryColor }]}>
                This Privacy Policy is effective as of January 2025 and will remain in effect except 
                with respect to any changes in its provisions in the future, which will be in effect 
                immediately after being posted on this page.
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
            Privacy Policy
          </ThemedText>
          <View style={styles.mobileHeaderSpacer} />
        </View>

        <ThemedText style={[styles.mobileLastUpdated, { color: textSecondaryColor }]}>
          Last updated: January 2025
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Introduction
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          Welcome to WizNote ("we," "our," or "us"). This Privacy Policy explains how we collect, 
          use, disclose, and safeguard your information when you use our note-taking application 
          and related services. Please read this privacy policy carefully. If you do not agree 
          with the terms of this privacy policy, please do not access the application.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Information We Collect
        </ThemedText>
        
        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          Personal Information
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          • Account Information: Email address, display name, and authentication credentials{'\n'}
          • Profile Data: User preferences, theme settings, and notification preferences{'\n'}
          • Subscription Information: Premium status, billing details, and payment information
        </ThemedText>

        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          Content Data
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          • Notes: Text content, titles, tags, and metadata you create{'\n'}
          • Audio Recordings: Voice recordings and their transcriptions{'\n'}
          • AI-Generated Content: Summaries, key details, quizzes, and flashcards created by our AI services{'\n'}
          • Shared Content: Notes you choose to share with other users
        </ThemedText>

        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          Usage Data
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          • Feature Usage: How you interact with our AI features, recording limits, and premium features{'\n'}
          • Device Information: Device type, operating system, and app version{'\n'}
          • Analytics Data: App performance, crash reports, and user behavior patterns
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          How We Use Your Information
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          We use the information we collect to:{'\n'}
          • Provide and maintain our note-taking services{'\n'}
          • Process audio recordings and generate transcriptions{'\n'}
          • Create AI-powered summaries, key details, quizzes, and flashcards{'\n'}
          • Manage your account and subscription{'\n'}
          • Enforce usage limits and feature restrictions{'\n'}
          • Improve our services and develop new features{'\n'}
          • Provide customer support{'\n'}
          • Ensure security and prevent fraud
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          AI and Machine Learning
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          Our application uses artificial intelligence and machine learning services to:{'\n'}
          • Transcribe audio recordings into text{'\n'}
          • Generate summaries of your notes and audio content{'\n'}
          • Extract key details and important points{'\n'}
          • Create quizzes and flashcards from your content{'\n'}
          • Provide intelligent content suggestions
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          Your content may be processed by third-party AI services (such as Google Gemini) 
          to provide these features. We ensure that any data sent to these services is 
          handled according to their privacy policies and our data protection standards.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Data Storage and Security
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          • Your data is stored securely using industry-standard encryption{'\n'}
          • We use Supabase for secure cloud storage and authentication{'\n'}
          • Audio files and transcriptions are encrypted both in transit and at rest{'\n'}
          • We implement access controls and monitoring to protect your information{'\n'}
          • Regular security audits and updates are performed
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Data Sharing and Disclosure
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          We do not sell, trade, or rent your personal information to third parties. We may share 
          your information only in the following circumstances:{'\n'}
          • With your explicit consent (e.g., when you share a note with another user){'\n'}
          • With service providers who assist us in operating our application (under strict confidentiality agreements):{'\n'}
            - Supabase: Cloud hosting, database, and authentication services{'\n'}
            - Stripe: Payment processing for Premium subscriptions (collects payment info, device identifiers for fraud prevention){'\n'}
            - Google Gemini: AI processing for transcription, summaries, and content generation{'\n'}
          • When required by law or to protect our rights and safety{'\n'}
          • In connection with a business transfer or acquisition{'\n'}
          {'\n'}
          Note: Stripe, our payment processor, automatically collects device identifiers and network 
          information to prevent fraud and ensure secure transactions. This is a standard security 
          practice required by payment processors.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Your Rights and Choices
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          You have the right to:{'\n'}
          • Access and download your data{'\n'}
          • Update or correct your personal information{'\n'}
          • Delete your account and associated data{'\n'}
          • Control your privacy settings and preferences{'\n'}
          • Opt out of certain data processing activities{'\n'}
          • Request a copy of your data in a portable format
        </ThemedText>

        <TouchableOpacity
          onPress={() => router.push('/delete-account-request')}
          style={styles.deletionButton}
        >
          <Ionicons name="trash-outline" size={20} color="#DC3545" />
          <ThemedText style={styles.deletionButtonText}>
            Request Account Deletion
          </ThemedText>
          <Ionicons name="chevron-forward" size={20} color="#DC3545" />
        </TouchableOpacity>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Premium Features and Usage Limits
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          • Free users have limited access to AI features and voice recording time{'\n'}
          • Premium users enjoy unlimited access to all features{'\n'}
          • Usage is tracked to enforce these limits and improve our services{'\n'}
          • You can upgrade to Premium at any time through our subscription system
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Children's Privacy
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          Our services are not intended for children under 13 years of age. We do not knowingly 
          collect personal information from children under 13. If you are a parent or guardian 
          and believe your child has provided us with personal information, please contact us.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          International Data Transfers
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          Your information may be transferred to and processed in countries other than your own. 
          We ensure that such transfers comply with applicable data protection laws and implement 
          appropriate safeguards to protect your information.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Changes to This Privacy Policy
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          We may update this Privacy Policy from time to time. We will notify you of any changes 
          by posting the new Privacy Policy on this page and updating the "Last updated" date. 
          You are advised to review this Privacy Policy periodically for any changes.
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          Contact Us
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          If you have any questions about this Privacy Policy or our data practices, please contact us:{'\n'}
          • Email: privacy@wiznote.app{'\n'}
          • Through our in-app support system{'\n'}
          • By visiting our support page in the application
        </ThemedText>

        <View style={styles.mobileFooter}>
          <ThemedText style={[styles.mobileFooterText, { color: textSecondaryColor }]}>
            This Privacy Policy is effective as of October 2025 and will remain in effect except 
            with respect to any changes in its provisions in the future, which will be in effect 
            immediately after being posted on this page.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
