import { useState } from 'react';
import './MobileLayout.css';

function formatShortDate(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MobileLayout({
  user,
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  handleAuthSubmit,
  handleLogoutClick,
  showSettings,
  setShowSettings,
  showAdminView,
  setShowAdminView,
  adminUsers,
  pagedLogs,
  logPage,
  setLogPage,
  totalLogPages,
  adminLogs,
  handleSaveUserEdit,
  checkAdminNotifications,
  pendingNotificationCount,
  filterMode,
  setFilterMode,
  selectedAuthor,
  setSelectedAuthor,
  selectedPost,
  setSelectedPost,
  displayedPosts,
  expandedPosts,
  toggleExpandPost,
  openSinglePost,
  handleDeletePost,
  renderAllowedMarkdown,
  composeWindows,
  openComposeWindow,
  closeComposeWindow,
  renderComposeBody,
  contactModal,
  setContactModal,
  submitAdminRequest,
  promptBox,
  closePrompt,
  sidebarToast,
  setSidebarToast,
  showBackToTop,
  scrollToTop,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedAdminUserId, setExpandedAdminUserId] = useState(null);
  const [expandedLogId, setExpandedLogId] = useState(null);

  const activeCompose = composeWindows.at(0) || null;
  const compactNow = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleOpenSingleCompose = (postToEdit = null) => {
    composeWindows.forEach((w) => closeComposeWindow(w.windowId));
    openComposeWindow(postToEdit);
    setSidebarOpen(false);
  };

  return (
    <div className="mobile-shell">
      {}
      <div className="mobile-header">
        <div className="mobile-header-date">{compactNow}</div>
        <div className="mobile-header-user">
          {user ? `${user.username} • ${user.role?.toUpperCase()}` : 'Guest • Read-Only'}
        </div>
      </div>

      {}
      {sidebarOpen && (
        <div className="mobile-sidebar-full">
          <div className="mobile-sidebar-top">
            <div className="sidebar-section-title" style={{ marginBottom: 0 }}>
              Menu
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSidebarOpen(false)}
            >
              ← Return
            </button>
          </div>

          {!user ? (
            <form
              className="auth-form"
              onSubmit={(e) => {
                handleAuthSubmit(e);
                setSidebarOpen(false);
              }}
            >
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#555',
                }}
              >
                {authMode === 'login' ? 'Log In' : 'Sign Up'}
              </div>
              <input
                type="text"
                placeholder="Username"
                value={authForm.username}
                onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                required
              />
              {authMode === 'register' && (
                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    style={{ marginBottom: '12px' }}
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    required
                  />
                  <select
                    value={authForm.role}
                    onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}
                  >
                    <option value="reader">Reader</option>
                    <option value="author">Author</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}
              <input
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                required
              />
              <button type="submit" className="btn btn-primary">
                {authMode === 'login' ? 'Log In' : 'Create Account'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              >
                {authMode === 'login' ? 'Switch to Sign Up' : 'Switch to Log In'}
              </button>
            </form>
          ) : showSettings ? (
            <div className="sidebar-nav">
              <div className="profile-card">
                <div className="profile-row">
                  <strong>Username:</strong> {user.username}
                </div>
                <div className="profile-row">
                  <strong>Email:</strong> {user.email}
                </div>
                <div className="profile-row">
                  <strong>Role:</strong> {user.role?.toUpperCase()}
                </div>
              </div>

              {user.role !== 'admin' && (
                <div
                  className="btn btn-secondary"
                  onClick={() => {
                    setSidebarOpen(false);
                    setContactModal({
                      open: true,
                      requestType: 'role',
                      desiredRole: user.role === 'reader' ? 'author' : 'admin',
                    });
                  }}
                >
                  Contact Admin
                </div>
              )}

              {user.role === 'admin' && (
                <div
                  className="btn btn-primary"
                  onClick={() => {
                    setShowAdminView(true);
                    checkAdminNotifications(false);
                    setSidebarOpen(false);
                  }}
                >
                  Administrator
                </div>
              )}

              <div
                className="btn btn-secondary"
                onClick={() => {
                  setShowSettings(false);
                  setShowAdminView(false);
                }}
              >
                ← Back
              </div>
              <div
                className="btn btn-danger"
                onClick={() => {
                  setSidebarOpen(false);
                  handleLogoutClick();
                }}
              >
                Logout
              </div>
            </div>
          ) : (
            <div className="sidebar-nav">
              <div
                className="btn btn-secondary"
                onClick={() => {
                  setShowAdminView(false);
                  setSelectedPost(null);
                  setSelectedAuthor(null);
                  setFilterMode('all');
                  setSidebarOpen(false);
                }}
              >
                All Posts
              </div>
              <div
                className="btn btn-secondary"
                onClick={() => {
                  setShowAdminView(false);
                  setSelectedPost(null);
                  setSelectedAuthor(null);
                  setFilterMode('mine');
                  setSidebarOpen(false);
                }}
              >
                My Posts
              </div>
              <div
                className={`btn ${
                  user.role === 'admin' && pendingNotificationCount > 0
                    ? 'btn-settings-alert'
                    : 'btn-secondary'
                }`}
                style={
                  user.role === 'admin' && pendingNotificationCount > 0
                    ? { border: '2px solid #b91c1c', color: '#b91c1c', fontWeight: 700 }
                    : undefined
                }
                onClick={() => {
                  setShowSettings(true);
                  refreshCurrentUser();
                  if (user.role === 'admin' && pendingNotificationCount > 0) {
                    setShowAdminView(true);
                    checkAdminNotifications(false);
                  }
                }}
              >
                Settings
              </div>
              <div
                className="btn btn-danger"
                onClick={() => {
                  setSidebarOpen(false);
                  handleLogoutClick();
                }}
              >
                Logout
              </div>
            </div>
          )}
        </div>
      )}
      {}
      {user &&
        (user.role === 'author' || user.role === 'admin') &&
        !sidebarOpen &&
        !activeCompose &&
        !showAdminView && (
          <div className="mobile-floating-new-stack">
            <button
              type="button"
              className="mobile-floating-new-btn"
              onClick={() => handleOpenSingleCompose()}
            >
              + New Post
            </button>
            {sidebarToast && (
              <div className="mobile-toast-under-new">
                <span>{sidebarToast}</span>
                <span onClick={() => setSidebarToast(null)} style={{ cursor: 'pointer' }}>
                  ✕
                </span>
              </div>
            )}
          </div>
        )}

      {}
      {(!user || user.role === 'reader' || activeCompose || showAdminView) &&
        !sidebarOpen &&
        sidebarToast && (
          <div className="mobile-floating-new-stack">
            <div className="mobile-toast-under-new">
              <span>{sidebarToast}</span>
              <span onClick={() => setSidebarToast(null)} style={{ cursor: 'pointer' }}>
                ✕
              </span>
            </div>
          </div>
        )}

      {}
      <div className="mobile-main">
        {promptBox.open ? (
          <div className="mobile-body-modal">
            <div className="prompt-header">{promptBox.title}</div>
            <div className="prompt-message">{promptBox.message}</div>
            <div className="prompt-actions">
              {promptBox.isConfirm && (
                <button type="button" className="btn btn-secondary" onClick={closePrompt}>
                  Cancel
                </button>
              )}
              <button
                type="button"
                className={
                  promptBox.isConfirm && promptBox.title.includes('Delete')
                    ? 'btn btn-danger'
                    : 'btn btn-primary'
                }
                onClick={() => {
                  const callback = promptBox.onConfirm;
                  closePrompt();
                  if (callback) callback();
                }}
              >
                {promptBox.isConfirm ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        ) : contactModal.open && user ? (
          <div className="mobile-body-modal">
            <div className="prompt-header">Contact Administrator</div>
            <div className="contact-form-fields">
              <div style={{ fontSize: '0.84rem', color: '#555' }}>Request Type</div>
              <select
                value={contactModal.requestType}
                onChange={(e) =>
                  setContactModal({ ...contactModal, requestType: e.target.value })
                }
              >
                <option value="role">Request Role Change</option>
                <option value="activity">Request Activity Status Change</option>
              </select>

              {contactModal.requestType === 'role' ? (
                <div>
                  <div style={{ fontSize: '0.84rem', color: '#555', marginBottom: '6px' }}>
                    Requested Role
                  </div>
                  <select
                    style={{ width: '100%' }}
                    value={contactModal.desiredRole}
                    onChange={(e) =>
                      setContactModal({ ...contactModal, desiredRole: e.target.value })
                    }
                  >
                    <option value="reader">Reader</option>
                    <option value="author">Author</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              ) : (
                <div
                  style={{
                    fontSize: '0.84rem',
                    color: '#333',
                    padding: '10px 12px',
                    backgroundColor: '#fafafa',
                    border: '1px solid #eaeaea',
                    borderRadius: '3px',
                  }}
                >
                  Current Status:{' '}
                  <strong>{user.is_active === 0 ? 'Inactive' : 'Active'}</strong>
                  <br />
                  Requesting Change To:{' '}
                  <strong>{user.is_active === 0 ? 'Active' : 'Inactive'}</strong>
                </div>
              )}
            </div>
            <div className="prompt-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setContactModal({ ...contactModal, open: false })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const { requestType, desiredRole } = contactModal;
                  setContactModal({ ...contactModal, open: false });
                  submitAdminRequest(
                    user.username,
                    requestType,
                    requestType === 'role' ? desiredRole : null
                  );
                }}
              >
                Send Request
              </button>
            </div>
          </div>
        ) : activeCompose ? (
          <div className="mobile-full-card">
            <div className="compose-header" style={{ cursor: 'default' }}>
              <div>
                {activeCompose.postId
                  ? `Edit: ${activeCompose.title || 'Post'}`
                  : activeCompose.title || 'New Post'}
              </div>
              <div className="compose-controls">
                <div
                  className="compose-ctrl-btn"
                  style={{ padding: '4px 10px', fontSize: '1rem' }}
                  onClick={() => closeComposeWindow(activeCompose.windowId)}
                >
                  ✕
                </div>
              </div>
            </div>
            {renderComposeBody(activeCompose)}
          </div>
        ) : showAdminView && user?.role === 'admin' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {}
            <div className="admin-panel">
              <div className="admin-panel-header">
                <div className="admin-panel-title" style={{ fontSize: '1.15rem' }}>
                  Users ({adminUsers.length})
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAdminView(false)}
                >
                  ← Feed
                </button>
              </div>
              <table className="mobile-admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role / Status</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((u) => {
                    const isExpanded = expandedAdminUserId === u.id;
                    return (
                      <>
                        <tr
                          key={u.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setExpandedAdminUserId(isExpanded ? null : u.id)}
                        >
                          <td>
                            <div className="notion-toggle-cell">
                              <span className={`notion-triangle ${isExpanded ? 'open' : ''}`}>
                                ▶
                              </span>
                              <div>
                                <strong>{u.username}</strong>
                                {u.admin_notification && (
                                  <div className="notif-pill" style={{ marginTop: '4px' }}>
                                    {u.admin_notification}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            {u.role.toUpperCase()} • {u.is_active ? 'Active' : 'Inactive'}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${u.id}-drawer`}>
                            <td colSpan="2" style={{ padding: 0 }}>
                              <div className="notion-toggle-drawer">
                                <div>
                                  <strong>User ID:</strong> #{u.id} • <strong>Posts:</strong>{' '}
                                  {u.post_count}
                                </div>
                                <div>
                                  <strong>Email:</strong> {u.email}
                                </div>

                                <div className="notion-action-group">
                                  <strong>Role:</strong>
                                  {['reader', 'author', 'admin'].map((r) => (
                                    <button
                                      key={r}
                                      type="button"
                                      className={`notion-pill-btn ${
                                        u.role === r ? 'active' : ''
                                      }`}
                                      onClick={() => handleSaveUserEdit(u.id, 'role', r)}
                                    >
                                      {r.toUpperCase()}
                                    </button>
                                  ))}
                                </div>

                                <div className="notion-action-group">
                                  <strong>Status:</strong>
                                  <button
                                    type="button"
                                    className={`notion-pill-btn ${
                                      Number(u.is_active) === 1 ? 'active' : ''
                                    }`}
                                    onClick={() => handleSaveUserEdit(u.id, 'activity', '1')}
                                  >
                                    Active
                                  </button>
                                  <button
                                    type="button"
                                    className={`notion-pill-btn ${
                                      Number(u.is_active) === 0 ? 'active' : ''
                                    }`}
                                    onClick={() => handleSaveUserEdit(u.id, 'activity', '0')}
                                  >
                                    Inactive
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {}
            <div className="admin-panel">
              <div className="admin-panel-header">
                <div className="admin-panel-title" style={{ fontSize: '1.15rem' }}>
                  Audit Logs
                </div>
              </div>
              <table className="mobile-admin-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedLogs.length === 0 ? (
                    <tr>
                      <td colSpan="2" style={{ color: '#777' }}>
                        No audit logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    pagedLogs.map((log) => {
                      const logOpen = expandedLogId === log.id;
                      return (
                        <>
                          <tr
                            key={log.id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setExpandedLogId(logOpen ? null : log.id)}
                          >
                            <td>
                              <div className="notion-toggle-cell">
                                <span className={`notion-triangle ${logOpen ? 'open' : ''}`}>
                                  ▶
                                </span>
                                <strong>{log.action_type.replace('_', ' ').toUpperCase()}</strong>
                              </div>
                            </td>
                            <td>{log.actor_username}</td>
                          </tr>
                          {logOpen && (
                            <tr key={`${log.id}-drawer`}>
                              <td colSpan="2" style={{ padding: 0 }}>
                                <div className="notion-toggle-drawer">
                                  <div>
                                    <strong>Details:</strong> {log.details}
                                  </div>
                                  <div>
                                    <strong>When:</strong> {formatShortDate(log.created_at)}
                                  </div>
                                  {log.action_type === 'post_edited' && log.post_id && (
                                    <div className="notion-action-group">
                                      <button
                                        type="button"
                                        className="notion-pill-btn"
                                        onClick={() => {
                                          setShowAdminView(false);
                                          openSinglePost({ id: log.post_id });
                                        }}
                                      >
                                        Open Edited Post →
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
              <div className="admin-pagination">
                <div>
                  Page {logPage + 1}/{totalLogPages}
                </div>
                <div className="admin-pagination-btns">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={logPage === 0}
                    onClick={() => setLogPage((p) => Math.max(0, p - 1))}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={logPage + 1 >= totalLogPages}
                    onClick={() => setLogPage((p) => Math.min(totalLogPages - 1, p + 1))}
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : selectedPost ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => setSelectedPost(null)}
            >
              ← Back to Feed
            </button>
            <div className="mobile-post-card">
              <div className="mobile-post-top">
                <button
                  type="button"
                  className="mobile-author-btn"
                  onClick={() => {
                    const authorName = selectedPost.author_name || user?.username || 'Unknown';
                    setSelectedAuthor({ id: selectedPost.author_id, name: authorName });
                    setSelectedPost(null);
                    setFilterMode('author');
                  }}
                >
                  {selectedPost.author_name || user?.username || 'Unknown'}
                </button>
              </div>
              <div className="mobile-post-body">
                <div className="mobile-post-title">{selectedPost.title}</div>
                {renderAllowedMarkdown(
                  selectedPost.markdown_content || selectedPost.content || ''
                )}
              </div>
              <div className="mobile-post-footer">
                <div>{formatShortDate(selectedPost.created_at)}</div>
                {user && (user.id === selectedPost.author_id || user.role === 'admin') && (
                  <div className="mobile-post-actions">
                    <button
                      type="button"
                      className="mobile-action-btn"
                      onClick={() => handleOpenSingleCompose(selectedPost)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="mobile-action-btn danger"
                      onClick={() => handleDeletePost(selectedPost.id, () => setSelectedPost(null))}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {((filterMode === 'author' && selectedAuthor) || filterMode === 'mine') && (
              <div className="filter-banner">
                <div>
                  {filterMode === 'author' && selectedAuthor
                    ? `Author: ${selectedAuthor.name}`
                    : 'My Posts'}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedAuthor(null);
                    setFilterMode('all');
                  }}
                >
                  Clear
                </button>
              </div>
            )}

            {displayedPosts.map((post) => {
              const authorName = post.author_name || user?.username || 'Unknown';
              const canEdit = user && (user.id === post.author_id || user.role === 'admin');
              const isExpanded = Boolean(expandedPosts[post.id]);
              const rawDisplay = post.markdown_content || post.content || '';
              const trimmedForLength = rawDisplay.replace(/\n+$/, '');
              const isLongPost = trimmedForLength.split('\n').length > 5 || trimmedForLength.length > 350;


              return (
                <div key={post.id} className="mobile-post-card">
                  <div className="mobile-post-top">
                    <button
                      type="button"
                      className="mobile-author-btn"
                      onClick={() => {
                        setSelectedAuthor({ id: post.author_id, name: authorName });
                        setFilterMode('author');
                      }}
                    >
                      {authorName}
                    </button>
                  </div>
                  <div className="mobile-post-body">
                    <div className="mobile-post-title" onClick={() => openSinglePost(post)}>
                      {post.title}
                    </div>
                    <div className={isLongPost && !isExpanded ? 'post-content-clamped has-more' : ''}>
                      {renderAllowedMarkdown(rawDisplay)}
                    </div>
                    {isLongPost && (
                      <button
                        type="button"
                        className="mobile-read-more"
                        onClick={() => toggleExpandPost(post.id)}
                      >
                        {isExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>
                  <div className="mobile-post-footer">
                    <div>{formatShortDate(post.created_at)}</div>
                    {canEdit && (
                      <div className="mobile-post-actions">
                        <button
                          type="button"
                          className="mobile-action-btn"
                          onClick={() => handleOpenSingleCompose(post)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="mobile-action-btn danger"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {}
      {!sidebarOpen && (
        <button
          type="button"
          className="mobile-sticky-bottom-left"
          aria-label="Open Menu"
          onClick={() => setSidebarOpen(true)}
        >
          →
        </button>
      )}

      {}
      {showBackToTop && !sidebarOpen && !activeCompose && (
        <button type="button" className="mobile-back-top-btn" onClick={scrollToTop}>
          ↑ Top
        </button>
      )}
    </div>
  );
}
