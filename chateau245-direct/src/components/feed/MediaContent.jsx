import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiEdit2, FiEye, FiHeart, FiImage, FiPlay, FiTrash2, FiUpload, FiVideo, FiX } from 'react-icons/fi';
import { FEED_ACCEPT, FEED_MAX_BYTES, formatCount, formatFeedDate, normalizePost } from './useFeed';


const EMPTY_FORM = { title: '', caption: '', author_name: '', is_published: true, is_promo: false, day_of_week: 0, week_start_date: '', display_order: 0, link_url: '', link_text: 'View Details' };
const ACCEPTED = FEED_ACCEPT.split(',');

const describeFile = (file) => {
  const isVideo = file.type.startsWith('video/');
  return {
    isVideo,
    mediaType: isVideo ? 'video' : 'image',
    name: file.name,
    size: file.size,
  };
};

const humanSize = (bytes) => {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/* Admin media manager.
   The upload is deliberately two steps against the API: POST /feed/upload puts
   the file in Cloudflare R2 and returns a public URL, then POST /feed stores the
   post row pointing at that URL. Sending base64 in the JSON body is not
   supported and is rejected by the server. */

const MediaContent = ({ api, headers, addToast }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const objectUrlRef = useRef('');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${api}/feed?all=true`, { headers });
      if (!response.ok) throw new Error('Failed to load media');
      const data = await response.json();
      setPosts((data.posts || []).map(normalizePost));
    } catch (error) {
      addToast(error.message || 'Failed to load media', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, headers, addToast]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  /* Object URLs are revoked when replaced and on unmount, otherwise every
     re-selection of a video leaks the whole file in memory. */
  const clearObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
  };

  useEffect(() => () => clearObjectUrl(), []);

  const resetForm = () => {
    setEditingPost(null);
    setForm(EMPTY_FORM);
    setFile(null);
    clearObjectUrl();
    setPreviewUrl('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const closeEditor = () => {
    setEditorOpen(false);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setEditorOpen(true);
  };

  const openEdit = (post) => {
    setEditingPost(post);
    setForm({
      title: post.title || '',
      caption: post.caption || '',
      author_name: post.authorName || '',
      is_published: post.isPublished !== false,
      is_promo: post.isPromo || false,
      day_of_week: post.day_of_week || 0,
      week_start_date: post.week_start_date || '',
      display_order: post.display_order || 0,
      link_url: post.link_url || '',
      link_text: post.link_text || 'View Details',
    });
    setFile(null);
    clearObjectUrl();
    setPreviewUrl(post.mediaUrl || '');
    setEditorOpen(true);
  };

  const chooseFile = (event) => {
    const picked = event.target.files?.[0];
    if (!picked) return;

    if (!ACCEPTED.includes(picked.type)) {
      addToast('Choose a JPEG, PNG, WebP, MP4, WebM or MOV file', 'error');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (picked.size > FEED_MAX_BYTES) {
      addToast(`File is larger than ${Math.round(FEED_MAX_BYTES / (1024 * 1024))}MB`, 'error');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    clearObjectUrl();
    const objectUrl = URL.createObjectURL(picked);
    objectUrlRef.current = objectUrl;
    setFile(picked);
    setPreviewUrl(objectUrl);
  };

  const clearMedia = () => {
    setFile(null);
    clearObjectUrl();
    setPreviewUrl('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const savePost = async (event) => {
    event.preventDefault();
    if (!form.title.trim() && !form.caption.trim()) {
      addToast('Add a title or a description', 'error');
      return;
    }

    // Validate promo video fields if is_promo is checked
    if (form.is_promo) {
      if (form.week_start_date === '') {
        addToast('Week start date is required for promo videos', 'error');
        return;
      }
      if (form.day_of_week === undefined || form.day_of_week === '') {
        addToast('Day of week is required for promo videos', 'error');
        return;
      }
    }

    setUploading(true);
    try {
      let mediaUrl = editingPost?.mediaUrl || '';
      let mediaType = editingPost?.mediaType || 'image';

      if (file) {
        const body = new FormData();
        body.append('media', file);
        const { Authorization } = headers;
        const uploadResponse = await fetch(`${api}/feed/upload`, {
          method: 'POST',
          headers: Authorization ? { Authorization } : undefined,
          body,
        });
        if (!uploadResponse.ok) throw new Error('Upload failed');
        const uploaded = await uploadResponse.json();
        mediaUrl = uploaded.imageUrl;
        mediaType = uploaded.mediaType;
      }

      if (!mediaUrl) throw new Error('Choose an image or video to upload');

      const payload = {
        title: form.title.trim(),
        caption: form.caption.trim(),
        author_name: form.author_name.trim() || undefined,
        is_published: form.is_published,
        is_promo: form.is_promo || false,
      };

      if (editingPost) {
        const response = await fetch(`${api}/feed/${editingPost.id}`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to update the post');
        addToast('Post updated', 'success');
      } else {
        const response = await fetch(`${api}/feed`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, media_url: mediaUrl, media_type: mediaType }),
        });
        if (!response.ok) throw new Error('Failed to publish the post');
        const data = await response.json();
        addToast(form.is_published ? 'Post published to the feed' : 'Draft saved', 'success');
        
        // If this is a promo video, create the promo_videos entry
        if (form.is_promo && mediaType === 'video' && data.post?.id) {
          const promoPayload = {
            feed_post_id: data.post.id,
            day_of_week: form.day_of_week,
            week_start_date: form.week_start_date,
            display_order: form.display_order,
            link_url: form.link_url || null,
            link_text: form.link_text || 'View Details',
            is_active: true,
          };
          try {
            await fetch(`${api}/promotions/promo-videos`, {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify(promoPayload),
            });
          } catch (err) {
            console.error('Failed to create promo video entry:', err);
            addToast('Post saved but promo scheduling failed', 'warning');
          }
        }
      }

      // If editing an existing promo video, update the promo_videos entry
      if (editingPost && form.is_promo && editingPost.mediaType === 'video') {
        const promoPayload = {
          feed_post_id: editingPost.id,
          day_of_week: form.day_of_week,
          week_start_date: form.week_start_date,
          display_order: form.display_order,
          link_url: form.link_url || null,
          link_text: form.link_text || 'View Details',
          is_active: true,
        };
        try {
          await fetch(`${api}/promotions/promo-videos`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(promoPayload),
          });
        } catch (err) {
          console.error('Failed to update promo video entry:', err);
        }
      }

      closeEditor();
      await fetchPosts();
    } catch (error) {
      addToast(error.message || 'Save failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const togglePublished = async (post) => {
    try {
      const response = await fetch(`${api}/feed/${post.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !post.isPublished }),
      });
      if (!response.ok) throw new Error('Failed to update visibility');
      setPosts((current) => current.map((p) => (p.id === post.id ? { ...p, isPublished: !p.isPublished } : p)));
      addToast(post.isPublished ? 'Post hidden from the feed' : 'Post published', 'success');
    } catch (error) {
      addToast(error.message || 'Update failed', 'error');
    }
  };

  const deletePost = async (post) => {
    if (!window.confirm(`Delete "${post.title || 'this post'}"? The file is removed from storage too.`)) return;
    try {
      const response = await fetch(`${api}/feed/${post.id}`, { method: 'DELETE', headers });
      if (!response.ok) throw new Error('Failed to delete the post');
      setPosts((current) => current.filter((p) => p.id !== post.id));
      addToast('Post deleted', 'success');
    } catch (error) {
      addToast(error.message || 'Delete failed', 'error');
    }
  };

  const picked = file ? describeFile(file) : null;

  return (
    <>
      <div className="admin-content-heading">
        <div>
          <p className="eyebrow">Social</p>
          <h2>Media</h2>
        </div>
        <button className="admin-primary" onClick={openCreate}><FiUpload /> Upload media</button>
      </div>

      <p className="admin-section-note">
        Share the same photos and videos you post to social. Guests see published posts on the public feed.
      </p>

      {posts.length > 0 && (
        <div className="admin-media-stats">
          <span><strong>{posts.length}</strong> total</span>
          <span><strong>{posts.filter((p) => p.isPublished).length}</strong> published</span>
          <span><strong>{posts.filter((p) => !p.isPublished).length}</strong> drafts</span>
          <span><strong>{formatCount(posts.reduce((sum, p) => sum + p.likeCount, 0))}</strong> likes</span>
        </div>
      )}

      <div className="admin-menu-grid">
        {posts.map((post) => (
          <article className="admin-menu-card admin-media-card" key={post.id}>
            <div className="admin-media-thumb">
              {post.mediaType === 'video' ? (
                <video src={post.mediaUrl} muted preload="metadata" />
              ) : (
                <img src={post.mediaUrl} alt={post.title || 'Media post'} />
              )}
              <span className="admin-media-kind">
                {post.mediaType === 'video' ? <><FiVideo /> Video</> : <><FiImage /> Image</>}
              </span>
              <span className={`admin-media-state ${post.isPublished ? 'live' : 'draft'}`}>
                {post.isPublished ? 'Live' : 'Draft'}
              </span>
            </div>

            <div className="admin-menu-card-body">
              <div className="admin-menu-card-top">
                <div className="admin-menu-card-info">
                  <strong className="admin-menu-card-name">{post.title || 'Untitled post'}</strong>
                  <span className="admin-menu-card-category">{post.authorName} · {formatFeedDate(post.publishedAt)}</span>
                </div>
              </div>
              {post.caption && <p className="admin-menu-card-description">{post.caption}</p>}
              <div className="admin-menu-card-footer">
                <small><FiHeart aria-hidden="true" /> {formatCount(post.likeCount)}</small>
                <div className="admin-menu-card-actions">
                  <button type="button" onClick={() => togglePublished(post)} title={post.isPublished ? 'Hide from feed' : 'Publish to feed'}>
                    <FiEye />
                  </button>
                  <button type="button" onClick={() => openEdit(post)} title="Edit"><FiEdit2 /></button>
                  <button type="button" onClick={() => deletePost(post)} title="Delete"><FiTrash2 /></button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {!posts.length && !loading && (
        <div className="admin-placeholder">
          <div className="admin-placeholder-icon"><FiImage /></div>
          <h2>No media yet</h2>
          <p>Upload the photos and videos from your socials to fill the feed.</p>
          <button className="admin-primary" onClick={openCreate}><FiUpload /> Upload media</button>
        </div>
      )}

      {editorOpen && (
        <div className="admin-modal-backdrop">
          <form className="admin-modal" onSubmit={savePost}>
            <button type="button" className="admin-modal-close" onClick={closeEditor}><FiX /></button>
            <p className="eyebrow">Social</p>
            <h2>{editingPost ? 'Edit post' : 'New media post'}</h2>

            <div className="admin-modal-form">
              <label>
                Title
                <input
                  name="title"
                  maxLength={180}
                  placeholder="Harvest table at dusk"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
                <small className="admin-field-count">{form.title.length}/180</small>
              </label>

              <label>
                Description
                <textarea
                  name="caption"
                  rows="4"
                  placeholder="What is happening in this post?"
                  value={form.caption}
                  onChange={(e) => setForm((prev) => ({ ...prev, caption: e.target.value }))}
                />
              </label>

              <label>
                Credit
                <input
                  name="author_name"
                  placeholder="Château254 Team"
                  value={form.author_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, author_name: e.target.value }))}
                />
              </label>

              <label>
                {editingPost ? 'Replace media (optional)' : 'Image or video'}
                <div className="admin-upload-row">
                  <button type="button" className="admin-upload-button" onClick={() => fileRef.current?.click()}>
                    {picked ? <FiPlay /> : <FiUpload />}
                    {picked ? picked.name : (previewUrl ? 'Replace media' : 'Choose file')}
                  </button>
                  {(previewUrl || file) && (
                    <button type="button" className="admin-upload-clear" onClick={editingPost ? () => setPreviewUrl('') : clearMedia}>
                      Remove
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept={FEED_ACCEPT} onChange={chooseFile} style={{ display: 'none' }} />
                {picked && <small className="admin-field-count">{picked.mediaType} · {humanSize(picked.size)}</small>}
              </label>

              {previewUrl && (
                <div className="admin-modal-image-preview">
                  {picked?.isVideo || (!picked && editingPost?.mediaType === 'video') ? (
                    <video src={previewUrl} controls preload="metadata" />
                  ) : (
                    <img src={previewUrl} alt="Selected media preview" />
                  )}
                </div>
              )}

              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_published: e.target.checked }))}
                />
                <span>Publish to the public feed</span>
              </label>

              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={form.is_promo}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_promo: e.target.checked }))}
                  disabled={picked && !picked.isVideo && !editingPost}
                />
                <span>Mark as promo video for home/menu pages {picked && !picked.isVideo && '(video only)'}</span>
              </label>

              {form.is_promo && (
                <fieldset className="admin-fieldset">
                  <legend>Promo Video Scheduling <span className="admin-fieldset-hint">(Video-only feature)</span></legend>
                  
                  {picked && !picked.isVideo && !editingPost ? (
                    <p className="admin-fieldset-warning">Please select a video file to configure promo scheduling.</p>
                  ) : (
                    <>
                      <label>
                        Day of Week
                        <select
                          name="day_of_week"
                          value={form.day_of_week}
                          onChange={(e) => setForm((prev) => ({ ...prev, day_of_week: Number(e.target.value) }))}
                        >
                          <option value={0}>Sunday</option>
                          <option value={1}>Monday</option>
                          <option value={2}>Tuesday</option>
                          <option value={3}>Wednesday</option>
                          <option value={4}>Thursday</option>
                          <option value={5}>Friday</option>
                          <option value={6}>Saturday</option>
                        </select>
                      </label>

                      <label>
                        Week Start Date (Monday)
                        <input
                          name="week_start_date"
                          type="date"
                          value={form.week_start_date}
                          onChange={(e) => setForm((prev) => ({ ...prev, week_start_date: e.target.value }))}
                          className="dark-date-input"
                        />
                      </label>

                      <label>
                        Display Order
                        <input
                          name="display_order"
                          type="number"
                          min="0"
                          value={form.display_order}
                          onChange={(e) => setForm((prev) => ({ ...prev, display_order: Number(e.target.value) }))}
                        />
                      </label>

                      <label>
                        Link URL (optional)
                        <input
                          name="link_url"
                          type="url"
                          placeholder="https://chateau254.co.ke/menu?mode=lunchbox"
                          value={form.link_url}
                          onChange={(e) => setForm((prev) => ({ ...prev, link_url: e.target.value }))}
                        />
                      </label>

                      <label>
                        Link Text
                        <input
                          name="link_text"
                          placeholder="View Details"
                          value={form.link_text}
                          onChange={(e) => setForm((prev) => ({ ...prev, link_text: e.target.value }))}
                        />
                      </label>
                    </>
                  )}
                </fieldset>
              )}
            </div>

            <button className="admin-primary" type="submit" disabled={uploading}>
              {uploading ? 'Uploading…' : editingPost ? 'Save changes' : 'Publish post'}
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default MediaContent;
