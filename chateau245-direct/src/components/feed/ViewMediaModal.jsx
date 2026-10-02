import React, { useEffect, useRef } from 'react';
import { FiX, FiHeart, FiPlay } from 'react-icons/fi';
import { formatCount, formatFeedDate } from './useFeed';

/* The "view media" overlay. Opening a card focuses this dialog and Escape or a
   backdrop click closes it, matching what people expect from a lightbox. The
   like button is live here as well as on the card, and both read from the same
   post object so the counts can never drift apart. */

const ViewMediaModal = ({ post, onClose, onToggleLike, canLike, busy = false }) => {
  const closeRef = useRef(null);
  const likeRef = useRef(null);

  useEffect(() => {
    if (!post) return undefined;

    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [post, onClose]);

  if (!post) return null;

  const isVideo = post.mediaType === 'video';

  return (
    <div
      className="feed-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}
    >
      <div className="feed-modal" role="dialog" aria-modal="true" aria-label={post.title || 'Château254 media'}>
        <button ref={closeRef} type="button" className="feed-modal-close" onClick={onClose} aria-label="Close">
          <FiX aria-hidden="true" />
        </button>

        <div className="feed-modal-media">
          {isVideo ? (
            <video className="feed-modal-video" controls playsInline preload="metadata" poster={post.thumbnailUrl || undefined}>
              <source src={post.mediaUrl} />
              Your browser does not support video playback.
            </video>
          ) : (
            <img className="feed-modal-image" src={post.mediaUrl} alt={post.title || 'Château254 update'} />
          )}
          {isVideo && !post.mediaUrl && <span className="feed-modal-media-hint"><FiPlay aria-hidden="true" /> Video unavailable</span>}
        </div>

        <div className="feed-modal-body">
          <div className="feed-modal-meta">
            <span>{post.authorName}</span>
            <span>{formatFeedDate(post.publishedAt)}</span>
            <span className="feed-media-type">{isVideo ? 'Video' : 'Image'}</span>
          </div>

          {post.title && <h2 className="feed-modal-title">{post.title}</h2>}
          {post.caption && <p className="feed-modal-caption">{post.caption}</p>}

          <div className="feed-modal-actions">
            <button
              ref={likeRef}
              type="button"
              className={`feed-like ${post.likedByMe ? 'is-liked' : ''}`}
              onClick={() => onToggleLike?.(post)}
              disabled={!canLike || busy}
              aria-pressed={post.likedByMe}
              title={canLike ? (post.likedByMe ? 'Remove like' : 'Like this post') : 'Sign in to like posts'}
            >
              <FiHeart aria-hidden="true" />
              <span>{formatCount(post.likeCount)}</span>
            </button>
            {!canLike && <span className="feed-modal-hint">Sign in to like this post</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewMediaModal;
