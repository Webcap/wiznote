import { StyleSheet } from 'react-native';

export const signupStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 40,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 50,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 16,
  },
  signupButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signinText: {
    fontSize: 16,
  },
  signinLink: {
    fontSize: 16,
    fontWeight: '600',
  },
  privacyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 40,
  },
  privacyText: {
    fontSize: 12,
    textAlign: 'center',
  },
  privacyLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Web specific styles
  webContainer: {
    flex: 1,
  },
  webContent: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  webLeftPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  webBrandSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  webLogoContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  webLogoImage: {
    width: '100%',
    height: '100%',
  },
  webBrandTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  webBrandSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  webFeaturesSection: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 40,
  },
  webFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  webFeatureText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  webBenefitsSection: {
    width: '100%',
    maxWidth: 400,
  },
  webBenefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  webBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  webBenefitText: {
    fontSize: 14,
    marginLeft: 8,
  },
  webRightPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
    paddingTop: 280,
  },
  webRightPanelContent: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  webFormContainer: {
    width: '100%',
    maxWidth: 400,
  },
  webFormHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  webFormTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  webFormSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  webForm: {
    marginBottom: 32,
  },
  webInputContainer: {
    marginBottom: 24,
  },
  webLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  webInput: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  webPasswordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 56,
  },
  webPasswordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  webEyeButton: {
    paddingHorizontal: 16,
  },
  webPasswordHint: {
    fontSize: 12,
    marginTop: 4,
  },
  webSignupButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  webSignupButtonDisabled: {
    opacity: 0.6,
  },
  webSignupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  webLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  webSigninContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webSigninText: {
    fontSize: 16,
  },
  webSigninLink: {
    fontSize: 16,
    fontWeight: '600',
  },
  webTermsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  webTermsText: {
    fontSize: 12,
  },
  webTermsLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  webShortcutsContainer: {
    borderTopWidth: 1,
    paddingTop: 24,
  },
  webShortcutsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  webShortcutsList: {
    gap: 8,
  },
  webShortcutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webShortcutKey: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'center',
  },
  webShortcutText: {
    fontSize: 12,
  },
});

