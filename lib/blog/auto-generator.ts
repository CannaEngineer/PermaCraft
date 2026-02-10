import OpenAI from 'openai';
import { db } from '@/lib/db';
import { uploadImageFromUrl } from '@/lib/storage/r2';

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://permaculture.studio',
    'X-Title': 'PermaCraft',
  },
});

import {
  getBlogTextModel,
  getBlogImagePromptModel,
  getBlogImageGenerationModel,
} from '@/lib/ai/model-settings';

/**
 * Safely parse JSON that might contain control characters
 */
function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    // First, try direct parse
    return JSON.parse(jsonString);
  } catch (firstError) {
    try {
      // More aggressive cleaning for malformed JSON
      let cleaned = jsonString;

      // Find all string values and escape newlines within them
      // Use [\s\S] instead of . with s flag for compatibility
      cleaned = cleaned.replace(/"([\s\S]*?)"/g, (match, content) => {
        const escaped = content
          .replace(/\\/g, '\\\\')           // Escape backslashes first
          .replace(/\n/g, '\\n')            // Escape newlines
          .replace(/\r/g, '\\r')            // Escape carriage returns
          .replace(/\t/g, '\\t')            // Escape tabs
          .replace(/"/g, '\\"');            // Escape quotes
        return `"${escaped}"`;
      });

      return JSON.parse(cleaned);
    } catch (secondError) {
      // Last resort: try to extract JSON object manually
      try {
        // Find the JSON object boundaries
        const start = jsonString.indexOf('{');
        const end = jsonString.lastIndexOf('}') + 1;
        if (start >= 0 && end > start) {
          const extracted = jsonString.substring(start, end);
          // Remove all literal newlines and tabs
          const minimal = extracted
            .replace(/\r?\n/g, ' ')
            .replace(/\t/g, ' ')
            .replace(/\s+/g, ' ');
          return JSON.parse(minimal);
        }
      } catch (thirdError) {
        // Give up
      }

      console.error('JSON parsing failed:', {
        original: jsonString.substring(0, 500),
        firstError: (firstError as Error).message,
        secondError: (secondError as Error).message,
      });
      return fallback;
    }
  }
}

interface TopicIdea {
  id?: string;
  title: string;
  keywords: string[];
  target_audience: string;
  seo_angle: string;
  why_trending: string;
  priority?: number;
}

/**
 * Get context of existing blog posts (titles only for efficiency)
 */
async function getExistingBlogContext(): Promise<string> {
  const result = await db.execute({
    sql: `SELECT title, excerpt FROM blog_posts
          WHERE is_published = 1
          ORDER BY created_at DESC
          LIMIT 20`,
    args: [],
  });

  if (result.rows.length === 0) {
    return 'No existing blog posts.';
  }

  const posts = result.rows as any[];
  return posts.map((p, i) => `${i + 1}. "${p.title}"`).join('\n');
}

/**
 * Get number of pending topics in queue
 */
async function getQueueSize(): Promise<number> {
  const result = await db.execute({
    sql: `SELECT COUNT(*) as count FROM blog_topic_queue WHERE status = 'pending'`,
    args: [],
  });
  return (result.rows[0] as any).count;
}

/**
 * Get next topic from queue
 */
async function getNextTopicFromQueue(): Promise<TopicIdea | null> {
  const result = await db.execute({
    sql: `SELECT * FROM blog_topic_queue
          WHERE status = 'pending'
          ORDER BY priority DESC, created_at ASC
          LIMIT 1`,
    args: [],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as any;
  return {
    id: row.id,
    title: row.title,
    keywords: JSON.parse(row.keywords),
    target_audience: row.target_audience,
    seo_angle: row.seo_angle,
    why_trending: row.why_trending,
    priority: row.priority,
  };
}

/**
 * Mark topic as used
 */
async function markTopicAsUsed(topicId: string, postId: string): Promise<void> {
  await db.execute({
    sql: `UPDATE blog_topic_queue
          SET status = 'used', used_at = unixepoch(), used_by_post_id = ?
          WHERE id = ?`,
    args: [postId, topicId],
  });
}

/**
 * Save topics to queue
 */
async function saveTopicsToQueue(topics: TopicIdea[]): Promise<void> {
  for (const topic of topics) {
    const topicId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO blog_topic_queue (
        id, title, keywords, target_audience, seo_angle, why_trending, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        topicId,
        topic.title,
        JSON.stringify(topic.keywords),
        topic.target_audience,
        topic.seo_angle,
        topic.why_trending,
        topic.priority || 0,
      ],
    });
  }
  console.log(`✅ Added ${topics.length} topics to queue`);
}

/**
 * Default fallback topics if AI fails
 */
const FALLBACK_TOPICS: TopicIdea[] = [
  {
    title: 'Getting Started with Permaculture Design Principles',
    keywords: ['permaculture', 'design principles', 'sustainable gardening'],
    target_audience: 'beginners',
    seo_angle: 'High-volume beginner search terms',
    why_trending: 'Evergreen permaculture basics',
  },
  {
    title: 'Building Healthy Soil: Composting Essentials',
    keywords: ['composting', 'soil health', 'organic matter'],
    target_audience: 'beginners',
    seo_angle: 'Popular gardening topic',
    why_trending: 'Year-round soil building interest',
  },
  {
    title: 'Water Management in Permaculture Gardens',
    keywords: ['water harvesting', 'irrigation', 'drought resilience'],
    target_audience: 'intermediate',
    seo_angle: 'Climate-relevant search terms',
    why_trending: 'Water conservation increasing priority',
  },
];

/**
 * Replenish topic queue with new AI-discovered topics
 */
export async function replenishTopicQueue(): Promise<void> {
  console.log('🔍 Replenishing topic queue...');

  // Get model for blog text generation
  const textModel = await getBlogTextModel();

  // Get existing blog context
  const existingPosts = await getExistingBlogContext();

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });
  const currentSeason = ['December', 'January', 'February'].includes(currentMonth) ? 'Winter' :
                        ['March', 'April', 'May'].includes(currentMonth) ? 'Spring' :
                        ['June', 'July', 'August'].includes(currentMonth) ? 'Summer' : 'Fall';

  const prompt = `You are a content strategist for PermaCraft, an AI-powered permaculture design platform.

ABOUT PERMACRAFT:
- Map-based permaculture planning tool for small farmers, homesteaders, and permaculture students
- Users design farms by drawing zones and plantings on interactive maps
- AI analyzes screenshots and provides permaculture design recommendations
- Emphasizes NATIVE species and permaculture principles
- Target audience: beginners to intermediate permaculture practitioners

GENERATE 15 BLOG TOPICS that help PermaCraft users succeed with their designs:

CONSIDER:
- Current season: ${currentSeason} (${currentMonth})
- Seasonal tasks and planting schedules
- Zone-based design (Zones 0-5)
- Map-based planning and design techniques
- Native species selection by region
- Permaculture principles (observation, stacking functions, edge effects, succession)
- Common beginner mistakes and solutions
- Soil building, water management, companion planting
- Urban/suburban small-scale applications
- Climate adaptation and resilience

EXISTING BLOG POSTS (avoid duplicates):
${existingPosts}

REQUIREMENTS:
- Choose NEW topics that fill gaps in existing content
- Mix of beginner (60%), intermediate (30%), advanced (10%)
- Include actionable, practical advice
- Focus on design and planning (our users are in the planning phase)
- Incorporate map/zone thinking where relevant
- SEO-optimized titles with target keywords
- Return valid JSON with no line breaks in strings

Return JSON:
{
  "topics": [
    {
      "title": "SEO title with keyword (50-60 chars)",
      "keywords": ["primary keyword", "secondary", "tertiary"],
      "target_audience": "beginners|intermediate|advanced",
      "seo_angle": "Search volume/ranking opportunity",
      "why_trending": "Seasonal relevance or evergreen value",
      "priority": 0-10 (higher = more timely/important)
    }
  ]
}`;

  try {
    const response = await openrouter.chat.completions.create({
      model: textModel,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content || '{"topics":[]}';
    const result = safeJsonParse(content, { topics: [] });

    if (!result.topics || result.topics.length === 0) {
      console.warn('⚠️ AI returned empty topics, using fallbacks');
      await saveTopicsToQueue(FALLBACK_TOPICS);
      return;
    }

    console.log(`✅ Discovered ${result.topics.length} new topics`);
    await saveTopicsToQueue(result.topics);
  } catch (error: any) {
    console.error('❌ Topic discovery failed:', error.message);
    console.log('📋 Using fallback topics');
    await saveTopicsToQueue(FALLBACK_TOPICS);
  }
}

interface BlogPost {
  title: string;
  slug: string;
  meta_description: string;
  excerpt: string;
  content: string;
  seo_keywords: string;
  tags: string[];
  read_time_minutes: number;
  cover_image_url?: string;
}

/**
 * Generate image prompt for blog post
 */
async function generateImagePrompt(title: string, keywords: string[]): Promise<string> {
  console.log('🎨 Generating image prompt...');

  // Fallback prompt in case AI fails
  const fallbackPrompt = `A vibrant, photorealistic permaculture garden scene featuring ${keywords.join(', ')}. Lush green plants, sustainable design elements, natural lighting, professional garden photography style.`;

  try {
    // Get model for image prompt generation
    const promptModel = await getBlogImagePromptModel();

    const prompt = `Create a detailed image generation prompt for a permaculture blog post cover image.

Blog title: "${title}"
Keywords: ${keywords.join(', ')}

Requirements:
- Photorealistic or artistic illustration style
- Vibrant, professional, educational
- Shows permaculture concepts visually
- No text or words in the image
- Suitable for a blog header (landscape orientation)

Return JSON:
{
  "prompt": "Detailed image generation prompt (2-3 sentences)"
}`;

    const response = await openrouter.chat.completions.create({
      model: promptModel,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content || '{"prompt":""}';
    const result = safeJsonParse(content, { prompt: '' });

    return result.prompt || fallbackPrompt;
  } catch (error: any) {
    console.error('⚠️ Image prompt generation failed:', error.message);
    console.log('📋 Using fallback image prompt');
    return fallbackPrompt;
  }
}

/**
 * Generate cover image for blog post
 * OpenRouter uses chat/completions with modalities, not a separate images endpoint
 */
async function generateCoverImage(imagePrompt: string): Promise<string | null> {
  // Get model for image generation
  const imageModel = await getBlogImageGenerationModel();

  console.log(`🖼️ Generating cover image with ${imageModel}...`);

  try {
    // OpenRouter uses chat/completions with modalities for image generation
    // See: https://openrouter.ai/docs/guides/overview/multimodal/image-generation
    const response = await openrouter.chat.completions.create({
      model: imageModel,
      messages: [
        {
          role: 'user',
          content: imagePrompt,
        },
      ],
      // @ts-ignore - modalities is supported by OpenRouter but not in OpenAI types
      modalities: ['image', 'text'],
      temperature: 0.8,
    });

    console.log('📦 Image API response structure:', {
      choices: response.choices?.length,
      message: response.choices?.[0]?.message,
      content: typeof response.choices?.[0]?.message?.content,
    });

    // Extract image URL from response
    // OpenRouter/Gemini returns images in message.images array
    const message = response.choices?.[0]?.message as any;
    let tempImageUrl: string | null = null;

    // Check for images array (Gemini format)
    if (message?.images && Array.isArray(message.images)) {
      const firstImage = message.images[0];
      if (firstImage?.image_url?.url) {
        tempImageUrl = firstImage.image_url.url;
      }
    }

    // Fallback: Check for image URL in content (can be string or array)
    if (!tempImageUrl && typeof message?.content === 'string') {
      // Sometimes returned as markdown image: ![image](url)
      const markdownMatch = message.content.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
      if (markdownMatch) {
        tempImageUrl = markdownMatch[1];
      } else if (message.content.startsWith('http')) {
        tempImageUrl = message.content;
      }
    } else if (!tempImageUrl && message?.content && typeof message.content === 'object') {
      // Content can be array of parts with image_url (OpenRouter multimodal response)
      const contentParts = message.content as any;
      if (Array.isArray(contentParts)) {
        for (const part of contentParts) {
          if (part.type === 'image_url' && part.image_url?.url) {
            tempImageUrl = part.image_url.url;
            break;
          }
        }
      }
    }

    // Check for custom image field (OpenRouter may add this)
    if (!tempImageUrl && message?.image_url) {
      tempImageUrl = message.image_url;
    }

    if (!tempImageUrl) {
      console.log('⚠️ No image URL found in response');
      console.log('Full response:', JSON.stringify(response).substring(0, 500));
      return null;
    }

    console.log('✅ Image generated successfully');

    // Upload to R2 for permanent storage
    try {
      console.log('📥 Uploading image to R2...');

      // Handle base64 data URLs (Gemini returns these)
      if (tempImageUrl.startsWith('data:')) {
        console.log('Converting base64 data URL to buffer...');
        // Use uploadScreenshot which handles base64 data URLs
        const { uploadScreenshot } = await import('@/lib/storage/r2');
        const permanentUrl = await uploadScreenshot(
          'blog-covers',
          tempImageUrl,
          'cover'
        );
        console.log('✅ Image permanently stored:', permanentUrl.substring(0, 100));
        return permanentUrl;
      } else {
        // Handle regular HTTP URLs
        const permanentUrl = await uploadImageFromUrl(
          tempImageUrl,
          'blog-covers',
          'cover.png'
        );
        console.log('✅ Image permanently stored:', permanentUrl.substring(0, 100));
        return permanentUrl;
      }
    } catch (uploadError: any) {
      console.error('Failed to upload to R2:', uploadError.message);
      // Return data URL as fallback (will be stored in database)
      return tempImageUrl;
    }
  } catch (error: any) {
    console.error('❌ Image generation failed:', error.message);
    if (error.response) {
      console.error('Error response:', JSON.stringify(error.response).substring(0, 500));
    }
    // Don't fail the whole blog post if image generation fails
    return null;
  }
}

/**
 * Generate a basic fallback blog post if AI fails
 */
function generateFallbackPost(topic: TopicIdea): BlogPost {
  const slug = topic.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 100);

  return {
    title: topic.title,
    slug,
    meta_description: `Learn about ${topic.keywords.join(', ')} in permaculture. A comprehensive guide for ${topic.target_audience}.`,
    excerpt: `An introduction to ${topic.title.toLowerCase()} and how it applies to permaculture design.`,
    content: `# ${topic.title}\n\nThis topic covers important aspects of ${topic.keywords.join(', ')}.\n\n## Overview\n\nPermaculture emphasizes sustainable and regenerative practices. This article explores how these principles apply to this topic.\n\n## Key Takeaways\n\n- Understanding ${topic.keywords[0]}\n- Practical applications\n- Getting started tips\n\n## Conclusion\n\nImplementing these practices can significantly improve your permaculture system.`,
    seo_keywords: topic.keywords.join(', '),
    tags: topic.keywords.slice(0, 3),
    read_time_minutes: 5,
  };
}

/**
 * Generate complete SEO-optimized blog post
 */
export async function generateBlogPost(topic: TopicIdea): Promise<BlogPost> {
  console.log(`📝 Generating: ${topic.title}`);

  let post: any;
  let slug: string;

  // Try to generate content with AI
  try {
    // Get model for blog text generation
    const textModel = await getBlogTextModel();

  const prompt = `Write an exceptional blog post for PermaCraft, an AI-powered permaculture design platform.

**Topic:** ${topic.title}
**Keywords:** ${topic.keywords.join(', ')}
**Target Audience:** ${topic.target_audience}

ABOUT PERMACRAFT & READERS:
- Users design permaculture farms on interactive maps
- Planning stage (not yet implementing)
- Want practical, actionable design advice
- Mix of small farmers, homesteaders, suburban gardeners
- Value native species and permaculture ethics

CONTENT REQUIREMENTS:

Structure (1800-2500 words):
1. **Hook** (150 words): Relatable scenario/problem this topic solves
2. **What/Why** (200 words): Core concept and importance
3. **How-To Sections** (1200+ words): 3-5 practical sections with ## headers
   - Include zone-based thinking where relevant
   - Reference map planning ("when placing this on your map...")
   - Emphasize native species when discussing plants
   - Connect to permaculture principles explicitly
4. **Design Tips for PermaCraft** (200 words): How to apply using map tools
5. **Key Takeaways** (150 words): Bullet list of main points
6. **Next Steps** (100 words): Clear action items

SEO Optimization:
- Primary keyword in first 50 words
- H2 headers include keywords naturally
- Short paragraphs (2-3 sentences max)
- Use lists and subheadings
- Include scientific names for plants (Genus species)
- Internal topic suggestions (topics for linking)

Tone:
- Friendly, encouraging, practical
- Not preachy or academic
- Celebrate small-scale and beginner efforts
- "You" language (direct address)

IMPORTANT: Return valid JSON. Use \\n for line breaks in markdown content.

Return JSON:
{
  "title": "SEO title with primary keyword (50-60 chars)",
  "meta_description": "Actionable description with benefit (150-160 chars)",
  "excerpt": "Compelling 2-3 sentence preview with hook",
  "content": "Full markdown content (1800-2500 words) with \\n line breaks",
  "seo_keywords": "primary keyword, secondary, tertiary, long-tail",
  "tags": ["tag1", "tag2", "tag3"],
  "estimated_read_time": 8
}`;

    const response = await openrouter.chat.completions.create({
      model: textModel,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 8000,
    });

    const content = response.choices[0]?.message?.content || '{}';
    post = safeJsonParse(content, {
      title: topic.title,
      meta_description: '',
      excerpt: '',
      content: '',
      seo_keywords: '',
      tags: [],
      estimated_read_time: 8,
    });

    if (!post.title || !post.content) {
      console.warn('⚠️ AI generated incomplete post, using fallback');
      post = generateFallbackPost(topic);
    }

    slug = post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 100);
    console.log('✅ Blog content generated');
  } catch (error: any) {
    console.error('❌ Blog generation failed:', error.message);
    console.log('📋 Using fallback post content');
    post = generateFallbackPost(topic);
    slug = post.slug;
  }

  // Generate cover image (non-blocking)
  let coverImageUrl: string | null = null;
  try {
    console.log('🎨 Attempting to generate cover image...');
    const imagePrompt = await generateImagePrompt(post.title, topic.keywords);
    coverImageUrl = await generateCoverImage(imagePrompt);

    if (coverImageUrl) {
      console.log('✅ Cover image generated successfully');
    } else {
      console.log('⚠️ No cover image generated, continuing without');
    }
  } catch (error: any) {
    console.error('⚠️ Cover image generation failed:', error.message);
    console.log('📝 Continuing without cover image');
    // Don't fail the whole post if image generation fails
  }

  return {
    title: post.title,
    slug,
    meta_description: post.meta_description || `Learn about ${topic.title}`,
    excerpt: post.excerpt || `An introduction to ${topic.title}`,
    content: post.content,
    seo_keywords: post.seo_keywords || topic.keywords.join(', '),
    tags: post.tags || topic.keywords.slice(0, 3),
    read_time_minutes: post.estimated_read_time || post.read_time_minutes || 8,
    cover_image_url: coverImageUrl || undefined,
  };
}

/**
 * Save blog post to database
 */
export async function saveBlogPost(
  post: BlogPost,
  authorId: string,
  autoPublish = false
): Promise<string> {
  const postId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db.execute({
    sql: `INSERT INTO blog_posts (
      id, title, slug, meta_description, excerpt, content,
      cover_image_url, author_id, is_published, is_ai_generated,
      published_at, read_time_minutes, xp_reward, seo_keywords, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      postId, post.title, post.slug, post.meta_description,
      post.excerpt, post.content, post.cover_image_url || null,
      authorId, autoPublish ? 1 : 0, 1, autoPublish ? now : null,
      post.read_time_minutes, 15, post.seo_keywords, now,
    ],
  });

  // Add tags
  for (const tagName of post.tags) {
    const tagSlug = tagName.toLowerCase().replace(/\s+/g, '-');
    
    let tagResult = await db.execute({
      sql: 'SELECT id FROM blog_tags WHERE slug = ?',
      args: [tagSlug],
    });

    let tagId: string;
    if (tagResult.rows.length === 0) {
      tagId = crypto.randomUUID();
      await db.execute({
        sql: 'INSERT INTO blog_tags (id, name, slug) VALUES (?, ?, ?)',
        args: [tagId, tagName, tagSlug],
      });
    } else {
      tagId = (tagResult.rows[0] as any).id;
    }

    await db.execute({
      sql: 'INSERT OR IGNORE INTO blog_post_tags (blog_post_id, tag_id) VALUES (?, ?)',
      args: [postId, tagId],
    });
  }

  return postId;
}

/**
 * Main workflow - generates one optimized post from topic queue
 * NEVER throws - returns post ID or throws only on critical database errors
 */
export async function generateBlogPost_Auto(
  adminUserId: string,
  autoPublish = false
): Promise<string> {
  console.log('\n🤖 Auto-generating blog post...\n');

  try {
    // Check queue size and replenish if needed
    const queueSize = await getQueueSize();
    console.log(`📊 Topic queue: ${queueSize} topics available`);

    if (queueSize < 3) {
      console.log('⚠️ Queue running low, replenishing...');
      await replenishTopicQueue();
    }

    // Get next topic from queue
    let topic = await getNextTopicFromQueue();

    // If queue is completely empty (shouldn't happen but fallback)
    if (!topic) {
      console.warn('⚠️ No topics in queue, replenishing now...');
      await replenishTopicQueue();
      topic = await getNextTopicFromQueue();

      // Ultimate fallback
      if (!topic) {
        console.warn('⚠️ Still no topics, using hardcoded fallback');
        topic = FALLBACK_TOPICS[0];
      }
    }

    console.log(`📝 Selected topic: ${topic.title}`);

    // Post generation (has internal fallbacks)
    const post = await generateBlogPost(topic);

    // Save to database (only critical failure point)
    const postId = await saveBlogPost(post, adminUserId, autoPublish);

    // Mark topic as used
    if (topic.id) {
      await markTopicAsUsed(topic.id, postId);
      console.log('✅ Topic marked as used');
    }

    console.log('\n✅ Complete!\n');
    return postId;
  } catch (error: any) {
    console.error('❌ Critical error in blog auto-generation:', error.message);
    console.error('Stack:', error.stack);

    // Last resort: generate minimal fallback post and save it
    console.log('🆘 Creating emergency fallback post...');
    try {
      const emergencyPost = generateFallbackPost(FALLBACK_TOPICS[0]);
      const postId = await saveBlogPost(emergencyPost, adminUserId, autoPublish);
      console.log('✅ Emergency fallback post saved');
      return postId;
    } catch (fallbackError: any) {
      console.error('💥 Complete failure - even fallback failed:', fallbackError.message);
      throw new Error('Blog generation system completely failed. Check database connection.');
    }
  }
}
