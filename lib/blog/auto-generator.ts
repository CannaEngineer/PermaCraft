import OpenAI from 'openai';
import { db } from '@/lib/db';

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://permaculture.studio',
    'X-Title': 'PermaCraft',
  },
});

// Use Claude 3.5 Sonnet for reliable generation
const PREMIUM_MODEL = 'anthropic/claude-3.5-sonnet';
const IMAGE_MODEL = 'google/gemini-2.5-flash-image';

/**
 * Safely parse JSON that might contain control characters
 */
function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    // First, try direct parse
    return JSON.parse(jsonString);
  } catch (firstError) {
    try {
      // If that fails, try to fix common issues
      // Replace literal newlines with escaped newlines in string values
      const cleaned = jsonString
        .replace(/(\r\n|\n|\r)/g, '\\n')  // Escape newlines
        .replace(/\t/g, '\\t')             // Escape tabs
        .replace(/\\/g, '\\\\')            // Double escape backslashes
        .replace(/\\\\n/g, '\\n')          // Fix double-escaped newlines
        .replace(/\\\\t/g, '\\t');         // Fix double-escaped tabs

      return JSON.parse(cleaned);
    } catch (secondError) {
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
  title: string;
  keywords: string[];
  target_audience: string;
  seo_angle: string;
  why_trending: string;
}

/**
 * Discover trending permaculture topics
 */
export async function discoverTrendingTopics(): Promise<TopicIdea[]> {
  console.log('🔍 Discovering trending topics...');

  const prompt = `You are a permaculture content strategist for a leading education platform.

Identify 5 valuable blog topics for permaculture learners. Consider:
- Current season: ${new Date().toLocaleDateString('en-US', { month: 'long' })}
- Sustainable living trends
- Common beginner questions
- Advanced techniques
- Urban/rural applications
- Climate relevance

IMPORTANT: Return valid JSON with no line breaks within string values. Use spaces instead of newlines.

Return JSON:
{
  "topics": [
    {
      "title": "SEO-optimized title (50-60 chars)",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "target_audience": "beginners|intermediate|advanced",
      "seo_angle": "Why this ranks well",
      "why_trending": "Timely relevance"
    }
  ]
}`;

  const response = await openrouter.chat.completions.create({
    model: PREMIUM_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.8,
  });

  const content = response.choices[0]?.message?.content || '{"topics":[]}';
  const result = safeJsonParse(content, { topics: [] });

  if (!result.topics || result.topics.length === 0) {
    throw new Error('AI failed to generate topics');
  }

  return result.topics;
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
    model: PREMIUM_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.8,
    max_tokens: 300,
  });

  const content = response.choices[0]?.message?.content || '{"prompt":""}';
  const result = safeJsonParse(content, { prompt: '' });

  return result.prompt || `A vibrant permaculture garden scene related to ${title}`;
}

/**
 * Generate cover image for blog post
 */
async function generateCoverImage(imagePrompt: string): Promise<string | null> {
  console.log('🖼️ Generating cover image...');

  try {
    const response = await openrouter.chat.completions.create({
      model: IMAGE_MODEL,
      messages: [{ role: 'user', content: imagePrompt }],
      max_tokens: 1024,
    });

    // OpenRouter image models may return URL or base64
    const content = response.choices[0]?.message?.content;

    // Check if it's a URL
    if (content && (content.startsWith('http://') || content.startsWith('https://'))) {
      return content;
    }

    // Check if response has image URL in metadata
    if (response.choices[0]?.message) {
      const message = response.choices[0].message as any;
      if (message.image_url) return message.image_url;
      if (message.url) return message.url;
    }

    console.warn('No image URL found in response');
    return null;
  } catch (error: any) {
    console.error('Image generation failed:', error.message);
    // Don't fail the whole blog post if image generation fails
    return null;
  }
}

/**
 * Generate complete SEO-optimized blog post
 */
export async function generateBlogPost(topic: TopicIdea): Promise<BlogPost> {
  console.log(`📝 Generating: ${topic.title}`);

  const prompt = `Create an exceptional, SEO-optimized permaculture blog post:

**Topic:** ${topic.title}
**Keywords:** ${topic.keywords.join(', ')}
**Audience:** ${topic.target_audience}

IMPORTANT: Return valid JSON. In the "content" field, use \\n for line breaks in the markdown.

Return JSON:
{
  "title": "Final title (50-60 chars with primary keyword)",
  "meta_description": "Meta description (150-160 chars, actionable)",
  "excerpt": "Preview hook (2-3 sentences)",
  "content": "Full markdown post (1500-2500 words) with proper \\n escaping",
  "seo_keywords": "keyword1, keyword2, keyword3",
  "tags": ["tag1", "tag2", "tag3"],
  "estimated_read_time": 8
}

Content Structure:
1. Hook introduction (relatable scenario)
2. Main sections with ## headers
3. Practical examples and steps
4. Key takeaways (bullets)
5. Conclusion with CTA

SEO: Keywords in first 100 words, natural distribution, short paragraphs.
Include scientific plant names and references to permaculture principles.`;

  const response = await openrouter.chat.completions.create({
    model: PREMIUM_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 8000,
  });

  const content = response.choices[0]?.message?.content || '{}';
  const post = safeJsonParse(content, {
    title: topic.title,
    meta_description: '',
    excerpt: '',
    content: '',
    seo_keywords: '',
    tags: [],
    estimated_read_time: 8,
  });

  if (!post.title || !post.content) {
    throw new Error('AI failed to generate complete blog post');
  }

  const slug = post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 100);

  // Generate cover image
  let coverImageUrl: string | null = null;
  try {
    const imagePrompt = await generateImagePrompt(post.title, topic.keywords);
    coverImageUrl = await generateCoverImage(imagePrompt);
  } catch (error) {
    console.error('Cover image generation failed, continuing without image:', error);
  }

  return {
    title: post.title,
    slug,
    meta_description: post.meta_description,
    excerpt: post.excerpt,
    content: post.content,
    seo_keywords: post.seo_keywords,
    tags: post.tags || [],
    read_time_minutes: post.estimated_read_time || 8,
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
 * Main workflow - generates one optimized post
 */
export async function generateBlogPost_Auto(
  adminUserId: string,
  autoPublish = false
): Promise<string> {
  console.log('\n🤖 Auto-generating blog post...\n');
  
  const topics = await discoverTrendingTopics();
  const post = await generateBlogPost(topics[0]);
  const postId = await saveBlogPost(post, adminUserId, autoPublish);
  
  console.log('\n✅ Complete!\n');
  return postId;
}
