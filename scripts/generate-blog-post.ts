import 'dotenv/config';
import { generateBlogPost_Auto } from '../lib/blog/auto-generator';
import { db } from '../lib/db';

async function main() {
  console.log('🚀 Starting blog post generation...\n');

  // Get first admin user
  const adminResult = await db.execute({
    sql: 'SELECT id, email FROM users WHERE is_admin = 1 LIMIT 1',
    args: [],
  });

  if (adminResult.rows.length === 0) {
    console.error('❌ No admin user found');
    process.exit(1);
  }

  const admin = adminResult.rows[0] as any;
  console.log(`📝 Generating post as: ${admin.email}\n`);

  try {
    const postId = await generateBlogPost_Auto(admin.id, true);

    // Get the generated post
    const postResult = await db.execute({
      sql: 'SELECT title, slug, excerpt FROM blog_posts WHERE id = ?',
      args: [postId],
    });

    const post = postResult.rows[0] as any;

    console.log('\n✅ Blog post generated successfully!\n');
    console.log(`Title: ${post.title}`);
    console.log(`Slug: ${post.slug}`);
    console.log(`URL: /learn/blog/${post.slug}`);
    console.log(`\nExcerpt:\n${post.excerpt}`);

  } catch (error: any) {
    console.error('\n❌ Generation failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
