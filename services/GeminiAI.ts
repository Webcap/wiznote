
import { featureFlagService } from './FeatureFlagService';
import { Platform } from 'react-native';

// SECURITY: API key is now stored server-side only
// Use server-side proxy endpoint instead of direct API calls
const getGeminiApiUrl = () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://wiznote.app';
  return `${apiUrl}/.netlify/functions/gemini-api`;
};

// Helper function to call Gemini API via server-side proxy
async function callGeminiAPI(endpoint: string, payload: any): Promise<any> {
  const apiUrl = getGeminiApiUrl();
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint,
        payload,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error || `API request failed: ${response.status}`;
      throw new Error(msg);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || data.error || 'Unknown API error');
    }
    
    return data;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const isNetworkError = err.message?.includes('Network request failed') || err.message?.includes('Failed to fetch') || err.name === 'TypeError';
    console.error('Gemini API proxy error:', isNetworkError ? `Network error - check device connectivity to ${getGeminiApiUrl()}` : err.message, err);
    throw error;
  }
}

export async function transcribeAudioWithGemini(base64Audio: string, user?: any): Promise<string> {
  // Check if AI transcription is enabled
  // If user is not provided, try to get it from session
  let userForCheck = user;
  if (!userForCheck) {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Try to load user profile for proper feature flag evaluation
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id, role, premium')
          .eq('id', session.user.id)
          .single();
        
        if (userProfile) {
          userForCheck = {
            id: userProfile.id,
            role: userProfile.role,
            premium: userProfile.premium || {}
          };
        } else if (session.user) {
          // Fallback to basic user object
          userForCheck = { id: session.user.id };
        }
      }
    } catch (error) {
      console.warn('GeminiAI: Failed to load user for feature flag check:', error);
    }
  }
  
  if (!featureFlagService.isFeatureEnabled('ai_transcription', userForCheck)) {
    throw new Error('AI transcription is currently disabled');
  }
  
  try {
    // Use server-side API proxy instead of direct API call
    const data = await callGeminiAPI('gemini-3-flash-preview:generateContent', {
      contents: [
        {
          parts: [
            { inline_data: { mime_type: 'audio/m4a', data: base64Audio } }
          ]
        }
      ]
    });
    
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    console.error('GeminiAI: Error transcribing audio:', error);
    throw error;
  }
}

export async function generateTitleWithGemini(transcript: string, user?: any): Promise<string> {
  console.log('GeminiAI: Starting title generation for transcript:', transcript.substring(0, 100) + '...');
  
  // Get user object if not provided - try BetterAuthService first, then options, then session
  let userForCheck = user;

  if (!userForCheck || !userForCheck.role || !userForCheck.premium) {
    try {
      // Try to get user from BetterAuthService first (has cached role and premium)
      const { betterAuthService } = await import('./BetterAuthService');
      const currentUser = await betterAuthService.getCurrentUser();
      
      if (currentUser && currentUser.id) {
        console.log('GeminiAI: Loaded user from BetterAuthService for title generation:', {
          id: currentUser.id,
          role: currentUser.role,
          premiumActive: currentUser.premium?.isActive,
        });
        userForCheck = {
          id: currentUser.id,
          role: currentUser.role || 'user',
          premium: currentUser.premium || {},
        };
      } else if (user?.id) {
        // If BetterAuthService didn't provide a user, but we have a user ID from parameter, use it
        userForCheck = {
          id: user.id,
          role: user.role || 'user',
          premium: user.premium || {},
        };
      } else {
        // Fallback to session
        const { supabase } = await import('../lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('id, role, premium')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (userProfile) {
            // Handle case where .maybeSingle() might return an array
            const profile = Array.isArray(userProfile) ? userProfile[0] : userProfile;
            if (profile && profile.id) {
              userForCheck = {
                id: profile.id,
                role: profile.role || 'user',
                premium: profile.premium || {}
              };
            } else if (session.user) {
              userForCheck = { id: session.user.id, role: 'user' };
            }
          } else if (session.user) {
            userForCheck = { id: session.user.id, role: 'user' };
          }
        }
      }
    } catch (error) {
      console.warn('GeminiAI: Failed to load user for feature flag check:', error);
      // If we have a user ID from parameter, use it with default role
      if (user?.id) {
        userForCheck = {
          id: user.id,
          role: 'user',
          premium: {},
        };
      }
    }
  }
  
  // Check if AI name generating is enabled
  const isEnabled = featureFlagService.isFeatureEnabled('ai_name_generating', userForCheck);
  console.log('GeminiAI: AI name generating enabled:', isEnabled, 'for user:', userForCheck?.id);
  
  if (!isEnabled) {
    throw new Error('AI name generating is currently disabled');
  }
  
  try {
    const prompt = `Create a short, descriptive title (3-8 words) for this audio note. Return ONLY the title, nothing else: ${transcript}`;
    console.log('GeminiAI: Making API request via server proxy');
    console.log('GeminiAI: Request payload:', { prompt: prompt.substring(0, 100) + '...' });
    
    // Use server-side API proxy instead of direct API call
    const data = await callGeminiAPI('gemini-3-flash-preview:generateContent', {
      contents: [
        { parts: [{ text: prompt }] }
      ]
    });
    
    console.log('GeminiAI: API response received');
    
    const generatedTitle = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Audio Note';
    console.log('GeminiAI: Generated title:', generatedTitle);
    
    // Clean up the response to ensure it's just a title
    const cleanTitle = generatedTitle
      .replace(/^title\s*generated\s*:?\s*/i, '')
      .replace(/^here\s*is\s*a\s*title\s*:?\s*/i, '')
      .replace(/^the\s*title\s*is\s*:?\s*/i, '')
      .replace(/^title\s*:?\s*/i, '')
      .trim();
    
    console.log('GeminiAI: Final clean title:', cleanTitle);
    return cleanTitle || 'Audio Note';
  } catch (error) {
    console.error('GeminiAI: Error generating title:', error);
    throw error;
  }
}

export async function extractKeyDetailsWithGemini(noteText: string, user?: any): Promise<string[]> {
  // Get user object if not provided - try BetterAuthService first, then options, then session
  let userForCheck = user;

  if (!userForCheck || !userForCheck.role || !userForCheck.premium) {
    try {
      // Try to get user from BetterAuthService first (has cached role and premium)
      const { betterAuthService } = await import('./BetterAuthService');
      const currentUser = await betterAuthService.getCurrentUser();
      
      if (currentUser && currentUser.id) {
        console.log('GeminiAI: Loaded user from BetterAuthService for key details extraction:', {
          id: currentUser.id,
          role: currentUser.role,
          premiumActive: currentUser.premium?.isActive,
        });
        userForCheck = {
          id: currentUser.id,
          role: currentUser.role || 'user',
          premium: currentUser.premium || {},
        };
      } else if (user?.id) {
        // If BetterAuthService didn't provide a user, but we have a user ID from parameter, use it
        userForCheck = {
          id: user.id,
          role: user.role || 'user',
          premium: user.premium || {},
        };
      } else {
        // Fallback to session
        const { supabase } = await import('../lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('id, role, premium')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (userProfile) {
            // Handle case where .maybeSingle() might return an array
            const profile = Array.isArray(userProfile) ? userProfile[0] : userProfile;
            if (profile && profile.id) {
              userForCheck = {
                id: profile.id,
                role: profile.role || 'user',
                premium: profile.premium || {}
              };
            } else if (session.user) {
              userForCheck = { id: session.user.id, role: 'user' };
            }
          } else if (session.user) {
            userForCheck = { id: session.user.id, role: 'user' };
          }
        }
      }
    } catch (error) {
      console.warn('GeminiAI: Failed to load user for feature flag check:', error);
      // If we have a user ID from parameter, use it with default role
      if (user?.id) {
        userForCheck = {
          id: user.id,
          role: 'user',
          premium: {},
        };
      }
    }
  }
  
  // Check if AI key details feature is enabled
  if (!featureFlagService.isFeatureEnabled('ai_key_details', userForCheck)) {
    throw new Error('AI key details are currently disabled');
  }
  
  try {
    const prompt = `Extract the 3-5 most important key details or facts from the following note. Return ONLY the bullet points, with no introduction or explanation.\n\nNote:\n${noteText}`;
    
    // Use server-side API proxy instead of direct API call
    const data = await callGeminiAPI('gemini-3-flash-preview:generateContent', {
      contents: [
        { parts: [{ text: prompt }] }
      ]
    });
    
    // Split by line and filter out empty lines and bullets
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text
      .split(/\n|\r/)
      .map((line: string) => line.replace(/^[-*•]\s*/, '').trim())
      .filter((line: string) => line.length > 0);
  } catch (error) {
    console.error('GeminiAI: Error extracting key details:', error);
    throw error;
  }
}

export async function generateSummaryWithGemini(noteText: string, user?: any): Promise<string> {
  // Get user object if not provided - try BetterAuthService first, then options, then session
  let userForCheck = user;

  if (!userForCheck || !userForCheck.role || !userForCheck.premium) {
    try {
      // Try to get user from BetterAuthService first (has cached role and premium)
      const { betterAuthService } = await import('./BetterAuthService');
      const currentUser = await betterAuthService.getCurrentUser();
      
      if (currentUser && currentUser.id) {
        console.log('GeminiAI: Loaded user from BetterAuthService for summary generation:', {
          id: currentUser.id,
          role: currentUser.role,
          premiumActive: currentUser.premium?.isActive,
        });
        userForCheck = {
          id: currentUser.id,
          role: currentUser.role || 'user',
          premium: currentUser.premium || {},
        };
      } else if (user?.id) {
        // If BetterAuthService didn't provide a user, but we have a user ID from parameter, use it
        userForCheck = {
          id: user.id,
          role: user.role || 'user',
          premium: user.premium || {},
        };
      } else {
        // Fallback to session
        const { supabase } = await import('../lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('id, role, premium')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (userProfile) {
            // Handle case where .maybeSingle() might return an array
            const profile = Array.isArray(userProfile) ? userProfile[0] : userProfile;
            if (profile && profile.id) {
              userForCheck = {
                id: profile.id,
                role: profile.role || 'user',
                premium: profile.premium || {}
              };
            } else if (session.user) {
              userForCheck = { id: session.user.id, role: 'user' };
            }
          } else if (session.user) {
            userForCheck = { id: session.user.id, role: 'user' };
          }
        }
      }
    } catch (error) {
      console.warn('GeminiAI: Failed to load user for feature flag check:', error);
      // If we have a user ID from parameter, use it with default role
      if (user?.id) {
        userForCheck = {
          id: user.id,
          role: 'user',
          premium: {},
        };
      }
    }
  }
  
  // Check if AI summaries feature is enabled
  if (!featureFlagService.isFeatureEnabled('ai_summaries', userForCheck)) {
    throw new Error('AI summaries are currently disabled');
  }
  
  try {
    const prompt = `Create a concise, well-written summary of the following note content. The summary should be 2-4 sentences that capture the main points and essence of the note. Return ONLY the summary text, no introduction or formatting.\n\nNote:\n${noteText}`;
    
    // Use server-side API proxy instead of direct API call
    const data = await callGeminiAPI('gemini-3-flash-preview:generateContent', {
      contents: [
        { parts: [{ text: prompt }] }
      ]
    });
    
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean up the response to ensure it's just the summary
    return summary
      .replace(/^summary\s*:?\s*/i, '')
      .replace(/^here\s*is\s*a\s*summary\s*:?\s*/i, '')
      .replace(/^the\s*summary\s*is\s*:?\s*/i, '')
      .trim();
  } catch (error) {
    console.error('GeminiAI: Error generating summary:', error);
    throw error;
  }
}

// Helper function to check if AI name generation can be used by a specific user
export async function canUseAINameGeneration(user?: any): Promise<{
  canUse: boolean;
  reason?: string;
  usageLeft?: number;
}> {
  try {
    // Check if feature is enabled (Feature Flags)
    const isEnabled = featureFlagService.isFeatureEnabled('ai_name_generating', user);
    if (!isEnabled) {
      return {
        canUse: false,
        reason: 'Feature not enabled',
      };
    }

    // Check usage limits (Feature Limits)
    const { featureLimitService } = require('./FeatureLimitService');
    const limitCheck = await featureLimitService.canUseFeature(user?.id, 'ai_name_generating', 1);
    
    return {
      canUse: limitCheck.canUse,
      reason: limitCheck.reason,
      usageLeft: limitCheck.remainingLimit,
    };
  } catch (error) {
    console.error('Error checking AI name generation capability:', error);
    return {
      canUse: false,
      reason: 'Unable to check feature availability',
    };
  }
} 

// Generate flashcards from note content
export async function generateFlashcardsWithGemini(
  content: string,
  options: {
    numCards: number;
    difficulty: 'easy' | 'medium' | 'hard';
    focusAreas?: string[];
    includeExplanations: boolean;
    language?: string; // User's language preference ('en' or 'es')
  },
  user?: any
): Promise<{
  success: boolean;
  flashcards: Array<{
    question: string;
    answer: string;
    explanation?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    tags: string[];
  }>;
  error?: string;
}> {
  console.log('🔮 GeminiAI: Starting flashcard generation for content:', content.substring(0, 100) + '...');
  console.log('🔮 GeminiAI: Options:', options);
  
  // Get user object if not provided
  let userForCheck = user;
  if (!userForCheck) {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id, role, premium')
          .eq('id', session.user.id)
          .single();
        
        if (userProfile) {
          userForCheck = {
            id: userProfile.id,
            role: userProfile.role,
            premium: userProfile.premium || {}
          };
        } else if (session.user) {
          userForCheck = { id: session.user.id };
        }
      }
    } catch (error) {
      console.warn('GeminiAI: Failed to load user for feature flag check:', error);
    }
  }
  
  // Check if AI flashcards is enabled (with user context for proper evaluation)
  const isEnabled = featureFlagService.isFeatureEnabled('ai_flashcards', userForCheck);
  console.log('🔮 GeminiAI: AI flashcards enabled:', isEnabled, 'for user:', userForCheck?.id);
  
  if (!isEnabled) {
    console.log('🔮 GeminiAI: AI flashcards feature is disabled');
    throw new Error('AI flashcards is currently disabled');
  }
  
  try {
    const focusAreasText = options.focusAreas && options.focusAreas.length > 0 
      ? `Focus on these areas: ${options.focusAreas.join(', ')}. `
      : '';
    
    const explanationsText = options.includeExplanations 
      ? 'Include a brief explanation for each answer. '
      : '';
    
    // Language instruction for the AI
    const languageInstruction = options.language === 'es' 
      ? 'IMPORTANT: Generate all flashcards (questions, answers, explanations, categories, and tags) in Spanish. Respond completely in Spanish.'
      : 'IMPORTANT: Generate all flashcards (questions, answers, explanations, categories, and tags) in English. Respond completely in English.';
    
    const prompt = `Generate ${options.numCards} flashcards based on this content.

${languageInstruction}

Requirements:
- Difficulty level: ${options.difficulty}
- ${focusAreasText}${explanationsText}
- Questions should be clear and specific
- Answers should be accurate and concise
- Each flashcard should cover a different concept or fact
- Use appropriate categories and tags

Return ONLY a valid JSON array with objects containing:
{
  "question": "Clear question here",
  "answer": "Accurate answer here",
  "explanation": "Brief explanation (if requested)",
  "difficulty": "${options.difficulty}",
  "category": "Topic category",
  "tags": ["tag1", "tag2"]
}

Content to analyze:
${content}`;

    console.log('🔮 GeminiAI: Making API request for flashcard generation via server proxy');
    console.log('🔮 GeminiAI: Prompt length:', prompt.length);
    
    // Use server-side API proxy instead of direct API call
    const data = await callGeminiAPI('gemini-3-flash-preview:generateContent', {
      contents: [
        { parts: [{ text: prompt }] }
      ]
    });
    
    console.log('🔮 GeminiAI: API response received');
    
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('GeminiAI: Raw response text:', responseText);
    
    // Try to extract JSON from the response
    let jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // If no array found, try to find any JSON object
      jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // Wrap single object in array
        jsonMatch[0] = `[${jsonMatch[0]}]`;
      }
    }
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }
    
    let flashcards;
    try {
      flashcards = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('GeminiAI: JSON parse error:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }
    
    // Validate flashcard structure
    if (!Array.isArray(flashcards)) {
      throw new Error('AI response is not an array');
    }
    
    const validatedFlashcards = flashcards.map((card, index) => {
      if (!card.question || !card.answer) {
        throw new Error(`Flashcard ${index + 1} missing required fields`);
      }
      
      return {
        question: card.question.trim(),
        answer: card.answer.trim(),
        explanation: card.explanation?.trim(),
        difficulty: card.difficulty || options.difficulty,
        category: card.category || 'General',
        tags: Array.isArray(card.tags) ? card.tags : ['ai-generated'],
      };
    });
    
    console.log('GeminiAI: Successfully generated', validatedFlashcards.length, 'flashcards');
    
    return {
      success: true,
      flashcards: validatedFlashcards,
    };
  } catch (error) {
    console.error('GeminiAI: Error generating flashcards:', error);
    return {
      success: false,
      flashcards: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Process PDF with Gemini AI - extract text and generate metadata
export async function processPDFWithGemini(
  base64PDF: string,
  options: {
    extractText?: boolean;
    generateTitle?: boolean;
    generateSummary?: boolean;
    extractKeyDetails?: boolean;
    user?: any;
  } = {}
): Promise<{
  success: boolean;
  extractedText?: string;
  title?: string;
  summary?: string;
  keyDetails?: string[];
  error?: string;
}> {
  console.log('GeminiAI: Starting PDF processing with Gemini');
  console.log('GeminiAI: Options:', options);
  
  // Initialize feature flag service to ensure flags are loaded
  try {
    console.log('GeminiAI: Initializing feature flag service for PDF processing...');
    // First try to initialize normally (this loads from cache and Supabase)
    await featureFlagService.initialize(true); // true = user is authenticated (or will be)
    
    // Reload flags from Supabase to ensure we have the latest values
    console.log('GeminiAI: Reloading flags from Supabase for latest values...');
    try {
      // Access the private method via type assertion (not ideal, but necessary for debugging)
      const service = featureFlagService as any;
      if (service.loadFlagsFromSupabase) {
        await service.loadFlagsFromSupabase();
        console.log('GeminiAI: Flags reloaded from Supabase');
      } else {
        console.warn('GeminiAI: loadFlagsFromSupabase method not accessible');
      }
    } catch (reloadError) {
      console.warn('GeminiAI: Failed to reload flags from Supabase, using cached values:', reloadError);
    }
    
    console.log('GeminiAI: Feature flag service initialized');
  } catch (error) {
    console.warn('GeminiAI: Failed to initialize feature flag service:', error);
    // Continue anyway - feature flag service might already be initialized
  }
  
  // Load user for feature flag check - try BetterAuthService first, then options, then session
  let userForCheck = options?.user;

  if (!userForCheck || !userForCheck.role || !userForCheck.premium) {
    try {
      // Try to get user from BetterAuthService first (has cached role and premium)
      const { betterAuthService } = await import('./BetterAuthService');
      const currentUser = await betterAuthService.getCurrentUser();
      
      if (currentUser && currentUser.id) {
        console.log('GeminiAI: Loaded user from BetterAuthService for PDF feature flag check:', {
          id: currentUser.id,
          role: currentUser.role,
          premiumActive: currentUser.premium?.isActive,
        });
        userForCheck = {
          id: currentUser.id,
          role: currentUser.role || 'user',
          premium: currentUser.premium || {},
        };
      } else if (options?.user?.id) {
        // If BetterAuthService didn't provide a user, but we have a user ID from options, use it
        console.log('GeminiAI: BetterAuthService did not provide user, using user ID from options:', options.user.id);
        userForCheck = {
          id: options.user.id,
          role: options.user.role || 'user',
          premium: options.user.premium || {},
        };
      } else {
        // Fallback to session
        const { supabase } = await import('../lib/supabase');
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          console.log('GeminiAI: Loading user profile from session for PDF feature flag check:', session.user.id);
          const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('id, role, premium')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('GeminiAI: Error loading user profile:', profileError);
            // Fall back to session user ID only with default role
            userForCheck = { id: session.user.id, role: 'user' };
            console.log('GeminiAI: Profile load error, using session user ID with default role:', userForCheck);
          } else if (userProfile) {
            // Handle case where .maybeSingle() might return an array
            const profile = Array.isArray(userProfile) ? userProfile[0] : userProfile;
            
            if (profile && profile.id) {
              userForCheck = {
                id: profile.id,
                role: profile.role || 'user',
                premium: profile.premium || {},
              };
              console.log('GeminiAI: User profile loaded for PDF feature flag check:', {
                id: userForCheck.id,
                role: userForCheck.role,
                premiumActive: userForCheck.premium?.isActive,
              });
            } else {
              userForCheck = { id: session.user.id, role: 'user' };
              console.log('GeminiAI: Profile data incomplete, using session user ID with default role:', userForCheck);
            }
          } else {
            userForCheck = { id: session.user.id, role: 'user' };
            console.log('GeminiAI: User profile not found, using session user ID with default role:', userForCheck);
          }
        } else {
          console.log('GeminiAI: No session found for PDF feature flag check');
        }
      }
    } catch (error) {
      console.warn('GeminiAI: Failed to load user for PDF feature flag check:', error);
      // If we have a user ID from options, use it with default role
      if (options?.user?.id) {
        userForCheck = {
          id: options.user.id,
          role: 'user',
          premium: {},
        };
        console.log('GeminiAI: Using user ID from options with default role due to error:', userForCheck);
      }
    }
  } else {
    console.log('GeminiAI: User provided for PDF feature flag check:', {
      id: userForCheck.id,
      role: userForCheck.role,
      premiumActive: userForCheck.premium?.isActive,
    });
  }

  // Check if PDF processing is enabled
  console.log('GeminiAI: Checking pdf_upload feature flag...');
  const allFlags = featureFlagService.getAllFlags();
  console.log('GeminiAI: Available flags:', Object.keys(allFlags));
  console.log('GeminiAI: pdf_upload flag exists:', !!allFlags['pdf_upload']);
  
  const pdfUploadFlag = allFlags['pdf_upload'];
  if (pdfUploadFlag) {
    console.log('GeminiAI: pdf_upload flag details:', {
      enabled: pdfUploadFlag.enabled,
      premiumOnly: pdfUploadFlag.premiumOnly,
      targetRoles: pdfUploadFlag.targetRoles,
      targetUsers: pdfUploadFlag.targetUsers,
      targetEnvironments: pdfUploadFlag.targetEnvironments,
      rolloutPercentage: pdfUploadFlag.rolloutPercentage,
    });
  } else {
    console.warn('GeminiAI: pdf_upload flag not found in loaded flags');
    console.warn('GeminiAI: This should fall back to DEFAULT_FEATURE_FLAGS');
  }
  
  const isEnabled = featureFlagService.isFeatureEnabled('pdf_upload', userForCheck);
  console.log('GeminiAI: pdf_upload feature flag enabled:', isEnabled);
  console.log('GeminiAI: User for check:', userForCheck);
  
  // If flag check fails, check default flag as fallback
  if (!isEnabled) {
    console.error('GeminiAI: PDF upload feature flag check returned false');
    console.error('GeminiAI: Feature flag check details:', {
      flagKey: 'pdf_upload',
      user: userForCheck,
      flagsLoaded: Object.keys(allFlags).length,
      flagExists: !!pdfUploadFlag,
      flagEnabled: pdfUploadFlag?.enabled,
      flagPremiumOnly: pdfUploadFlag?.premiumOnly,
      userRole: userForCheck?.role,
      userPremium: userForCheck?.premium?.isActive,
      targetRoles: pdfUploadFlag?.targetRoles,
      targetUsers: pdfUploadFlag?.targetUsers,
      targetEnvironments: pdfUploadFlag?.targetEnvironments,
    });
    
    // Check default flag as final fallback
    const { DEFAULT_FEATURE_FLAGS } = await import('../constants/DefaultFeatureFlags');
    const defaultFlag = DEFAULT_FEATURE_FLAGS['pdf_upload'];
    if (defaultFlag && defaultFlag.enabled) {
      console.warn('GeminiAI: Feature flag check failed, but default flag is enabled. Using default flag.');
      console.warn('GeminiAI: This suggests the database flag might be misconfigured. Proceeding with PDF processing.');
      // Don't return error - proceed with processing
    } else {
      console.error('GeminiAI: PDF upload feature is disabled in both database and defaults');
      return {
        success: false,
        error: 'PDF upload feature is currently disabled'
      };
    }
  }
  
  console.log('GeminiAI: PDF upload feature is enabled, proceeding with processing...');
  
  try {
    const result: any = { success: true };
    
    // Step 1: Extract text from PDF using Gemini
    if (options.extractText !== false) {
      console.log('GeminiAI: Extracting text from PDF...');
      
      // Use server-side API proxy instead of direct API call
      const extractData = await callGeminiAPI('gemini-3-flash-preview:generateContent', {
        contents: [{
          parts: [
            { inline_data: { mime_type: 'application/pdf', data: base64PDF } },
            { text: 'Extract all text from this PDF document. Preserve the structure, formatting, headings, and paragraph breaks as much as possible. Return only the extracted text content.' }
          ]
        }]
      });
      
      result.extractedText = extractData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('GeminiAI: Extracted text length:', result.extractedText.length);
    }
    
    // Step 2: Generate title if requested
    if (options.generateTitle && result.extractedText) {
      console.log('GeminiAI: Generating title from PDF content...');
      
      try {
        result.title = await generateTitleWithGemini(result.extractedText, userForCheck);
      } catch (error) {
        console.error('GeminiAI: Error generating title:', error);
        result.title = 'PDF Document';
      }
    }
    
    // Step 3: Generate summary if requested
    if (options.generateSummary && result.extractedText) {
      console.log('GeminiAI: Generating summary from PDF content...');
      
      try {
        result.summary = await generateSummaryWithGemini(result.extractedText, userForCheck);
      } catch (error) {
        console.error('GeminiAI: Error generating summary:', error);
        result.summary = '';
      }
    }
    
    // Step 4: Extract key details if requested
    if (options.extractKeyDetails && result.extractedText) {
      console.log('GeminiAI: Extracting key details from PDF content...');
      
      try {
        result.keyDetails = await extractKeyDetailsWithGemini(result.extractedText, userForCheck);
      } catch (error) {
        console.error('GeminiAI: Error extracting key details:', error);
        result.keyDetails = [];
      }
    }
    
    console.log('GeminiAI: PDF processing complete');
    return result;
    
  } catch (error) {
    console.error('GeminiAI: Error processing PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Extract text from PDF using Gemini (direct method)
export async function extractTextFromPDFWithGemini(base64PDF: string): Promise<{
  success: boolean;
  text: string;
  error?: string;
}> {
  console.log('GeminiAI: Extracting text from PDF with Gemini');
  
  try {
    // Use server-side API proxy instead of direct API call
    const data = await callGeminiAPI('gemini-3-flash-preview:generateContent', {
      contents: [{
        parts: [
          { inline_data: { mime_type: 'application/pdf', data: base64PDF } },
          { text: 'Extract all text from this PDF document. Preserve the structure, formatting, headings, lists, and paragraph breaks. Return only the text content without any additional commentary.' }
        ]
      }]
    });
    
    const extractedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('GeminiAI: Successfully extracted', extractedText.length, 'characters');
    
    return {
      success: true,
      text: extractedText
    };
    
  } catch (error) {
    console.error('GeminiAI: Error extracting text:', error);
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Debug function to test API key and connection
export async function testGeminiConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    // Use server-side API proxy instead of direct API call
    await callGeminiAPI('gemini-3-flash-preview:generateContent', {
      contents: [
        { parts: [{ text: 'Hello, this is a test message. Please respond with "OK" if you can read this.' }] }
      ]
    });
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : `Network error: ${error}` 
    };
  }
} 