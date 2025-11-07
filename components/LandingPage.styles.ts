import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
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
  logoImage: {
    width: 60,
    height: 60,
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
  footerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 20,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        flexDirection: 'column',
        gap: 12,
      },
    } : {}),
  },
});

