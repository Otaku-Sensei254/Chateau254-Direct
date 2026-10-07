import React, { useMemo, useState, useEffect } from 'react';
import { FiCalendar, FiHeart, FiImage, FiPlay, FiRefreshCw, FiVideo } from 'react-icons/fi';
import ViewMediaModal from '../../components/feed/ViewMediaModal';
import { formatCount, formatFeedDate, useFeed } from '../../components/feed/useFeed';
import '../UI/styles/feed.css';

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
      <span>{post.mediaType === 'video' ? 'Video' : 'Image'}</span>
    </div>
  );
};

const Feed = ({ session }) => {
  const token = session?.token || null;
  const { posts, loading, error, reload, setLike } = useFeed(token);
  const [filter, setFilter] = useState('all');
  /* Held by id rather than by object so the open viewer always shows the live
     row: liking inside the modal updates the card behind it at the same time. */
  const [activePostId, setActivePostId] = useState(null);
  const [likeBusy, setLikeBusy] = useState(false);

  const displayPosts = posts;

  const visiblePosts = useMemo(() => (
    filter === 'all' ? displayPosts : displayPosts.filter((post) => post.mediaType === filter)
  ), [displayPosts, filter]);

  const counts = useMemo(() => ({
    all: displayPosts.length,
    image: displayPosts.filter((p) => p.mediaType === 'image').length,
    video: displayPosts.filter((p) => p.mediaType === 'video').length,
  }), [displayPosts]);

  const activePost = useMemo(
    () => displayPosts.find((post) => post.id === activePostId) || null,
    [displayPosts, activePostId],
  );

  const canLike = Boolean(token);

  useEffect(() => {
    reload();
  }, [reload]);

  /* The card and the open viewer read the same post object out of the shared
     list, so a like in one place updates the other with no extra wiring. */
  const toggleLike = async (post) => {
    if (!canLike || likeBusy) return;
    setLikeBusy(true);
    await setLike(post.id, !post.likedByMe);
    setLikeBusy(false);
  };

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
              <button
                key={option}
                type="button"
                className={filter === option ? 'active' : ''}
                onClick={() => setFilter(option)}
                disabled={counts[option] === 0 && option !== 'all'}
              >
                {option === 'all' ? 'All stories' : `${option.charAt(0).toUpperCase()}${option.slice(1)}s`}
                <span className="feed-filter-count">{counts[option]}</span>
              </button>
            ))}
            <button type="button" className="feed-refresh" onClick={reload} aria-label="Refresh feed" title="Refresh feed">
              <FiRefreshCw className={loading ? 'is-spinning' : ''} aria-hidden="true" />
            </button>
          </div>
        </div>

        {error && <p className="feed-notice">{error}</p>}
        {loading && !posts.length && <div className="feed-loading">Loading Château stories…</div>}

        <div className="feed-grid">
          {visiblePosts.map((post) => (
            <article className="feed-card" key={post.id}>
              <button
                type="button"
                className="feed-card-open"
                onClick={() => setActivePostId(post.id)}
                aria-label={`View ${post.title || 'post'}`}
              >
                <div className="feed-card-media">
                  <FeedMedia post={post} />
                  <span className="feed-media-type">{post.mediaType === 'video' ? 'Video' : 'Image'}</span>
                </div>
                <div className="feed-card-body">
                  <div className="feed-card-meta">
                    <span>{post.authorName}</span>
                    <span><FiCalendar aria-hidden="true" /> {formatFeedDate(post.publishedAt)}</span>
                  </div>
                  <h2>{post.title || 'Château254 update'}</h2>
                  {post.caption && <p>{post.caption}</p>}
                </div>
              </button>

              <div className="feed-card-footer">
                <button
                  type="button"
                  className={`feed-like ${post.likedByMe ? 'is-liked' : ''}`}
                  onClick={() => toggleLike(post)}
                  disabled={!canLike}
                  aria-pressed={post.likedByMe}
                  title={canLike ? (post.likedByMe ? 'Remove like' : 'Like this post') : 'Sign in to like posts'}
                >
                  <FiHeart aria-hidden="true" />
                  <span>{formatCount(post.likeCount)}</span>
                </button>
                <button type="button" className="feed-view" onClick={() => setActivePostId(post.id)}>View</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <ViewMediaModal
        post={activePost}
        canLike={canLike}
        busy={likeBusy}
        onClose={() => setActivePostId(null)}
        onToggleLike={toggleLike}
      />
    </main>
  );
};

export default Feed;
