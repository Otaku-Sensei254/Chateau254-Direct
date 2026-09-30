import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiImage, FiPlay, FiRefreshCw, FiVideo } from 'react-icons/fi';
import steakImage from '../../components/images/steak.jpeg';
import '../UI/styles/feed.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PREVIEW_POSTS = [
  {
    id: 'preview-image',
    title: 'A table set for the evening',
    caption: 'Image posts from the Château team will appear in this layout.',
    mediaType: 'image',
    mediaUrl: steakImage,
    authorName: 'Image post template',
    publishedAt: null,
    isPreview: true,
  },
  {
    id: 'preview-video',
    title: 'Behind the Château scenes',
    caption: 'Video posts will use the same card with native playback controls.',
    mediaType: 'video',
    mediaUrl: null,
    authorName: 'Video post template',
    publishedAt: null,
    isPreview: true,
  },
];

const normalizePost = (post) => {
  const mediaUrl = post.mediaUrl || post.media_url || '';
  const explicitType = post.mediaType || post.media_type;
  const inferredType = /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl) ? 'video' : 'image';

  return {
    ...post,
    mediaType: explicitType || inferredType,
    mediaUrl,
    thumbnailUrl: post.thumbnailUrl || post.thumbnail_url || '',
    authorName: post.authorName || post.author_name || 'Château254 Team',
    publishedAt: post.publishedAt || post.published_at || post.createdAt || post.created_at || null,
  };
};

const formatDate = (value) => {
  if (!value) return 'Château254 Team';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Château254 Team';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const FeedMedia = ({ post }) => {
  if (post.mediaType === 'video' && post.mediaUrl) {
    return (
      <video className="feed-card-media-content" controls playsInline preload="metadata" poster={post.thumbnailUrl || undefined}>
        <source src={post.mediaUrl} />
        Your browser does not support video playback.
      </video>
    );
  }

  if (post.mediaType === 'image' && post.mediaUrl) {
    return <img className="feed-card-media-content" src={post.mediaUrl} alt={post.title || 'Château254 update'} loading="lazy" />;
  }

  return (
    <div className={`feed-card-placeholder ${post.mediaType}`}>
      {post.mediaType === 'video' ? <FiVideo aria-hidden="true" /> : <FiImage aria-hidden="true" />}
      {post.mediaType === 'video' && <span className="feed-placeholder-play"><FiPlay aria-hidden="true" /></span>}
      <span>{post.mediaType === 'video' ? 'Video preview' : 'Image preview'}</span>
    </div>
  );
};

const FeedCard = ({ post }) => (
  <article className={`feed-card ${post.isPreview ? 'is-preview' : ''}`}>
    <div className="feed-card-media">
      <FeedMedia post={post} />
      <span className="feed-media-type">{post.mediaType === 'video' ? 'Video' : 'Image'}</span>
    </div>
    <div className="feed-card-body">
      <div className="feed-card-meta">
        <span>{post.authorName}</span>
        <span><FiCalendar aria-hidden="true" /> {formatDate(post.publishedAt)}</span>
      </div>
      <h2>{post.title || 'Château254 update'}</h2>
      {post.caption && <p>{post.caption}</p>}
    </div>
  </article>
);

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/feed`);
      if (!response.ok) throw new Error('Feed is not available yet');
      const data = await response.json();
      setPosts((data.posts || []).map(normalizePost));
    } catch (requestError) {
      setError(requestError.message || 'Feed is not available yet');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const displayPosts = posts.length ? posts : PREVIEW_POSTS;
  const visiblePosts = useMemo(() => (
    filter === 'all' ? displayPosts : displayPosts.filter((post) => post.mediaType === filter)
  ), [displayPosts, filter]);
  const isPreview = !posts.length;

  return (
    <main className="feed-page">
      <section className="feed-hero">
        <div className="feed-hero-copy">
          <span className="feed-eyebrow">From the Château</span>
          <h1>Stories, pours &amp; moments.</h1>
          <p>Follow the people, plates, and occasions that make Château254 feel like home.</p>
        </div>
        <div className="feed-hero-mark" aria-hidden="true">254</div>
      </section>

      <section className="feed-content" aria-label="Château254 media feed">
        <div className="feed-toolbar">
          <div>
            <span className="feed-section-kicker">The journal</span>
            <h2>Latest from our team</h2>
          </div>
          <div className="feed-filters" role="group" aria-label="Filter feed posts">
            {['all', 'image', 'video'].map((option) => (
              <button key={option} type="button" className={filter === option ? 'active' : ''} onClick={() => setFilter(option)}>
                {option === 'all' ? 'All stories' : `${option.charAt(0).toUpperCase()}${option.slice(1)}s`}
              </button>
            ))}
            <button type="button" className="feed-refresh" onClick={loadFeed} aria-label="Refresh feed" title="Refresh feed">
              <FiRefreshCw className={loading ? 'is-spinning' : ''} aria-hidden="true" />
            </button>
          </div>
        </div>

        {error && <p className="feed-notice">{error}. Showing the media layout preview.</p>}
        {loading && !posts.length ? <div className="feed-loading">Loading Château stories...</div> : (
          <div className="feed-grid">
            {visiblePosts.map((post) => <FeedCard key={post.id} post={post} />)}
          </div>
        )}

        {isPreview && <p className="feed-preview-note">Preview templates are shown until the Château team publishes its first post.</p>}
      </section>
    </main>
  );
};

export default Feed;
