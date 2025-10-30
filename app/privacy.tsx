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

export default function PrivacyPolicyScreen() {
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
        title={t('privacy.privacyPolicy')}
        subtitle={t('privacy.howWeProtectData')}
        sidebar={isAuthenticated ? <UserSidebar activePage="privacy" /> : null}
        header={
          <View style={styles.webHeader}>
            <View style={styles.webHeaderSpacer} />
            <View style={styles.webHeaderCenter}>
              <ThemedText style={styles.webHeaderTitle}>{t('privacy.privacyPolicy')}</ThemedText>
              <ThemedText style={styles.webHeaderSubtitle}>{t('privacy.lastUpdated', { date: 'October 2025' })}</ThemedText>
            </View>
            <View style={styles.webHeaderSpacer} />
          </View>
        }
      >
        <ScrollView style={styles.webContent} contentContainerStyle={styles.webContentContainer}>
          <ThemedView style={styles.webMainContent}>
            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('privacy.introduction')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.introductionText')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('privacy.informationWeCollect')}
            </ThemedText>
            
            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              {t('privacy.personalInformation')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.personalInfoDetails')}
            </ThemedText>

            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              {t('privacy.contentData')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.contentDataDetails')}
            </ThemedText>

            <ThemedText style={[styles.webSubsectionTitle, { color: textColor }]}>
              {t('privacy.usageData')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.usageDataDetails')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('privacy.howWeUseInfo')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.howWeUseInfoIntro')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.howWeUseInfoDetails')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('privacy.aiAndMachineLearning')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.aiIntro')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.aiDetails')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.aiThirdParty')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('privacy.dataStorageAndSecurity')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.dataStorageDetails')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('privacy.dataSharing')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.dataSharingIntro')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.dataSharingDetails')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.stripeNote')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('privacy.yourRights')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.yourRightsIntro')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.yourRightsDetails')}
            </ThemedText>

            <TouchableOpacity
              onPress={() => router.push('/delete-account-request')}
              style={styles.deletionButton}
            >
              <Ionicons name="trash-outline" size={20} color="#DC3545" />
              <ThemedText style={styles.deletionButtonText}>
                {t('privacy.requestAccountDeletion')}
              </ThemedText>
              <Ionicons name="chevron-forward" size={20} color="#DC3545" />
            </TouchableOpacity>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('privacy.premiumFeaturesAndLimits')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.premiumDetails')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('privacy.childrensPrivacy')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.childrensPrivacyDetails')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('privacy.internationalTransfers')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.internationalTransfersDetails')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('privacy.changesToPrivacy')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.changesToPrivacyDetails')}
            </ThemedText>

            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
              {t('privacy.contactUs')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.contactUsIntro')}
            </ThemedText>
            <ThemedText style={[styles.webSectionContent, { color: textColor }]}>
              {t('privacy.contactUsDetails')}
            </ThemedText>

            <View style={styles.webFooter}>
              <ThemedText style={[styles.webFooterText, { color: textSecondaryColor }]}>
                {t('privacy.effectiveText', { date: 'October 2025' })}
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
            {t('privacy.privacyPolicy')}
          </ThemedText>
          <View style={styles.mobileHeaderSpacer} />
        </View>

        <ThemedText style={[styles.mobileLastUpdated, { color: textSecondaryColor }]}>
          {t('privacy.lastUpdated', { date: 'October 2025' })}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('privacy.introduction')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('privacy.introductionText')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('privacy.informationWeCollect')}
        </ThemedText>
        
        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          {t('privacy.personalInformation')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('privacy.personalInfoDetails')}
        </ThemedText>

        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          {t('privacy.contentData')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('privacy.contentDataDetails')}
        </ThemedText>

        <ThemedText style={[styles.mobileSubsectionTitle, { color: textColor }]}>
          {t('privacy.usageData')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('privacy.usageDataDetails')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('privacy.howWeUseInfo')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('privacy.howWeUseInfoIntro')}
          {'\n'}
          {t('privacy.howWeUseInfoDetails')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('privacy.aiAndMachineLearning')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('privacy.aiIntro')}
          {'\n'}
          {t('privacy.aiDetails')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('privacy.aiThirdParty')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('privacy.dataStorageAndSecurity')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('privacy.dataStorageDetails')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('privacy.dataSharing')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('privacy.dataSharingIntro')}
          {'\n'}
          {t('privacy.dataSharingDetails')}
          {'\n'}
          {'\n'}
          {t('privacy.stripeNote')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('privacy.yourRights')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('privacy.yourRightsIntro')}
          {'\n'}
          {t('privacy.yourRightsDetails')}
        </ThemedText>

        <TouchableOpacity
          onPress={() => router.push('/delete-account-request')}
          style={styles.deletionButton}
        >
          <Ionicons name="trash-outline" size={20} color="#DC3545" />
          <ThemedText style={styles.deletionButtonText}>
            {t('privacy.requestAccountDeletion')}
          </ThemedText>
          <Ionicons name="chevron-forward" size={20} color="#DC3545" />
        </TouchableOpacity>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('privacy.premiumFeaturesAndLimits')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('privacy.premiumDetails')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('privacy.childrensPrivacy')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('privacy.childrensPrivacyDetails')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('privacy.internationalTransfers')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('privacy.internationalTransfersDetails')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('privacy.changesToPrivacy')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('privacy.changesToPrivacyDetails')}
        </ThemedText>

        <ThemedText style={[styles.mobileSectionTitle, { color: textColor }]}>
          {t('privacy.contactUs')}
        </ThemedText>
        <ThemedText style={[styles.mobileSectionContent, { color: textColor }]}>
          {t('privacy.contactUsIntro')}
          {'\n'}
          {t('privacy.contactUsDetails')}
        </ThemedText>

        <View style={styles.mobileFooter}>
          <ThemedText style={[styles.mobileFooterText, { color: textSecondaryColor }]}>
            {t('privacy.effectiveText', { date: 'October 2025' })}
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
