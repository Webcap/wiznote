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
import { useTranslation } from '../hooks/useTranslation';

export default function TermsOfServiceScreen() {
  const { t } = useTranslation();
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
        title={t('terms.termsOfService')}
        subtitle={t('terms.termsAndConditions')}
        sidebar={isAuthenticated ? <UserSidebar activePage="terms" /> : null}
        header={
          <View style={styles.webHeader}>
            <View style={styles.webHeaderSpacer} />
            <View style={styles.webHeaderCenter}>
              <ThemedText style={styles.webHeaderTitle}>{t('terms.termsOfService')}</ThemedText>
              <ThemedText style={styles.webHeaderSubtitle}>{t('terms.lastUpdated', { date: 'October 2025' })}</ThemedText>
            </View>
            <View style={styles.webHeaderSpacer} />
          </View>
        }
      >
        <ScrollView style={styles.webContent} contentContainerStyle={styles.webContentContainer}>
          <ThemedView style={styles.webMainContent}>
            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.acceptanceOfTerms')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.acceptanceOfTermsText')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.descriptionOfService')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.descriptionOfServiceIntro')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.serviceFeatures')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.serviceModification')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.accountRegistration')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.accountRegistrationIntro')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.accountRequirements')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.accountResponsibility')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.userContent')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.userContentIntro')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.userContentLicense')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.licenseTermination')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.acceptableUse')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.acceptableUseIntro')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.prohibitedActivities')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.policyViolation')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.subscriptionBilling')}
            </ThemedText>
            
            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              {t('terms.freeAndPremium')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.subscriptionTiers')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.tierDetails')}
            </ThemedText>

            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              {t('terms.paymentTerms')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.paymentTermsDetails')}
            </ThemedText>

            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              {t('terms.cancellationRefunds')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.cancellationDetails')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.aiServices')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.aiServicesIntro')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.aiServicesDetails')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.usageLimits')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.usageLimitsIntro')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.usageLimitsDetails')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.fairUse')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.dataPrivacy')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.dataPrivacyText')}
            </ThemedText>

            <TouchableOpacity
              onPress={() => router.push('/privacy')}
              style={styles.deletionButton}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color={accentPrimary} />
              <ThemedText style={[styles.deletionButtonText, { color: accentPrimary }]}>
                {t('terms.viewPrivacyPolicy')}
              </ThemedText>
              <Ionicons name="chevron-forward" size={20} color={accentPrimary} />
            </TouchableOpacity>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.intellectualProperty')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.intellectualPropertyIntro')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.intellectualPropertyRestrictions')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.thirdPartyServices')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.thirdPartyServicesIntro')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.thirdPartyServicesList')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.thirdPartyDisclaimer')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.disclaimers')}
            </ThemedText>
            
            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              {t('terms.serviceAvailability')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.serviceAvailabilityText')}
            </ThemedText>

            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              {t('terms.limitationOfLiability')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.limitationIntro')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.limitationDetails')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.limitationAmount')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.indemnification')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.indemnificationText')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.indemnificationReasons')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.termination')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.terminationIntro')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.terminationReasons')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.terminationDetails')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.disputeResolution')}
            </ThemedText>
            
            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              {t('terms.informalResolution')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.informalResolutionText')}
            </ThemedText>

            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              {t('terms.governingLaw')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.governingLawText')}
            </ThemedText>

            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              {t('terms.arbitration')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.arbitrationText')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.changesToTerms')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.changesToTermsText')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.severability')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.severabilityText')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.entireAgreement')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.entireAgreementText')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('terms.contactInformation')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.contactInformationIntro')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('terms.contactDetails')}
            </ThemedText>

            <View style={styles.webFooter}>
              <ThemedText style={[styles.webFooterText, { color: textSecondaryColor }]}>
                {t('terms.effectiveText', { date: 'October 2025' })}
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
            {t('terms.termsOfService')}
          </ThemedText>
          <View style={styles.mobileHeaderSpacer} />
        </View>

        <ThemedText style={[styles.mobileLastUpdated, { color: textSecondaryColor }]}>
          {t('terms.lastUpdated', { date: 'January 2025' })}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.acceptanceOfTerms')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.acceptanceOfTermsText')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.descriptionOfService')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.descriptionOfServiceIntro')}{'\n'}
          {t('terms.serviceFeatures')}{'\n'}
          {'\n'}
          {t('terms.serviceModification')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.accountRegistration')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.accountRegistrationIntro')}{'\n'}
          {t('terms.accountRequirements')}{'\n'}
          {'\n'}
          {t('terms.accountResponsibility')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.userContent')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.userContentIntro')}{'\n'}
          {t('terms.userContentLicense')}{'\n'}
          {'\n'}
          {t('terms.licenseTermination')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.acceptableUse')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.acceptableUseIntro')}{'\n'}
          {t('terms.prohibitedActivities')}{'\n'}
          {'\n'}
          {t('terms.policyViolation')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.subscriptionBilling')}
        </ThemedText>
        
        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          {t('terms.freeAndPremium')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.subscriptionTiers')}{'\n'}
          {t('terms.tierDetails')}
        </ThemedText>

        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          {t('terms.paymentTerms')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.paymentTermsDetails')}
        </ThemedText>

        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          {t('terms.cancellationRefunds')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.cancellationDetails')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.aiServices')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.aiServicesIntro')}{'\n'}
          {t('terms.aiServicesDetails')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.usageLimits')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.usageLimitsIntro')}{'\n'}
          {t('terms.usageLimitsDetails')}{'\n'}
          {'\n'}
          {t('terms.fairUse')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.dataPrivacy')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.dataPrivacyText')}
        </ThemedText>

        <TouchableOpacity
          onPress={() => router.push('/privacy')}
          style={styles.deletionButton}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={accentPrimary} />
          <ThemedText style={[styles.deletionButtonText, { color: accentPrimary }]}>
            {t('terms.viewPrivacyPolicy')}
          </ThemedText>
          <Ionicons name="chevron-forward" size={20} color={accentPrimary} />
        </TouchableOpacity>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.intellectualProperty')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.intellectualPropertyIntro')}{'\n'}
          {t('terms.intellectualPropertyRestrictions')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.thirdPartyServices')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.thirdPartyServicesIntro')}{'\n'}
          {t('terms.thirdPartyServicesList')}{'\n'}
          {'\n'}
          {t('terms.thirdPartyDisclaimer')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.disclaimers')}
        </ThemedText>
        
        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          {t('terms.serviceAvailability')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.serviceAvailabilityText')}
        </ThemedText>

        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          {t('terms.limitationOfLiability')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.limitationIntro')}{'\n'}
          {t('terms.limitationDetails')}{'\n'}
          {'\n'}
          {t('terms.limitationAmount')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.indemnification')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.indemnificationText')}{'\n'}
          {t('terms.indemnificationReasons')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.termination')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.terminationIntro')}{'\n'}
          {t('terms.terminationReasons')}{'\n'}
          {'\n'}
          {t('terms.terminationDetails')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.disputeResolution')}
        </ThemedText>
        
        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          {t('terms.informalResolution')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.informalResolutionText')}
        </ThemedText>

        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          {t('terms.governingLaw')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.governingLawText')}
        </ThemedText>

        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          {t('terms.arbitration')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.arbitrationText')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.changesToTerms')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.changesToTermsText')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.severability')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.severabilityText')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.entireAgreement')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.entireAgreementText')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('terms.contactInformation')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('terms.contactInformationIntro')}{'\n'}
          {t('terms.contactDetails')}
        </ThemedText>

        <View style={styles.mobileFooter}>
          <ThemedText style={[styles.mobileFooterText, { color: textSecondaryColor }]}>
            {t('terms.effectiveText', { date: 'January 2025' })}
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

