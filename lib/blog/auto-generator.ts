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

  const result = JSON.parse(response.choices[0]?.message?.content || '{"topics":[]}');
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

Return JSON:
{
  "title": "Final title (50-60 chars with primary keyword)",
  "meta_description": "Meta description (150-160 chars, actionable)",
  "excerpt": "Preview hook (2-3 sentences)",
  "content": "Full markdown post (1500-2500 words)",
  "seo_keywords": "keyword1, keyword2, keyword3",
  "tags": ["tag1", "tag2", "tag3"],
  "estimated_read_time": 8
}

Structure:
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

  const post = JSON.parse(response.choices[0]?.message?.content || '{}');
  const slug = post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 100);

  return {
    title: post.title,
    slug,
    meta_description: post.meta_description,
    excerpt: post.excerpt,
    content: post.content,
    seo_keywords: post.seo_keywords,
    tags: post.tags || [],
    read_time_minutes: post.estimated_read_time || 8,
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
      author_id, is_published, is_ai_generated, published_at,
      read_time_minutes, xp_reward, seo_keywords, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      postId, post.title, post.slug, post.meta_description,
      post.excerpt, post.content, authorId,
      autoPublish ? 1 : 0, 1, autoPublish ? now : null,
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
