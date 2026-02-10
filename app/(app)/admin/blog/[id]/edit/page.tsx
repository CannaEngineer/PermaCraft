import { requireAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { BlogPostEditor } from '@/components/admin/blog-post-editor';

interface PageProps {
  params: { id: string };
}

export default async function EditBlogPostPage({ params }: PageProps) {
  await requireAdmin();

  // Get blog post
  const postResult = await db.execute({
    sql: `
      SELECT
        bp.*,
        GROUP_CONCAT(bt.name) as tags
      FROM blog_posts bp
      LEFT JOIN blog_post_tags bpt ON bp.id = bpt.blog_post_id
      LEFT JOIN blog_tags bt ON bpt.tag_id = bt.id
      WHERE bp.id = ?
      GROUP BY bp.id
    `,
    args: [params.id],
  });

  if (postResult.rows.length === 0) {
    notFound();
  }

  const post = postResult.rows[0] as any;

  return (
    <div className="container mx-auto py-8">
      <BlogPostEditor
        post={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          metaDescription: post.meta_description || '',
          excerpt: post.excerpt || '',
          content: post.content,
          coverImageUrl: post.cover_image_url || '',
          tags: post.tags ? post.tags.split(',') : [],
          seoKeywords: post.seo_keywords || '',
          readTimeMinutes: post.read_time_minutes,
          xpReward: post.xp_reward,
          isPublished: post.is_published === 1,
        }}
      />
    </div>
  );
}
