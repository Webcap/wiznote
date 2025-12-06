import { Platform, StyleSheet } from 'react-native';

export const NoteDetailStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    paddingTop: Platform.OS === 'web' ? 20 : 16,
    paddingBottom: Platform.OS === 'web' ? 20 : 16,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: Platform.OS === 'web' ? 5 : 4,
  },
  headerTitle: {
    fontSize: Platform.OS === 'web' ? 22 : 20,
    fontWeight: 'bold',
    marginRight: Platform.OS === 'web' ? 10 : 8,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 8 : 6,
    paddingVertical: Platform.OS === 'web' ? 4 : 3,
    borderRadius: Platform.OS === 'web' ? 12 : 10,
    marginTop: Platform.OS === 'web' ? 2 : 1,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 11 : 10,
    fontWeight: '600',
    marginLeft: Platform.OS === 'web' ? 4 : 3,
  },
  headerDate: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    marginBottom: Platform.OS === 'web' ? 20 : 16,
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: Platform.OS === 'web' ? 10 : 8,
    gap: Platform.OS === 'web' ? 15 : 12,
  },
  shareButton: {
    width: Platform.OS === 'web' ? 44 : 40,
    height: Platform.OS === 'web' ? 44 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Platform.OS === 'web' ? 22 : 20,
    backgroundColor: '#FF8C00', // orange accent like an action button
  },
  editButton: {
    width: Platform.OS === 'web' ? 44 : 40,
    height: Platform.OS === 'web' ? 44 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Platform.OS === 'web' ? 22 : 20,
    backgroundColor: '#3CB371',
  },
  archiveButton: {
    width: Platform.OS === 'web' ? 44 : 40,
    height: Platform.OS === 'web' ? 44 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Platform.OS === 'web' ? 22 : 20,
    backgroundColor: '#6A5ACD',
  },
  content: {
    flex: 1,
    paddingHorizontal: Platform.OS === 'web' ? 40 : 20,
    paddingTop: 20,
  },
  contentSection: {
    marginBottom: 20,
  },
  contentText: {
    fontSize: Platform.OS === 'web' ? 16 : 18,
    lineHeight: Platform.OS === 'web' ? 24 : 28,
  },
  noteTypeWrapper: {
    marginBottom: Platform.OS === 'web' ? 16 : 12,
  },
  noteTypeOuterContainer: {
    marginLeft: 0,
  },
  noteTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  audioNoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#282828',
    borderRadius: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 10 : 8,
    paddingVertical: Platform.OS === 'web' ? 4 : 3,
    borderWidth: 1,
    borderColor: '#6A5ACD',
  },
  audioNoteText: {
    color: '#6A5ACD',
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: 'bold',
    marginLeft: Platform.OS === 'web' ? 5 : 4,
  },
  textNoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#282828',
    borderRadius: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 10 : 8,
    paddingVertical: Platform.OS === 'web' ? 4 : 3,
    borderWidth: 1,
    borderColor: '#3CB371',
  },
  textNoteText: {
    color: '#3CB371',
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: 'bold',
    marginLeft: Platform.OS === 'web' ? 5 : 4,
  },
  actionButtonsWrapper: {
    marginBottom: Platform.OS === 'web' ? 20 : 16,
    alignItems: 'center',
  },
  actionButtonsContainer: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 400 : 320,
    gap: Platform.OS === 'web' ? 10 : 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: Platform.OS === 'web' ? 20 : 12,
  },
  actionButton: {
    flex: 1,
    height: Platform.OS === 'web' ? 40 : 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: Platform.OS === 'web' ? 8 : 6,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    }),
    minWidth: Platform.OS === 'web' ? 180 : 140,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  viewFlashcardsContainer: {
    marginTop: Platform.OS === 'web' ? 16 : 12,
    alignItems: 'center',
  },
  viewFlashcardsButton: {
    height: Platform.OS === 'web' ? 44 : 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: Platform.OS === 'web' ? 8 : 6,
    paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
    minWidth: Platform.OS === 'web' ? 200 : 160,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    }),
  },
  viewFlashcardsButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  summarySection: {
    paddingHorizontal: Platform.OS === 'web' ? 5 : 0,
    marginBottom: Platform.OS === 'web' ? 20 : 16,
  },
  summaryTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: 'bold',
    marginBottom: Platform.OS === 'web' ? 10 : 8,
  },
  summarySubtitle: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: 'bold',
    marginBottom: Platform.OS === 'web' ? 10 : 8,
  },
  summaryContent: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    lineHeight: Platform.OS === 'web' ? 28 : 28,
  },
  tagsSection: {
    marginBottom: Platform.OS === 'web' ? 20 : 16,
  },
  sectionLabel: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: 'bold',
    marginBottom: Platform.OS === 'web' ? 8 : 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#333333',
    borderRadius: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 10 : 8,
    paddingVertical: Platform.OS === 'web' ? 4 : 3,
  },
  tagText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
  },
  datesSection: {
    marginTop: Platform.OS === 'web' ? 20 : 16,
  },
  dateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 10 : 8,
  },
  dateLabel: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
  },
  dateValue: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
  },
  archivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    borderRadius: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 10 : 8,
    paddingVertical: Platform.OS === 'web' ? 4 : 3,
    marginTop: Platform.OS === 'web' ? 10 : 8,
  },
  archivedText: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    marginLeft: 4,
  },
  // Debug styles
  debugSection: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  debugText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
  debugButtons: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  debugButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
  },
  errorSubtext: {
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#6A5ACD',
    borderRadius: 25,
    width: 250,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  // Web specific styles
  webHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        paddingHorizontal: 20,
        paddingVertical: 12,
      },
      '@media (max-width: 480px)': {
        paddingHorizontal: 16,
        paddingVertical: 10,
      },
    } : {}),
  },
  webHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    gap: 12,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        gap: 10,
        alignItems: 'center',
      },
    } : {}),
  },
  webHeaderTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
    minWidth: 0,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        marginHorizontal: 8,
      },
    } : {}),
  },
  webHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 18,
        marginBottom: 2,
      },
      '@media (max-width: 480px)': {
        fontSize: 16,
      },
    } : {}),
  },
  webHeaderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        gap: 6,
      },
    } : {}),
  },
  webHeaderDate: {
    fontSize: 13,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 12,
      },
    } : {}),
  },
  webBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        width: 36,
        height: 36,
        borderRadius: 18,
      },
    } : {}),
  },
  webHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        gap: 6,
      },
    } : {}),
  },
  webNoteTypeBadge: {
    marginRight: 8,
  },
  webAudioNoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  webAudioNoteText: {
    color: '#6A5ACD',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  webTextNoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  webTextNoteText: {
    color: '#3CB371',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  webShareButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  webPinButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        width: 40,
        height: 40,
        borderRadius: 20,
      },
    } : {}),
  },
  webEditButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        width: 40,
        height: 40,
        borderRadius: 20,
      },
    } : {}),
  },
  webArchiveButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        width: 40,
        height: 40,
        borderRadius: 20,
      },
    } : {}),
  },
  webContent: {
    flex: 1,
  },
  webContentContainer: {
    flexDirection: 'row',
    padding: 24,
    gap: 24,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        flexDirection: 'column',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 20,
      },
      '@media (max-width: 480px)': {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 16,
      },
    } : {}),
  },
  webMainContent: {
    flex: 1,
    maxWidth: '70%',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        maxWidth: '100%',
        width: '100%',
      },
    } : {}),
  },
  webSidebar: {
    width: 320,
    gap: 24,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        width: '100%',
        gap: 20,
        order: -1,
      },
    } : {}),
  },
  webAudioSection: {
    marginBottom: 24,
  },
  webContentSection: {
    marginBottom: 24,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        marginBottom: 20,
      },
      '@media (max-width: 480px)': {
        marginBottom: 16,
      },
    } : {}),
  },
  webSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 17,
        marginBottom: 10,
      },
      '@media (max-width: 480px)': {
        fontSize: 16,
        marginBottom: 8,
      },
    } : {}),
  },
  webContentText: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        borderRadius: 16,
        padding: 16,
        minHeight: 100,
      },
      '@media (max-width: 480px)': {
        borderRadius: 14,
        padding: 14,
        minHeight: 80,
      },
    } : {}),
  },
  webContentTextInner: {
    fontSize: 16,
    lineHeight: 24,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 15,
        lineHeight: 22,
      },
      '@media (max-width: 480px)': {
        fontSize: 14,
        lineHeight: 20,
      },
    } : {}),
  },
  webLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  webLoadingText: {
    fontSize: 14,
  },
  webKeyDetailsList: {
    gap: 8,
  },
  webKeyDetailItem: {
    paddingVertical: 4,
  },
  webKeyDetailText: {
    fontSize: 14,
    lineHeight: 20,
  },
  webNoDetailsText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  webTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  webTag: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  webTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  webActionSection: {
    marginBottom: 24,
  },
  webActionGrid: {
    gap: 8,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
      },
      '@media (max-width: 480px)': {
        flexDirection: 'column',
        gap: 8,
      },
    } : {}),
  },
  webActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        flex: 1,
        minWidth: '48%',
        minHeight: 50,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
      },
      '@media (max-width: 480px)': {
        flex: 1,
        minWidth: '100%',
        minHeight: 48,
        paddingVertical: 12,
        paddingHorizontal: 12,
      },
    } : {}),
  },
  webActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 15,
        fontWeight: '700',
      },
    } : {}),
  },
  webDetailsSection: {
    marginBottom: 24,
  },
  webDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  webDetailLabel: {
    fontSize: 14,
  },
  webDetailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  webArchivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  webArchivedText: {
    fontSize: 12,
    marginLeft: 4,
  },
  webShortcutsSection: {
    marginBottom: 24,
  },
  webShortcutsList: {
    gap: 8,
  },
  webShortcutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  webShortcutKey: {
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  webUpgradeButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webUpgradeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  upgradeButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  audioFileItem: {
    marginBottom: 16,
  },

  // PDF Note Badge Styles
  pdfNoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  webPDFNoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },

  // PDF File Styles
  pdfFileCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  pdfFileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  pdfFileIcon: {
    marginRight: 12,
  },
  pdfFileInfo: {
    flex: 1,
  },
  pdfFileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  pdfFileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pdfFileMetaText: {
    fontSize: 13,
  },
  pdfFileStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pdfFileStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  pdfFileActions: {
    flexDirection: 'row',
    gap: 12,
  },
  pdfActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  viewButton: {
    // backgroundColor set dynamically
  },
  downloadButton: {
    // backgroundColor and borderColor set dynamically
  },
  pdfActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

}); 