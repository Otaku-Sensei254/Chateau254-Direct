import { useCallback, useEffect, useRef, useState } from 'react';

/* Shared feed helpers.
   The admin uploader and the public feed both speak the same shape, so the
   normalisation and the like call live here rather than being duplicated. */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const FEED_ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime';
export const FEED_MAX_BYTES = 50 * 1024 * 1024;

const inferMediaType = (url) => (/\.(mp4|webm|mov)(\?|$)/i.test(url || '') ? 'video' : 'image');

export const formatFeedDate = (value) => {
  if (!value) return 'Château254 Team';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Château254 Team';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatCount = (value) => {
  const count = Number(value || 0);
  if (count < 1000) return String(count);
  if (count < 1000000) return `${(count / 1000).toFixed(count < 10000 ? 1 : 0)}k`;
  return `${(count / 1000000).toFixed(1)}M`;
};

/* Accepts either camelCase or snake_case so the same function works against the
   API response and against locally constructed objects. */
export const normalizePost = (post) => {
  const mediaUrl = post.mediaUrl || post.media_url || '';
  return {
    ...post,
    id: post.id,
    title: post.title || '',
    caption: post.caption || '',
    mediaUrl,
    mediaType: post.mediaType || post.media_type || inferMediaType(mediaUrl),
    thumbnailUrl: post.thumbnailUrl || post.thumbnail_url || '',
    authorName: post.authorName || post.author_name || 'Château254 Team',
    isPublished: post.isPublished ?? post.is_published ?? true,
    publishedAt: post.publishedAt || post.published_at || post.createdAt || post.created_at || null,
    likeCount: Number(post.likeCount ?? post.like_count ?? 0),
    likedByMe: Boolean(post.likedByMe ?? post.liked_by_me ?? false),
  };
};

export const useFeed = (token, { admin = false } = {}) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* A ref mirrors the list so an optimistic like can be rolled back. Reading the
     previous value from inside a setState updater would be unreliable, because
     React may invoke that updater more than once. */
  const postsRef = useRef([]);
  useEffect(() => { postsRef.current = posts; }, [posts]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/feed${admin ? '?all=true' : ''}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error('Feed is not available yet');
      const data = await response.json();
      setPosts((data.posts || []).map(normalizePost));
    } catch (requestError) {
      setError(requestError.message || 'Feed is not available yet');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [token, admin]);

  /* Optimistic so the heart responds instantly. The server response is then
     trusted for the authoritative count, and a failure rolls the change back. */
  const setLike = useCallback(async (postId, liked) => {
    const snapshot = postsRef.current;
    if (!snapshot.some((p) => p.id === postId)) return false;

    const apply = (list) => {
      postsRef.current = list;
      setPosts(list);
    };

    apply(snapshot.map((p) => (p.id === postId
      ? { ...p, likedByMe: liked, likeCount: Math.max(0, p.likeCount + (liked ? 1 : -1)) }
      : p)));

    try {
      const response = await fetch(`${API_URL}/feed/${postId}/like`, {
        method: liked ? 'POST' : 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error('Could not update like');
      const data = await response.json();
      apply(postsRef.current.map((p) => (p.id === postId
        ? { ...p, likeCount: data.likeCount, likedByMe: data.liked }
        : p)));
      return true;
    } catch (likeError) {
      apply(snapshot);
      return false;
    }
  }, [token]);

  return { posts, setPosts, loading, error, reload: load, setLike };
};

export default useFeed;
