import { StyleSheet } from 'react-native';

export const PrivacyPolicyStyles = StyleSheet.create({
  // Web styles
  webHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webHeaderCenter: {
    flex: 1,
    alignItems: 'center' as const,
    marginHorizontal: 20,
  },
  webHeaderTitle: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    marginTop: 20,
    marginBottom: 6,
    textAlign: 'center' as const,
  },
  webHeaderSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center' as const,
  },
  webHeaderSpacer: {
    width: 100,
  },
  webContent: {
    flex: 1,
  },
  webContentContainer: {
    paddingBottom: 40,
  },
  webMainContent: {
    maxWidth: 800,
    alignSelf: 'center' as const,
    paddingHorizontal: 20,
  },
  webSectionTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    marginTop: 32,
    marginBottom: 16,
  },
  webSubsectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    marginTop: 24,
    marginBottom: 12,
  },
  webSectionContent: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  webFooter: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  webFooterText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic' as const,
  },

  // Mobile styles
  container: {
    flex: 1,
  },
  mobileContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  mobileHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingTop: 60,
    paddingBottom: 20,
  },
  mobileHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    flex: 1,
    textAlign: 'center' as const,
    marginTop: 20,
  },
  mobileHeaderSpacer: {
    width: 40,
  },
  mobileLastUpdated: {
    fontSize: 14,
    textAlign: 'center' as const,
    marginBottom: 24,
    fontStyle: 'italic' as const,
  },
  mobileSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    marginTop: 24,
    marginBottom: 12,
  },
  mobileSubsectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 20,
    marginBottom: 8,
  },
  mobileSectionContent: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  mobileFooter: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  mobileFooterText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic' as const,
  },

  // Deletion button styles
  deletionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#DC3545',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginVertical: 20,
    gap: 10,
  },
  deletionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#DC3545',
  },
});
