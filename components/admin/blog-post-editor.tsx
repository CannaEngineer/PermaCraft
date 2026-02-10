'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Eye, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  metaDescription: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  tags: string[];
  seoKeywords: string;
  readTimeMinutes: number;
  xpReward: number;
  isPublished: boolean;
}

interface BlogPostEditorProps {
  post: BlogPost;
}

export function BlogPostEditor({ post }: BlogPostEditorProps) {
  const router = useRouter();
  const [formData, setFormData] = useState(post);
  const [isSaving, setIsSaving] = useState(false);
  const [tagInput, setTagInput] = useState(post.tags.join(', '));

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/blog/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug,
          metaDescription: formData.metaDescription,
          excerpt: formData.excerpt,
          content: formData.content,
          coverImageUrl: formData.coverImageUrl || null,
          tags: tagInput.split(',').map(t => t.trim()).filter(Boolean),
          seoKeywords: formData.seoKeywords,
          readTimeMinutes: formData.readTimeMinutes,
          xpReward: formData.xpReward,
          isPublished: formData.isPublished,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save post');
      }

      toast.success('Blog post saved successfully!');
      router.push('/admin/blog');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save post');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/blog">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Edit Blog Post</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/learn/blog/${post.slug}`} target="_blank">
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Cover Image */}
          <Card>
            <CardHeader>
              <CardTitle>Cover Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.coverImageUrl && (
                <div className="relative w-full h-64 rounded-lg overflow-hidden border">
                  <img
                    src={formData.coverImageUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => setFormData({ ...formData, coverImageUrl: '' })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div>
                <Label>Image URL</Label>
                <Input
                  value={formData.coverImageUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, coverImageUrl: e.target.value })
                  }
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste an image URL or leave empty for no cover image
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Blog post title"
                />
              </div>

              <div>
                <Label>Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="url-friendly-slug"
                />
              </div>

              <div>
                <Label>Meta Description (SEO)</Label>
                <Textarea
                  value={formData.metaDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, metaDescription: e.target.value })
                  }
                  placeholder="150-160 character description for search engines"
                  rows={2}
                />
              </div>

              <div>
                <Label>Excerpt</Label>
                <Textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Brief preview (2-3 sentences)"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>Content (Markdown)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Full blog post content in markdown..."
                rows={20}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Status */}
          <Card>
            <CardHeader>
              <CardTitle>Publish</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="published">Published</Label>
                <Switch
                  id="published"
                  checked={formData.isPublished}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isPublished: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle>SEO & Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="permaculture, gardening, water"
                />
              </div>

              <div>
                <Label>SEO Keywords</Label>
                <Input
                  value={formData.seoKeywords}
                  onChange={(e) =>
                    setFormData({ ...formData, seoKeywords: e.target.value })
                  }
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Read Time (minutes)</Label>
                <Input
                  type="number"
                  value={formData.readTimeMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      readTimeMinutes: parseInt(e.target.value) || 5,
                    })
                  }
                  min={1}
                  max={60}
                />
              </div>

              <div>
                <Label>XP Reward</Label>
                <Input
                  type="number"
                  value={formData.xpReward}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      xpReward: parseInt(e.target.value) || 15,
                    })
                  }
                  min={5}
                  max={100}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
