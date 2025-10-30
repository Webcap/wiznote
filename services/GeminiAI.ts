
import { featureFlagService } from './FeatureFlagService';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function transcribeAudioWithGemini(base64Audio: string): Promise<string> {
  // Check if AI transcription is enabled
  if (!featureFlagService.isFeatureEnabled('ai_transcription')) {
    throw new Error('AI transcription is currently disabled');
  }
  
  // Check if API key is available
  if (!GEMINI_API_KEY) {
    console.error('GeminiAI: API key not found');
    throw new Error('Gemini API key not configured');
  }
  
  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: 'audio/m4a', data: base64Audio } }
            ]
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('GeminiAI: API request failed:', response.status, errorText);
      throw new Error(`Gemini API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for API errors in response
    if (data.error) {
      console.error('GeminiAI: API error:', data.error);
      throw new Error(`Gemini API error: ${data.error.message || 'Unknown error'}`);
    }
    
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    console.error('GeminiAI: Error transcribing audio:', error);
    throw error;
  }
}

export async function generateTitleWithGemini(transcript: string): Promise<string> {
  console.log('GeminiAI: Starting title generation for transcript:', transcript.substring(0, 100) + '...');
  
  // Check if AI name generating is enabled
  const isEnabled = featureFlagService.isFeatureEnabled('ai_name_generating');
  console.log('GeminiAI: AI name generating enabled:', isEnabled);
  
  if (!isEnabled) {
    throw new Error('AI name generating is currently disabled');
  }
  
  // Check if API key is available
  console.log('GeminiAI: API key available:', !!GEMINI_API_KEY);
  if (!GEMINI_API_KEY) {
    console.error('GeminiAI: API key not found');
    throw new Error('Gemini API key not configured');
  }
  
  try {
    const prompt = `Create a short, descriptive title (3-8 words) for this audio note. Return ONLY the title, nothing else: ${transcript}`;
    console.log('GeminiAI: Making API request to:', GEMINI_API_URL);
    console.log('GeminiAI: Request payload:', { prompt: prompt.substring(0, 100) + '...' });
    
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: prompt }] }
        ]
      })
    });
    
    console.log('GeminiAI: API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('GeminiAI: API request failed:', response.status, errorText);
      throw new Error(`Gemini API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('GeminiAI: API response data:', JSON.stringify(data, null, 2));
    
    // Check for API errors in response
    if (data.error) {
      console.error('GeminiAI: API error:', data.error);
      throw new Error(`Gemini API error: ${data.error.message || 'Unknown error'}`);
    }
    
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

export async function extractKeyDetailsWithGemini(noteText: string): Promise<string[]> {
  // Check if AI key details feature is enabled
  if (!featureFlagService.isFeatureEnabled('ai_key_details')) {
    throw new Error('AI key details are currently disabled');
  }
  
  // Check if API key is available
  if (!GEMINI_API_KEY) {
    console.error('GeminiAI: API key not found');
    throw new Error('Gemini API key not configured');
  }
  
  try {
    const prompt = `Extract the 3-5 most important key details or facts from the following note. Return ONLY the bullet points, with no introduction or explanation.\n\nNote:\n${noteText}`;
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: prompt }] }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('GeminiAI: API request failed:', response.status, errorText);
      throw new Error(`Gemini API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for API errors in response
    if (data.error) {
      console.error('GeminiAI: API error:', data.error);
      throw new Error(`Gemini API error: ${data.error.message || 'Unknown error'}`);
    }
    
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

export async function generateSummaryWithGemini(noteText: string): Promise<string> {
  // Check if AI summaries feature is enabled
  if (!featureFlagService.isFeatureEnabled('ai_summaries')) {
    throw new Error('AI summaries are currently disabled');
  }
  
  // Check if API key is available
  if (!GEMINI_API_KEY) {
    console.error('GeminiAI: API key not found');
    throw new Error('Gemini API key not configured');
  }
  
  try {
    const prompt = `Create a concise, well-written summary of the following note content. The summary should be 2-4 sentences that capture the main points and essence of the note. Return ONLY the summary text, no introduction or formatting.\n\nNote:\n${noteText}`;
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: prompt }] }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('GeminiAI: API request failed:', response.status, errorText);
      throw new Error(`Gemini API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for API errors in response
    if (data.error) {
      console.error('GeminiAI: API error:', data.error);
      throw new Error(`Gemini API error: ${data.error.message || 'Unknown error'}`);
    }
    
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
  }
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
  
  // Check if AI flashcards is enabled
  const isEnabled = featureFlagService.isFeatureEnabled('ai_flashcards');
  console.log('🔮 GeminiAI: AI flashcards enabled:', isEnabled);
  
  if (!isEnabled) {
    console.log('🔮 GeminiAI: AI flashcards feature is disabled');
    throw new Error('AI flashcards is currently disabled');
  }
  
  // Check if API key is available
  console.log('GeminiAI: API key available:', !!GEMINI_API_KEY);
  if (!GEMINI_API_KEY) {
    console.error('GeminiAI: API key not found');
    throw new Error('Gemini API key not configured');
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

    console.log('🔮 GeminiAI: Making API request for flashcard generation');
    console.log('🔮 GeminiAI: API URL:', GEMINI_API_URL);
    console.log('🔮 GeminiAI: Prompt length:', prompt.length);
    
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: prompt }] }
        ]
      })
    });
    
    console.log('🔮 GeminiAI: API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('GeminiAI: API request failed:', response.status, errorText);
      throw new Error(`Gemini API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('GeminiAI: API response data:', JSON.stringify(data, null, 2));
    
    // Check for API errors in response
    if (data.error) {
      console.error('GeminiAI: API error:', data.error);
      throw new Error(`Gemini API error: ${data.error.message || 'Unknown error'}`);
    }
    
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
  
  // Check if PDF processing is enabled
  if (!featureFlagService.isFeatureEnabled('pdf_upload')) {
    console.log('GeminiAI: PDF upload feature is disabled');
    return {
      success: false,
      error: 'PDF upload feature is currently disabled'
    };
  }
  
  // Check if API key is available
  if (!GEMINI_API_KEY) {
    console.error('GeminiAI: API key not found');
    return {
      success: false,
      error: 'Gemini API key not configured'
    };
  }
  
  try {
    const result: any = { success: true };
    
    // Step 1: Extract text from PDF using Gemini
    if (options.extractText !== false) {
      console.log('GeminiAI: Extracting text from PDF...');
      
      const extractResponse = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: 'application/pdf', data: base64PDF } },
              { text: 'Extract all text from this PDF document. Preserve the structure, formatting, headings, and paragraph breaks as much as possible. Return only the extracted text content.' }
            ]
          }]
        })
      });
      
      if (!extractResponse.ok) {
        const errorText = await extractResponse.text();
        console.error('GeminiAI: PDF text extraction failed:', extractResponse.status, errorText);
        throw new Error(`PDF text extraction failed: ${extractResponse.status}`);
      }
      
      const extractData = await extractResponse.json();
      
      if (extractData.error) {
        console.error('GeminiAI: API error during text extraction:', extractData.error);
        throw new Error(`Gemini API error: ${extractData.error.message || 'Unknown error'}`);
      }
      
      result.extractedText = extractData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('GeminiAI: Extracted text length:', result.extractedText.length);
    }
    
    // Step 2: Generate title if requested
    if (options.generateTitle && result.extractedText) {
      console.log('GeminiAI: Generating title from PDF content...');
      
      try {
        result.title = await generateTitleWithGemini(result.extractedText);
      } catch (error) {
        console.error('GeminiAI: Error generating title:', error);
        result.title = 'PDF Document';
      }
    }
    
    // Step 3: Generate summary if requested
    if (options.generateSummary && result.extractedText) {
      console.log('GeminiAI: Generating summary from PDF content...');
      
      try {
        result.summary = await generateSummaryWithGemini(result.extractedText);
      } catch (error) {
        console.error('GeminiAI: Error generating summary:', error);
        result.summary = '';
      }
    }
    
    // Step 4: Extract key details if requested
    if (options.extractKeyDetails && result.extractedText) {
      console.log('GeminiAI: Extracting key details from PDF content...');
      
      try {
        result.keyDetails = await extractKeyDetailsWithGemini(result.extractedText);
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
  
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      text: '',
      error: 'Gemini API key not configured'
    };
  }
  
  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'application/pdf', data: base64PDF } },
            { text: 'Extract all text from this PDF document. Preserve the structure, formatting, headings, lists, and paragraph breaks. Return only the text content without any additional commentary.' }
          ]
        }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('GeminiAI: Text extraction failed:', response.status, errorText);
      return {
        success: false,
        text: '',
        error: `Text extraction failed: ${response.status}`
      };
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.error('GeminiAI: API error:', data.error);
      return {
        success: false,
        text: '',
        error: data.error.message || 'Unknown error'
      };
    }
    
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
  if (!GEMINI_API_KEY) {
    return { success: false, error: 'API key not configured' };
  }
  
  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: 'Hello, this is a test message. Please respond with "OK" if you can read this.' }] }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
    
    const data = await response.json();
    
    if (data.error) {
      return { success: false, error: `API Error: ${data.error.message || 'Unknown error'}` };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: `Network error: ${error}` };
  }
} 