"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PageLayout } from "@/components/ui/page-layout"
import { PageHeader } from "@/components/ui/page-header"
import { RichTextEditor } from "@/components/rich-text-editor"
import { apiClient } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Filter,
  Calendar,
  User,
  Tag,
  BookOpen,
  Megaphone,
  Clock,
  GraduationCap,
  Info,
  Loader2,
  AlertCircle,
  FileText,
  Sparkles,
  TrendingUp
} from "lucide-react"
import { format } from "date-fns"

interface Post {
  id: string
  title: string
  content: string
  excerpt: string
  status: 'draft' | 'published' | 'archived'
  category: string
  tags: string[]
  author_name: string
  author_email: string
  category_name: string
  category_color: string
  category_icon: string
  published_at: string | null
  created_at: string
  updated_at: string
  hasRead?: boolean
  readCount?: number
  media?: any[]
}

interface Category {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  color: string
  sort_order: number
  is_active: boolean
}

const iconMap: { [key: string]: any } = {
  Megaphone,
  BookOpen,
  Calendar,
  GraduationCap,
  Clock,
  Info
}

export function PostsManagement() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    category: '',
    tags: [] as string[],
    published_at: null as string | null
  })

  useEffect(() => {
    fetchPosts()
    fetchCategories()
  }, [])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getPosts(true)
      setPosts(response.data.posts || [])
    } catch (error) {
      console.error('Error fetching posts:', error)
      setError('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await apiClient.getPostCategories()
      setCategories(response.data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleCreatePost = async () => {
    try {
      const response = await apiClient.createPost({
        title: formData.title,
        content: formData.content,
        category: formData.category,
        status: formData.status,
        excerpt: formData.excerpt,
        tags: formData.tags
      })
      setPosts([response.data, ...posts])
      setIsCreateDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error creating post:', error)
      setError('Failed to create post')
    }
  }

  const handleUpdatePost = async () => {
    if (!editingPost) return

    try {
      const response = await apiClient.updatePost(editingPost.id, {
        title: formData.title,
        content: formData.content,
        category: formData.category,
        status: formData.status,
        excerpt: formData.excerpt,
        tags: formData.tags
      })
      setPosts(posts.map(post => 
        post.id === editingPost.id ? response.data : post
      ))
      setIsEditDialogOpen(false)
      setEditingPost(null)
      resetForm()
    } catch (error) {
      console.error('Error updating post:', error)
      setError('Failed to update post')
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      await apiClient.deletePost(postId)
      setPosts(posts.filter(post => post.id !== postId))
    } catch (error) {
      console.error('Error deleting post:', error)
      setError('Failed to delete post')
    }
  }

  const openEditDialog = (post: Post) => {
    setEditingPost(post)
    setFormData({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      status: post.status,
      category: post.category,
      tags: post.tags,
      published_at: post.published_at
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      status: 'draft',
      category: '',
      tags: [],
      published_at: null
    })
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || post.category === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Info
    return <IconComponent className="w-4 h-4" />
  }

  if (loading) {
    return (
      <PageLayout>
        <PageHeader
          icon={FileText}
          title="Posts Management"
          description="Create and manage announcements, updates, and organizational communications"
        />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading posts...</span>
        </div>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout>
        <PageHeader
          icon={FileText}
          title="Posts Management"
          description="Create and manage announcements, updates, and organizational communications"
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchPosts} variant="outline" className="mt-2">
              Try Again
            </Button>
          </div>
        </div>
      </PageLayout>
    )
  }

  // Stats for posts overview
  const stats = [
    {
      title: "Total Posts",
      value: posts.length,
      icon: FileText,
      color: "text-blue-600",
      description: "All posts in system",
    },
    {
      title: "Published",
      value: posts.filter(p => p.status === 'published').length,
      icon: TrendingUp,
      color: "text-green-600",
      description: "Live posts visible to users",
    },
    {
      title: "Drafts",
      value: posts.filter(p => p.status === 'draft').length,
      icon: Edit,
      color: "text-orange-600",
      description: "Posts in progress",
    },
    {
      title: "Categories",
      value: categories.length,
      icon: Tag,
      color: "text-purple-600",
      description: "Available categories",
    }
  ]

  return (
    <PageLayout>
      <PageHeader
        icon={FileText}
        title="Posts Management"
        description="Create and manage announcements, updates, and organizational communications"
      >
        <Badge variant="outline" className="text-blue-600 border-blue-600">
          <Sparkles className="h-3 w-3 mr-1" />
          Rich Content
        </Badge>
        <Button size="lg" className="bg-green-600 hover:bg-green-700" onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
          <Plus className="h-5 w-5 mr-2" />
          Create Post
        </Button>
      </PageHeader>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
            </DialogHeader>
            <PostForm
              formData={formData}
              setFormData={setFormData}
              categories={categories}
              onSubmit={handleCreatePost}
              onCancel={() => setIsCreateDialogOpen(false)}
              isEdit={false}
            />
          </DialogContent>
        </Dialog>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="min-w-[150px]">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="min-w-[150px]">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.slug}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      <div className="grid gap-4">
        {filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No posts found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' 
                  ? 'No posts match your current filters.'
                  : 'Get started by creating your first post.'
                }
              </p>
              {!searchQuery && statusFilter === 'all' && categoryFilter === 'all' && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Post
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPosts.map(post => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{post.title}</CardTitle>
                      <Badge className={getStatusColor(post.status)}>
                        {post.status}
                      </Badge>
                      {post.category_name && (
                        <Badge variant="outline" style={{ borderColor: post.category_color }}>
                          {getCategoryIcon(post.category_icon)}
                          <span className="ml-1">{post.category_name}</span>
                        </Badge>
                      )}
                    </div>
                    
                    <CardDescription className="text-base mb-2">
                      {post.excerpt || post.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...'}
                    </CardDescription>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {post.author_name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {post.published_at 
                          ? format(new Date(post.published_at), 'MMM d, yyyy')
                          : format(new Date(post.created_at), 'MMM d, yyyy')
                        }
                      </div>
                      {user?.role === 'admin' && post.readCount !== undefined && (
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {post.readCount} reads
                        </div>
                      )}
                    </div>
                    
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(post)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePost(post.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <PostForm
            formData={formData}
            setFormData={setFormData}
            categories={categories}
            onSubmit={handleUpdatePost}
            onCancel={() => {
              setIsEditDialogOpen(false)
              setEditingPost(null)
              resetForm()
            }}
            isEdit={true}
          />
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

// Post Form Component
interface PostFormProps {
  formData: any
  setFormData: (data: any) => void
  categories: Category[]
  onSubmit: () => void
  onCancel: () => void
  isEdit: boolean
}

function PostForm({ formData, setFormData, categories, onSubmit, onCancel, isEdit }: PostFormProps) {
  const [tagInput, setTagInput] = useState('')

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      })
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag: string) => tag !== tagToRemove)
    })
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter post title..."
        />
      </div>

      {/* Excerpt */}
      <div>
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea
          id="excerpt"
          value={formData.excerpt}
          onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
          placeholder="Brief description of the post..."
          rows={2}
        />
      </div>

      {/* Content */}
      <div>
        <Label>Content *</Label>
        <RichTextEditor
          content={formData.content}
          onChange={(content) => setFormData({ ...formData, content })}
          placeholder="Write your post content..."
          className="mt-2"
        />
      </div>

      {/* Category and Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.slug}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <Label>Tags</Label>
        <div className="flex gap-2 mt-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add a tag..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
          />
          <Button type="button" onClick={addTag} variant="outline">
            Add
          </Button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                {tag} ×
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit}>
          {isEdit ? 'Update Post' : 'Create Post'}
        </Button>
      </div>
    </div>
  )
}