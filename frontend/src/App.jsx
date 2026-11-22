import { useState, useEffect, useRef } from 'react';
import './App.css';
import MobileLayout from './MobileLayout.jsx';

const API_HOST = window.location.hostname;
const IS_LOCAL = API_HOST === 'localhost' || API_HOST === '127.0.0.1';
const AUTH_URL = IS_LOCAL ? `http://${API_HOST}:4000` : '/auth';
const BLOG_URL = IS_LOCAL ? `http://${API_HOST}:5000/api` : '/api';

function renderInlineSpans(text) {
  if (!text) return null;

  const tokens = [];
  const openStack = [];
  let i = 0;
  let buffer = '';

  const flushBuffer = () => {
    if (buffer) {
      tokens.push({ type: 'text', value: buffer });
      buffer = '';
    }
  };

  const pushDelim = (d) => {
    flushBuffer();
    tokens.push({ type: 'delim', value: d });
    if (openStack.at(-1) === d) {
      openStack.pop();
    } else {
      openStack.push(d);
    }
  };

  while (i < text.length) {
    const three = text.slice(i, i + 3);
    const two = text.slice(i, i + 2);
    const one = text.at(i);

    if (
      three === '***' &&
      openStack.at(-1) === '*' &&
      openStack.at(-2) === '**'
    ) {
      pushDelim('*');
      pushDelim('**');
      i += 3;
    } else if (two === '**' || two === '~~') {
      pushDelim(two);
      i += 2;
    } else if (one === '*' || one === '_') {
      pushDelim(one);
      i += 1;
    } else {
      buffer += one;
      i += 1;
    }
  }
  flushBuffer();

  const parseRange = (start, end) => {
    const nodes = [];
    let idx = start;

    while (idx < end) {
      const tok = tokens.at(idx);
      if (tok.type === 'text') {
        nodes.push(tok.value);
        idx += 1;
        continue;
      }

      let closeIdx = -1;
      for (let j = end - 1; j > idx + 1; j -= 1) {
        if (tokens.at(j).type === 'delim' && tokens.at(j).value === tok.value) {
          closeIdx = j;
          break;
        }
      }

      if (closeIdx > idx + 1) {
        const inner = parseRange(idx + 1, closeIdx);
        const key = `${tok.value}-${idx}-${closeIdx}`;
        if (tok.value === '**') nodes.push(<strong key={key}>{inner}</strong>);
        else if (tok.value === '~~') nodes.push(<del key={key}>{inner}</del>);
        else if (tok.value === '*') nodes.push(<em key={key}>{inner}</em>);
        else if (tok.value === '_') nodes.push(<u key={key}>{inner}</u>);
        idx = closeIdx + 1;
      } else {
        nodes.push(tok.value);
        idx += 1;
      }
    }

    return nodes;
  };

  return <span style={{ display: 'inline' }}>{parseRange(0, tokens.length)}</span>;
}

function renderAllowedMarkdown(rawText) {
  if (!rawText) return null;
  const lines = rawText.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines.at(i);

    if (/^###\s+/.test(line)) {
      elements.push(<h3 key={i}>{line.replace(/^###\s+/, '')}</h3>);
      i += 1;
    } else if (/^##\s+/.test(line)) {
      elements.push(<h2 key={i}>{line.replace(/^##\s+/, '')}</h2>);
      i += 1;
    } else if (/^>\s+/.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^>\s+/.test(lines.at(i))) {
        quoteLines.push(lines.at(i).replace(/^>\s+/, ''));
        i += 1;
      }
      elements.push(
        <blockquote key={`q-${i}`}>{renderAllowedMarkdown(quoteLines.join('\n'))}</blockquote>
      );
    } else if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines.at(i))) {
        items.push(lines.at(i).replace(/^\s*[-*+]\s+/, ''));
        i += 1;
      }
      elements.push(
        <ul key={`ul-${i}`}>
          {items.map((item, liIdx) => (
            <li key={liIdx}>{item}</li>
          ))}
        </ul>
      );
    } else if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines.at(i))) {
        items.push(lines.at(i).replace(/^\s*\d+\.\s+/, ''));
        i += 1;
      }
      elements.push(
        <ol key={`ol-${i}`}>
          {items.map((item, liIdx) => (
            <li key={liIdx}>{item}</li>
          ))}
        </ol>
      );
    } else {
      elements.push(<p key={i}>{renderInlineSpans(line || '\u00A0')}</p>);
      i += 1;
    }
  }

  return <div className="md-body">{elements}</div>;
}
function inlineMarkdownToHtml(line) {
  if (!line) return '';

  const tokens = [];
  const openStack = [];
  let i = 0;
  let buffer = '';

  const escapeHtml = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const flushBuffer = () => {
    if (buffer) {
      tokens.push({ type: 'text', value: escapeHtml(buffer) });
      buffer = '';
    }
  };

  const pushDelim = (d) => {
    flushBuffer();
    tokens.push({ type: 'delim', value: d });
    if (openStack.at(-1) === d) {
      openStack.pop();
    } else {
      openStack.push(d);
    }
  };

  while (i < line.length) {
    const three = line.slice(i, i + 3);
    const two = line.slice(i, i + 2);
    const one = line.at(i);

    if (
      three === '***' &&
      openStack.at(-1) === '*' &&
      openStack.at(-2) === '**'
    ) {
      pushDelim('*');
      pushDelim('**');
      i += 3;
    } else if (two === '**' || two === '~~') {
      pushDelim(two);
      i += 2;
    } else if (one === '*' || one === '_') {
      pushDelim(one);
      i += 1;
    } else {
      buffer += one;
      i += 1;
    }
  }
  flushBuffer();

  const buildHtml = (start, end) => {
    let out = '';
    let idx = start;

    while (idx < end) {
      const tok = tokens.at(idx);
      if (tok.type === 'text') {
        out += tok.value;
        idx += 1;
        continue;
      }

      let closeIdx = -1;
      for (let j = end - 1; j > idx + 1; j -= 1) {
        if (tokens.at(j).type === 'delim' && tokens.at(j).value === tok.value) {
          closeIdx = j;
          break;
        }
      }

      if (closeIdx > idx + 1) {
        const inner = buildHtml(idx + 1, closeIdx);
        if (tok.value === '**') out += `<strong>${inner}</strong>`;
        else if (tok.value === '~~') out += `<del>${inner}</del>`;
        else if (tok.value === '*') out += `<em>${inner}</em>`;
        else if (tok.value === '_') out += `<u>${inner}</u>`;
        idx = closeIdx + 1;
      } else {
        out += tok.value;
        idx += 1;
      }
    }

    return out;
  };

  return buildHtml(0, tokens.length);
}

function markdownToEditorHtml(md) {
  if (!md) return '';
  return md
    .split('\n')
    .map((line) => {
      if (/^###\s+/.test(line)) return `<h3>${line.replace(/^###\s+/, '')}</h3>`;
      if (/^##\s+/.test(line)) return `<h2>${line.replace(/^##\s+/, '')}</h2>`;
      if (/^>\s+/.test(line)) {
        return `<blockquote>${inlineMarkdownToHtml(line.replace(/^>\s+/, ''))}</blockquote>`;
      }
      const formatted = inlineMarkdownToHtml(line);
      return `<div>${formatted || '<br>'}</div>`;
    })
    .join('');
}

function editorHtmlToMarkdown(containerEl) {
  if (!containerEl) return '';

  const serializeInline = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    const inner = Array.from(node.childNodes).map(serializeInline).join('');
    if (!inner) return '';

    if (tag === 'strong' || tag === 'b') return `**${inner}**`;
    if (tag === 'em' || tag === 'i') return `*${inner}*`;
    if (tag === 'u') return `_${inner}_`;
    if (tag === 'del' || tag === 's' || tag === 'strike') return `~~${inner}~~`;
    return inner;
  };

  const lines = [];
  const walkBlock = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent.trim()) lines.push(node.textContent);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();
    if (tag === 'h1' || tag === 'h2') {
      lines.push(`## ${node.textContent.trim()}`);
    } else if (tag === 'h3') {
      lines.push(`### ${node.textContent.trim()}`);
    } else if (tag === 'blockquote') {
      lines.push(`> ${serializeInline(node).trim()}`);
    } else if (tag === 'ul') {
      Array.from(node.children).forEach((li) => {
        lines.push(`- ${li.textContent.trim()}`);
      });
    } else if (tag === 'ol') {
      Array.from(node.children).forEach((li, idx) => {
        lines.push(`${idx + 1}. ${li.textContent.trim()}`);
      });
    } else if (tag === 'div' || tag === 'p') {
      lines.push(serializeInline(node));
    } else if (tag === 'br') {
      lines.push('');
    } else {
      lines.push(serializeInline(node));
    }
  };

  Array.from(containerEl.childNodes).forEach(walkBlock);
  return lines.join('\n');
}

function findUnclosedMarkdown(text) {
  if (!text) return null;

  const cleaned = text
    .replace(/\*\*[^*]+?\*\*/g, '')
    .replace(/~~[^~]+?~~/g, '')
    .replace(/(?<!\*)\*(?!\*)[^*]+?(?<!\*)\*(?!\*)/g, '')
    .replace(/(?<!_)_(?!_)[^_]+?(?<!_)_(?!_)/g, '');

  if (/\*\*\S/.test(cleaned)) return 'Missing closing ** for bold text';
  if (/~~\S/.test(cleaned)) return 'Missing closing ~~ for strikethrough';
  if (/(?<!\*)\*(?!\*)\S/.test(cleaned)) return 'Missing closing * for italic text';
  if (/(?<!_)_(?!_)\S/.test(cleaned)) return 'Missing closing _ for underline text';

  return null;
}
export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'reader',
  });

  const [allPosts, setAllPosts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [filterMode, setFilterMode] = useState('all');
  const [selectedAuthor, setSelectedAuthor] = useState(null);

  const [selectedPost, setSelectedPost] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [showBackToTop, setShowBackToTop] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showAdminView, setShowAdminView] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [logPage, setLogPage] = useState(0);
  const [editingCell, setEditingCell] = useState({ userId: null, field: null, value: '' });
  const [contactModal, setContactModal] = useState({
    open: false,
    requestType: 'role',
    desiredRole: 'author',
  });

  const [composeWindows, setComposeWindows] = useState([]);
  const [activeFullTabId, setActiveFullTabId] = useState(null);
  const [mdTooltips, setMdTooltips] = useState({});
  const editorRefs = useRef({});

  const [sidebarToast, setSidebarToast] = useState(null);
  const toastTimerRef = useRef(null);

  const [promptBox, setPromptBox] = useState({
    open: false,
    title: '',
    message: '',
    isConfirm: false,
    onConfirm: null,
  });

  const mainScrollRef = useRef(null);

  const showSidebarToast = (message) => {
    setSidebarToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setSidebarToast(null);
    }, 1500);
  };

  const showAlert = (title, message, onClose = null) => {
    setPromptBox({
      open: true,
      title,
      message,
      isConfirm: false,
      onConfirm: onClose,
    });
  };

  const showConfirm = (title, message, onConfirm) => {
    setPromptBox({
      open: true,
      title,
      message,
      isConfirm: true,
      onConfirm,
    });
  };

  const closePrompt = () => {
    setPromptBox((prev) => ({ ...prev, open: false }));
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    document.title = 'Blog';
    const ns = ['http:/', 'www.w3.org', '2000', 'svg'].join('/');
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', '#181818');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML =
      '<path d="M12 19l7-7 3 3-7 7-3-3z"/>' +
      '<path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>' +
      '<path d="M2 2l7.586 7.586"/>' +
      '<circle cx="11" cy="11" r="2"/>';

    const xml = new XMLSerializer().serializeToString(svg);
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = 'data:image/svg+xml,' + encodeURIComponent(xml);
    document.head.appendChild(link);
  }, []);

  const parseJwt = (token) => {
    try {
      if (!token || typeof token !== 'string') return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64 = parts.at(1).replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(base64));
      return decoded && decoded.id && decoded.role ? decoded : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const parsed = parseJwt(token);
      setUser(parsed);
      if (parsed?.role === 'admin') {
        checkAdminNotifications(false);
      }
    }
    fetchPosts();
  }, [filterMode]);

  useEffect(() => {
    if (user?.role === 'admin') {
      checkAdminNotifications(false);
    }
  }, [user?.role]);

  useEffect(() => {
    const onWindowScroll = () => {
      if (window.scrollY > 120) {
        setShowBackToTop(true);
      } else if (!mainScrollRef.current || mainScrollRef.current.scrollTop <= 120) {
        setShowBackToTop(false);
      }
    };
    window.addEventListener('scroll', onWindowScroll);
    return () => window.removeEventListener('scroll', onWindowScroll);
  }, []);

  const apiFetch = async (url, options = {}) => {
    let token = localStorage.getItem('accessToken');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers.Authorization = `Bearer ${token}`;

    let res = await fetch(url, { ...options, headers });

    if (res.status === 401 && localStorage.getItem('refreshToken')) {
      const refreshRes = await fetch(`${AUTH_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') }),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem('accessToken', data.accessToken);
        setUser(parseJwt(data.accessToken));
        headers.Authorization = `Bearer ${data.accessToken}`;
        res = await fetch(url, { ...options, headers });
      } else {
        performLogout();
      }
    }
    return res;
  };

  const refreshCurrentUser = async () => {
    try {
      const res = await apiFetch(`${AUTH_URL}/me`);
      if (res.ok) {
        const freshUser = await res.json();
        setUser((prev) => (prev ? { ...prev, ...freshUser } : freshUser));
      }
    } catch {
    }
  };

  const fetchPosts = async () => {
    const endpoint = filterMode === 'mine' ? `${BLOG_URL}/me/posts` : `${BLOG_URL}/posts`;
    const res = filterMode === 'mine' ? await apiFetch(endpoint) : await fetch(endpoint);

    if (res.ok) {
      const data = await res.json();
      setAllPosts(Array.isArray(data) ? data : []);
      setVisibleCount(5);
    }
  };

  const handleScroll = () => {
    const el = mainScrollRef.current;
    if (!el) return;
    setShowBackToTop(el.scrollTop > 120);
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setVisibleCount((prev) => prev + 5);
    }
  };

  const scrollToTop = () => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const checkAdminNotifications = async (showPopup = false) => {
    const [usersRes, logsRes] = await Promise.all([
      apiFetch(`${AUTH_URL}/admin/users`),
      apiFetch(`${AUTH_URL}/admin/logs`),
    ]);

    if (usersRes.ok) {
      const data = await usersRes.json();
      setAdminUsers(data);
      const pendingUsers = data.filter((u) => Boolean(u.admin_notification));

      if (showPopup && pendingUsers.length > 0) {
        const count = pendingUsers.length;
        showConfirm(
          `Administrator Alert (${count} Pending ${count === 1 ? 'Request' : 'Requests'})`,
          `You have ${count} user ${count === 1 ? 'notification' : 'notifications'} awaiting review. Open the Administrator table now?`,
          () => {
            setShowSettings(true);
            setShowAdminView(true);
          }
        );
      }
    }

    if (logsRes.ok) {
      const logsData = await logsRes.json();
      setAdminLogs(logsData);
      setLogPage(0);
    }
  };

  const handleSaveUserEdit = async (targetUserId, field, newValue) => {
    const endpoint =
      field === 'role'
        ? `${AUTH_URL}/admin/users/${targetUserId}/role`
        : `${AUTH_URL}/admin/users/${targetUserId}/activity`;

    const body = field === 'role' ? { role: newValue } : { is_active: Number(newValue) };

    const res = await apiFetch(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setEditingCell({ userId: null, field: null, value: '' });
      checkAdminNotifications(false);
      showSidebarToast(`User ${field === 'role' ? 'role' : 'activity'} saved.`);
    } else {
      const err = await res.json();
      showAlert('Update Failed', err.message || 'Failed to update user.');
    }
  };

  const submitAdminRequest = async (targetUsername, requestType, desiredRole) => {
    const res = await fetch(`${AUTH_URL}/request-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: targetUsername, requestType, desiredRole }),
    });
    const data = await res.json();
    if (res.ok) {
      if (user && user.username === targetUsername) {
        setUser({ ...user, admin_notification: data.notification });
      }
      showSidebarToast('Request sent to Administrator.');
    } else {
      if (res.status === 409 && user && user.username === targetUsername) {
        setUser({ ...user, admin_notification: data.pendingNotification });
      }
      showAlert('Request Pending', data.message || 'Could not send request.');
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/login' : '/register';
    const res = await fetch(`${AUTH_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authForm),
    });
    const data = await res.json();

    if (!res.ok) {
      if (
        authMode === 'login' &&
        (res.status === 404 || data.message === 'User does not exist')
      ) {
        showAlert(
          'Account Not Found',
          'That username does not exist yet. Switching to the Sign Up form.',
          () => setAuthMode('register')
        );
        return;
      }
      if (authMode === 'login' && (res.status === 403 || data.code === 'INACTIVE_ACCOUNT')) {
        showConfirm(
          'Account Inactive',
          'Your account is currently inactive. Send an activity reactivation request to the Administrator?',
          () => submitAdminRequest(authForm.username, 'activity', null)
        );
        return;
      }
      return showAlert('Authentication Error', data.message || 'Authentication failed.');
    }

    if (authMode === 'login') {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      const parsed = parseJwt(data.accessToken);
      setUser(parsed);
      setAuthForm({ username: '', email: '', password: '', role: 'reader' });
      
      refreshCurrentUser();

      if (parsed?.role === 'admin') {
        checkAdminNotifications(true);
      }
      showSidebarToast(`Signed in as ${parsed?.username || 'user'}.`);
    }
  };

  const performLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await fetch(`${AUTH_URL}/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
      }
    }
    localStorage.clear();
    setUser(null);
    setAdminUsers([]);
    setAdminLogs([]);
    setFilterMode('all');
    setSelectedAuthor(null);
    setSelectedPost(null);
    setShowSettings(false);
    setShowAdminView(false);
    setComposeWindows([]);
    setActiveFullTabId(null);
    setMdTooltips({});
  };

  const handleLogoutClick = () => {
    showConfirm('Log Out', 'Are you sure you want to log out of your account?', () => {
      performLogout();
    });
  };
  const clearMdTooltip = (windowId) => {
    setMdTooltips((prev) => {
      const next = { ...prev };
      delete next[windowId];
      return next;
    });
  };

  const openComposeWindow = (postToEdit = null) => {
    if (postToEdit) {
      const alreadyOpen = composeWindows.find((w) => w.postId === postToEdit.id);
      if (alreadyOpen) {
        if (alreadyOpen.fullscreen) setActiveFullTabId(alreadyOpen.windowId);
        return;
      }
    }

    if (composeWindows.length >= 3) {
      showAlert(
        'Window Limit Reached',
        'You can only open up to 3 compose windows at once. Please publish or close an existing window first.'
      );
      return;
    }

    const isCurrentlyFullView = composeWindows.some((w) => w.fullscreen);

    const newWin = {
      windowId: Date.now() + Math.random(),
      postId: postToEdit ? postToEdit.id : null,
      title: postToEdit ? postToEdit.title : '',
      content: postToEdit ? postToEdit.markdown_content || postToEdit.content : '',
      minimized: false,
      fullscreen: isCurrentlyFullView,
    };

    setComposeWindows((prev) => [...prev, newWin]);
    if (isCurrentlyFullView) {
      setActiveFullTabId(newWin.windowId);
    }
  };

    const updateComposeField = (windowId, field, value) => {
    setComposeWindows((prev) =>
      prev.map((w) => (w.windowId === windowId ? { ...w, [field]: value } : w))
    );
  };

  const closeComposeWindow = (windowId) => {
    delete editorRefs.current[windowId];
    clearMdTooltip(windowId);
    setComposeWindows((prev) => {
      const remaining = prev.filter((w) => w.windowId !== windowId);
      if (activeFullTabId === windowId) {
        setActiveFullTabId(remaining.at(0)?.windowId || null);
      }
      return remaining;
    });
  };

  const setWindowFullView = (targetWindowId, makeFull) => {
    const latestContents = {};
    composeWindows.forEach((w) => {
      const el = editorRefs.current[w.windowId];
      if (el) {
        latestContents[w.windowId] = editorHtmlToMarkdown(el);
      }
      delete editorRefs.current[w.windowId];
    });

    setComposeWindows((prev) =>
      prev.map((w) => ({
        ...w,
        content: latestContents[w.windowId] !== undefined ? latestContents[w.windowId] : w.content,
        minimized: false,
        fullscreen: makeFull,
      }))
    );

    if (makeFull) {
      setActiveFullTabId(targetWindowId);
    } else {
      setActiveFullTabId(null);
    }
  };

  const getCurrentBlockElement = (rootEl, node) => {
    let curr = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (curr && curr !== rootEl) {
      const tag = curr.tagName?.toLowerCase();
      if (['div', 'p', 'h2', 'h3', 'blockquote', 'li'].includes(tag)) {
        return curr;
      }
      curr = curr.parentElement;
    }
    return null;
  };

  const isInsideTag = (rootEl, node, tagNames) => {
    let curr = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (curr && curr !== rootEl) {
      if (tagNames.includes(curr.tagName?.toLowerCase())) return curr;
      curr = curr.parentElement;
    }
    return null;
  };

  const toggleInlineTag = (rootEl, tagName) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!rootEl.contains(range.commonAncestorContainer)) return;

    let ancestor =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : range.commonAncestorContainer;

    while (ancestor && ancestor !== rootEl) {
      if (ancestor.tagName?.toLowerCase() === tagName.toLowerCase()) {
        const parent = ancestor.parentNode;
        while (ancestor.firstChild) {
          parent.insertBefore(ancestor.firstChild, ancestor);
        }
        parent.removeChild(ancestor);
        return;
      }
      ancestor = ancestor.parentElement;
    }

    const wrapper = document.createElement(tagName);
    if (range.collapsed) {
      wrapper.textContent = '\u200B';
      range.insertNode(wrapper);
      const newRange = document.createRange();
      newRange.setStart(wrapper.firstChild, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } else {
      const fragment = range.extractContents();
      wrapper.appendChild(fragment);
      range.insertNode(wrapper);
      const newRange = document.createRange();
      newRange.selectNodeContents(wrapper);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  };

  const toggleBlockTag = (rootEl, targetTag) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!rootEl.contains(range.commonAncestorContainer)) return;

    const block = getCurrentBlockElement(rootEl, range.startContainer);
    const nextTag = block?.tagName?.toLowerCase() === targetTag ? 'div' : targetTag;
    const newEl = document.createElement(nextTag);

    if (block) {
      newEl.innerHTML = block.innerHTML || '<br>';
      block.parentNode.replaceChild(newEl, block);
    } else {
      newEl.innerHTML = '<br>';
      rootEl.appendChild(newEl);
    }

    const newRange = document.createRange();
    newRange.selectNodeContents(newEl);
    newRange.collapse(false);
    sel.removeAllRanges();
    sel.addRange(newRange);
  };

  const toggleListTag = (rootEl, listTag) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!rootEl.contains(range.commonAncestorContainer)) return;

    const block = getCurrentBlockElement(rootEl, range.startContainer);
    if (block?.tagName?.toLowerCase() === 'li') {
      const listEl = block.parentElement;
      const div = document.createElement('div');
      div.innerHTML = block.innerHTML || '<br>';
      listEl.parentNode.insertBefore(div, listEl);
      block.remove();
      if (listEl.children.length === 0) listEl.remove();
      return;
    }

    const listEl = document.createElement(listTag);
    const li = document.createElement('li');
    li.innerHTML = block ? block.innerHTML || '<br>' : '<br>';
    listEl.appendChild(li);

    if (block) {
      block.parentNode.replaceChild(listEl, block);
    } else {
      rootEl.appendChild(listEl);
    }

    const newRange = document.createRange();
    newRange.selectNodeContents(li);
    newRange.collapse(false);
    sel.removeAllRanges();
    sel.addRange(newRange);
  };

  const execEditorFormat = (win, cmd) => {
    const el = editorRefs.current[win.windowId];
    if (!el) return;
    if (document.activeElement !== el) el.focus();

    const sel = window.getSelection();
    const anchor = sel?.anchorNode;

    if (
      ['bold', 'italic', 'underline', 'strike'].includes(cmd) &&
      isInsideTag(el, anchor, ['ul', 'ol', 'li'])
    ) {
      return;
    }

    if (cmd === 'h2') toggleBlockTag(el, 'h2');
    else if (cmd === 'h3') toggleBlockTag(el, 'h3');
    else if (cmd === 'quote') toggleBlockTag(el, 'blockquote');
    else if (cmd === 'bold') toggleInlineTag(el, 'strong');
    else if (cmd === 'italic') toggleInlineTag(el, 'em');
    else if (cmd === 'underline') toggleInlineTag(el, 'u');
    else if (cmd === 'strike') toggleInlineTag(el, 'del');
    else if (cmd === 'ul') toggleListTag(el, 'ul');
    else if (cmd === 'ol') toggleListTag(el, 'ol');

    updateComposeField(win.windowId, 'content', editorHtmlToMarkdown(el));
  };
  
  const handleEditorKeyDown = (e, win) => {
    const el = editorRefs.current[win.windowId];
    if (!el) return;

    const isMod = e.ctrlKey || e.metaKey;
    const keyLower = e.key.toLowerCase();

    if (isMod && !e.altKey && !e.shiftKey && keyLower === 'b') {
      e.preventDefault();
      execEditorFormat(win, 'bold');
      return;
    }
    if (isMod && !e.altKey && !e.shiftKey && keyLower === 'i') {
      e.preventDefault();
      execEditorFormat(win, 'italic');
      return;
    }
    if (isMod && !e.altKey && !e.shiftKey && keyLower === 'u') {
      e.preventDefault();
      execEditorFormat(win, 'underline');
      return;
    }
    if (
      e.altKey &&
      e.shiftKey &&
      !isMod &&
      (e.code === 'Backquote' || e.key === '`' || e.key === '~')
    ) {
      e.preventDefault();
      execEditorFormat(win, 'strike');
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    if (e.key === 'Backspace' && range.collapsed) {
      const anchor = range.startContainer;
      const offset = range.startOffset;

      const inlineEl = isInsideTag(el, anchor, ['strong', 'em', 'u', 'del']);
      const prevSibling =
        anchor.nodeType === Node.TEXT_NODE && offset === 0
          ? anchor.previousSibling
          : anchor.nodeType === Node.ELEMENT_NODE && offset > 0
            ? anchor.childNodes[offset - 1]
            : null;

      const targetInline =
        inlineEl ||
        (prevSibling && ['STRONG', 'EM', 'U', 'DEL'].includes(prevSibling.nodeName)
          ? prevSibling
          : null);

      if (targetInline) {
        e.preventDefault();
        const tag = targetInline.tagName.toLowerCase();
        const rawText = targetInline.textContent.replace(/\u200B/g, '');
        let mdString = rawText;
        if (tag === 'strong') mdString = `**${rawText}**`;
        else if (tag === 'em') mdString = `*${rawText}*`;
        else if (tag === 'u') mdString = `_${rawText}_`;
        else if (tag === 'del') mdString = `~~${rawText}~~`;

        const textNode = document.createTextNode(mdString);
        targetInline.parentNode.replaceChild(textNode, targetInline);

        const newRange = document.createRange();
        newRange.setStart(textNode, mdString.length);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        return;
      }

      const block = getCurrentBlockElement(el, anchor);
      if (block && ['h2', 'h3', 'blockquote'].includes(block.tagName?.toLowerCase())) {
        const atStart = offset === 0 && (anchor === block || anchor === block.firstChild);
        if (atStart) {
          e.preventDefault();
          const bTag = block.tagName.toLowerCase();
          const prefix = bTag === 'h3' ? '### ' : bTag === 'h2' ? '## ' : '> ';
          const div = document.createElement('div');
          const textNode = document.createTextNode(prefix + block.textContent);
          div.appendChild(textNode);
          block.parentNode.replaceChild(div, block);

          const newRange = document.createRange();
          newRange.setStart(textNode, prefix.length);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
          return;
        }
      }
    }

    if (e.key !== 'Enter') return;

    const block = getCurrentBlockElement(el, range.startContainer);

    if (block?.tagName?.toLowerCase() === 'li') {
      const cleanText = block.textContent.replace(/\u200B/g, '').trim();
      if (cleanText === '') {
        e.preventDefault();
        const listEl = block.parentElement;
        const newDiv = document.createElement('div');
        newDiv.innerHTML = '<br>';
        listEl.parentNode.insertBefore(newDiv, listEl.nextSibling);
        block.remove();
        if (listEl.children.length === 0) listEl.remove();

        const newRange = document.createRange();
        newRange.setStart(newDiv, 0);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
      return;
    }

    e.preventDefault();

    const newDiv = document.createElement('div');
    newDiv.innerHTML = '<br>';

    if (block && block.parentNode === el) {
      el.insertBefore(newDiv, block.nextSibling);
    } else {
      el.appendChild(newDiv);
    }

    const newRange = document.createRange();
    newRange.setStart(newDiv, 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    if (mdTooltips[win.windowId]) {
      setMdTooltips((prev) => ({ ...prev, [win.windowId]: null }));
    }
  };

  const handleEditorKeyUp = (e, win) => {
    const el = editorRefs.current[win.windowId];
    if (!el) return;

    const sel = window.getSelection();
    if (
      (e.key === ' ' || e.key === 'Backspace' || e.key === 'Enter') &&
      sel &&
      sel.rangeCount > 0
    ) {
      const node = sel.anchorNode;
      if (node && node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;

        if (/^###\s$/.test(text)) {
          node.textContent = '';
          toggleBlockTag(el, 'h3');
        } else if (/^##\s$/.test(text)) {
          node.textContent = '';
          toggleBlockTag(el, 'h2');
        } else if (/^#\s$/.test(text)) {
          node.textContent = '';
          toggleBlockTag(el, 'h2');
          showSidebarToast('Heading 1 (#) converted to Heading 2 (##).');
        } else if (/^>\s$/.test(text)) {
          node.textContent = '';
          toggleBlockTag(el, 'blockquote');
        } else if (/^-\s$/.test(text)) {
          node.textContent = '';
          toggleListTag(el, 'ul');
        } else if (/^1\.\s$/.test(text)) {
          node.textContent = '';
          toggleListTag(el, 'ol');
        } else if (!isInsideTag(el, node, ['ul', 'ol', 'li', 'h2', 'h3'])) {
          const rx =
            e.key === ' '
              ? /(\S*(?:\*\*|\*|_|~~)\S+(?:\*\*|\*|_|~~))\s$/
              : /(\S*(?:\*\*|\*|_|~~)\S+(?:\*\*|\*|_|~~))$/;
          const m = text.match(rx);

          if (m) {
            const rawPhrase = m.at(1);
            const renderedHtml = inlineMarkdownToHtml(rawPhrase);
            if (renderedHtml !== rawPhrase) {
              const beforeText = text.slice(0, m.index);
              const parent = node.parentNode;

              if (beforeText) {
                parent.insertBefore(document.createTextNode(beforeText), node);
              }

              const tempSpan = document.createElement('span');
              tempSpan.innerHTML = renderedHtml;
              let lastInserted = null;
              while (tempSpan.firstChild) {
                lastInserted = tempSpan.firstChild;
                parent.insertBefore(lastInserted, node);
              }

              if (e.key === ' ') {
                const trailingSpace = document.createTextNode('\u00A0');
                parent.insertBefore(trailingSpace, node);
                parent.removeChild(node);

                const newRange = document.createRange();
                newRange.setStart(trailingSpace, 1);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);
              } else {
                parent.removeChild(node);
                if (lastInserted) {
                  const newRange = document.createRange();
                  newRange.setStartAfter(lastInserted);
                  newRange.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(newRange);
                }
              }
            }
          }
        }
      }
    }

    const activeText = sel?.anchorNode?.textContent || '';
    const warning = findUnclosedMarkdown(activeText);
    setMdTooltips((prev) => ({ ...prev, [win.windowId]: warning }));

    updateComposeField(win.windowId, 'content', editorHtmlToMarkdown(el));
  };

  const syncEditorMarkdownNow = (win) => {
    const el = editorRefs.current[win.windowId];
    if (!el) return;

    const currentMd = editorHtmlToMarkdown(el);
    const expectedHtml = markdownToEditorHtml(currentMd);

    if (el.innerHTML !== expectedHtml) {
      const isFocused = document.activeElement === el;
      let savedOffset = null;

      if (isFocused) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const preRange = range.cloneRange();
          preRange.selectNodeContents(el);
          preRange.setEnd(range.startContainer, range.startOffset);
          savedOffset = preRange.toString().length;
        }
      }

      el.innerHTML = expectedHtml;

      if (isFocused && savedOffset !== null) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let remaining = savedOffset;
        let targetNode = null;
        let targetPos = 0;

        while (walker.nextNode()) {
          const len = walker.currentNode.textContent.length;
          if (remaining <= len) {
            targetNode = walker.currentNode;
            targetPos = remaining;
            break;
          }
          remaining -= len;
        }

        if (targetNode) {
          const sel = window.getSelection();
          const newRange = document.createRange();
          newRange.setStart(targetNode, targetPos);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      }
    }

    const sel = window.getSelection();
    const activeText =
      document.activeElement === el
        ? sel?.anchorNode?.textContent || ''
        : el.textContent || '';
    setMdTooltips((prev) => ({
      ...prev,
      [win.windowId]: findUnclosedMarkdown(activeText),
    }));

    updateComposeField(win.windowId, 'content', currentMd);
  };

  useEffect(() => {
    if (composeWindows.length === 0) return undefined;
    const intervalId = setInterval(() => {
      composeWindows.forEach((win) => {
        if (!win.minimized) {
          syncEditorMarkdownNow(win);
        }
      });
    }, 2000);
    return () => clearInterval(intervalId);
  }, [composeWindows]);

  const executeSavePost = async (win, finalContent) => {
    const isEdit = Boolean(win.postId);
    const url = isEdit ? `${BLOG_URL}/posts/${win.postId}` : `${BLOG_URL}/posts`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
      method,
      body: JSON.stringify({ title: win.title, content: finalContent }),
    });

    if (res.ok) {
      clearMdTooltip(win.windowId);
      closeComposeWindow(win.windowId);
      fetchPosts();
      if (selectedPost && selectedPost.id === win.postId) {
        openSinglePost({ id: win.postId });
      }
      showSidebarToast(isEdit ? 'Post saved.' : 'Post published.');
    } else {
      const err = await res.json();
      showAlert('Save Failed', err.message || 'Failed to save post.');
    }
  };

  const submitComposeWindow = async (win) => {
    const el = editorRefs.current[win.windowId];
    const latestContent = el ? editorHtmlToMarkdown(el) : win.content;

    if (!win.title.trim() || !latestContent.trim()) {
      return showAlert('Missing Fields', 'Both a title and content are required.');
    }

    if (/^#\s+/m.test(latestContent)) {
      const convertedContent = latestContent.replace(/^#\s+/gm, '## ');
      showAlert(
        'Heading 1 Converted',
        'Heading 1 (#) is not supported and will be automatically converted to Heading 2 (##).',
        () => executeSavePost(win, convertedContent)
      );
      return;
    }

    await executeSavePost(win, latestContent);
  };

  const handleDeletePost = (postId, onDeleted = null) => {
    showConfirm('Delete Post', 'Are you sure you want to permanently delete this post?', async () => {
      const res = await apiFetch(`${BLOG_URL}/posts/${postId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPosts();
        if (onDeleted) onDeleted();
        showSidebarToast('Post deleted.');
      } else {
        const err = await res.json();
        showAlert('Delete Failed', err.message || 'Failed to delete post.');
      }
    });
  };

  const openSinglePost = async (post) => {
    try {
      const res = await fetch(`${BLOG_URL}/posts/${post.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPost(Array.isArray(data) ? data.at(0) : data);
        return;
      }
    } catch {
    }
    if (post.title) setSelectedPost(post);
    else showAlert('Post Unavailable', 'This post could not be loaded.');
  };

  const toggleExpandPost = (postId) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const displayedPosts = allPosts
    .filter((post) => {
      if (filterMode === 'author' && selectedAuthor) {
        return post.author_id === selectedAuthor.id;
      }
      return true;
    })
    .slice(0, visibleCount);

  const pendingNotificationCount = adminUsers.filter(
    (u) => typeof u.admin_notification === 'string' && u.admin_notification.trim().length > 0
  ).length;
  const totalLogPages = Math.max(1, Math.ceil(adminLogs.length / 5));
  const pagedLogs = adminLogs.slice(logPage * 5, logPage * 5 + 5);
  const fullViewWindows = composeWindows.filter((w) => w.fullscreen);
  const activeFullWindow =
    fullViewWindows.find((w) => w.windowId === activeFullTabId) ||
    fullViewWindows.at(0) ||
    null;
  const renderComposeBody = (win) => (
    <div className="compose-body">
      <input
        type="text"
        placeholder="Title"
        value={win.title}
        onChange={(e) => updateComposeField(win.windowId, 'title', e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const editorEl = editorRefs.current[win.windowId];
            if (editorEl) editorEl.focus();
          }
        }}
      />

      <div
        key={win.windowId}
        className="inline-md-editor"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Write your entry..."
        ref={(el) => {
          if (el) {
            if (!editorRefs.current[win.windowId]) {
              editorRefs.current[win.windowId] = el;
              el.innerHTML = markdownToEditorHtml(win.content);
            }
          } else {
            delete editorRefs.current[win.windowId];
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          const plainText = e.clipboardData.getData('text/plain');
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(plainText);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
          const el = editorRefs.current[win.windowId];
          if (el) updateComposeField(win.windowId, 'content', editorHtmlToMarkdown(el));
        }}
        onKeyDown={(e) => handleEditorKeyDown(e, win)}
        onKeyUp={(e) => handleEditorKeyUp(e, win)}
      />

      {mdTooltips[win.windowId] && (
        <div className="md-closer-tooltip">
          <span>⚠ {mdTooltips[win.windowId]}</span>
        </div>
      )}

      <div className="gmail-toolbar">
        <div
          className="gmail-tool-btn"
          title="Heading 2"
          onMouseDown={(e) => {
            e.preventDefault();
            execEditorFormat(win, 'h2');
          }}
        >
          H2
        </div>
        <div
          className="gmail-tool-btn"
          title="Heading 3"
          onMouseDown={(e) => {
            e.preventDefault();
            execEditorFormat(win, 'h3');
          }}
        >
          H3
        </div>
        <div className="gmail-tool-divider" />
        <div
          className="gmail-tool-btn"
          title="Bold (Ctrl+B)"
          onMouseDown={(e) => {
            e.preventDefault();
            execEditorFormat(win, 'bold');
          }}
        >
          <strong>B</strong>
        </div>
        <div
          className="gmail-tool-btn"
          title="Italic (Ctrl+I)"
          onMouseDown={(e) => {
            e.preventDefault();
            execEditorFormat(win, 'italic');
          }}
        >
          <em>I</em>
        </div>
        <div
          className="gmail-tool-btn"
          title="Underline (Ctrl+U)"
          onMouseDown={(e) => {
            e.preventDefault();
            execEditorFormat(win, 'underline');
          }}
        >
          <u>U</u>
        </div>
        <div
          className="gmail-tool-btn"
          title="Strikethrough (Alt+Shift+`)"
          onMouseDown={(e) => {
            e.preventDefault();
            execEditorFormat(win, 'strike');
          }}
        >
          <del>S</del>
        </div>
        <div className="gmail-tool-divider" />
        <div
          className="gmail-tool-btn"
          title="Quote"
          onMouseDown={(e) => {
            e.preventDefault();
            execEditorFormat(win, 'quote');
          }}
        >
          &ldquo;
        </div>
        <div
          className="gmail-tool-btn"
          title="Bulleted List"
          onMouseDown={(e) => {
            e.preventDefault();
            execEditorFormat(win, 'ul');
          }}
        >
          •
        </div>
        <div
          className="gmail-tool-btn"
          title="Numbered List"
          onMouseDown={(e) => {
            e.preventDefault();
            execEditorFormat(win, 'ol');
          }}
        >
          1.
        </div>
      </div>

      <div className="compose-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => submitComposeWindow(win)}
        >
          {win.postId ? 'Save Changes' : 'Publish'}
        </button>
      </div>
    </div>
  );

  const [isCompactViewport, setIsCompactViewport] = useState(
    () => window.innerWidth <= 820 || window.innerHeight > window.innerWidth * 1.15
  );

  useEffect(() => {
    const checkViewport = () => {
      setIsCompactViewport(
        window.innerWidth <= 820 || window.innerHeight > window.innerWidth * 1.15
      );
    };
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  if (isCompactViewport) {
    return (
      <MobileLayout
        user={user}
        authMode={authMode}
        setAuthMode={setAuthMode}
        authForm={authForm}
        setAuthForm={setAuthForm}
        handleAuthSubmit={handleAuthSubmit}
        handleLogoutClick={handleLogoutClick}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        showAdminView={showAdminView}
        setShowAdminView={setShowAdminView}
        adminUsers={adminUsers}
        pagedLogs={pagedLogs}
        logPage={logPage}
        setLogPage={setLogPage}
        totalLogPages={totalLogPages}
        adminLogs={adminLogs}
        handleSaveUserEdit={handleSaveUserEdit}
        checkAdminNotifications={checkAdminNotifications}
        pendingNotificationCount={pendingNotificationCount}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        selectedAuthor={selectedAuthor}
        setSelectedAuthor={setSelectedAuthor}
        selectedPost={selectedPost}
        setSelectedPost={setSelectedPost}
        displayedPosts={displayedPosts}
        expandedPosts={expandedPosts}
        toggleExpandPost={toggleExpandPost}
        openSinglePost={openSinglePost}
        handleDeletePost={handleDeletePost}
        renderAllowedMarkdown={renderAllowedMarkdown}
        composeWindows={composeWindows}
        openComposeWindow={openComposeWindow}
        closeComposeWindow={closeComposeWindow}
        renderComposeBody={renderComposeBody}
        contactModal={contactModal}
        setContactModal={setContactModal}
        submitAdminRequest={submitAdminRequest}
        promptBox={promptBox}
        closePrompt={closePrompt}
        sidebarToast={sidebarToast}
        setSidebarToast={setSidebarToast}
        showBackToTop={showBackToTop}
        scrollToTop={scrollToTop}
      />
    );
  }

  return (
    <div className="app-layout">
      {}
      <div className="app-header">
        <div className="header-left">
          <div className="header-title">Blog</div>
          <div className="header-date">{todayFormatted}</div>
        </div>
        <div className="header-right">
          {user ? (
            <div>
              User: <strong>{user.username}</strong> &nbsp;|&nbsp; Role:{' '}
              <strong>{user.role?.toUpperCase()}</strong>
            </div>
          ) : (
            <div>Guest &nbsp;|&nbsp; Read-Only</div>
          )}
        </div>
      </div>

      <div className="content-wrapper">
        {}
        <div className="app-sidebar">
          <div>
            <div className="sidebar-section-title">Miniature</div>
            <div className="sidebar-desc">
              Minimalist blog for your quick thoughts. No drafts, rapid fire. Freedom is in limitation.
            </div>
          </div>

          {!user ? (
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <div
                style={{
                  fontSize: '0.8rem',
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
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: '#111',
                  }}
                >
                  Profile Summary
                </div>
                <div className="profile-row">
                  <strong>Username:</strong> {user.username}
                </div>
                <div className="profile-row">
                  <strong>Email:</strong> {user.email}
                </div>
                <div className="profile-row">
                  <strong>Role:</strong> {user.role?.toUpperCase()}
                </div>
                <div className="profile-row">
                  <strong>User ID:</strong> #{user.id}
                </div>
              </div>

              {user.role !== 'admin' && (
                user.admin_notification ? (
                  <div
                    className="btn btn-secondary"
                    style={{ opacity: 0.55, cursor: 'not-allowed' }}
                    title={`Pending: ${user.admin_notification}`}
                    onClick={() =>
                      showAlert(
                        'Request Pending',
                        `Your previous request ("${user.admin_notification}") has not been fulfilled yet.`
                      )
                    }
                  >
                    Request Pending
                  </div>
                ) : (
                  <div
                    className="btn btn-secondary"
                    onClick={() =>
                      setContactModal({
                        open: true,
                        requestType: 'role',
                        desiredRole: user.role === 'reader' ? 'author' : 'admin',
                      })
                    }
                  >
                    Contact Admin
                  </div>
                )
              )}

              {user.role === 'admin' && (
                <div
                  className="btn btn-primary"
                  onClick={() => {
                    setShowAdminView(true);
                    checkAdminNotifications(false);
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
              <div className="btn btn-danger" onClick={handleLogoutClick}>
                Logout
              </div>
            </div>
          ) : (
            <div className="sidebar-nav">
              {user.role === 'admin' && pendingNotificationCount > 0 && (
                <div
                  className="notif-pill"
                  style={{
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginBottom: '4px',
                  }}
                >
                  <div>
                    <strong>{pendingNotificationCount}</strong> Pending Admin{' '}
                    {pendingNotificationCount === 1 ? 'Request' : 'Requests'}
                  </div>
                  <div
                    className="btn btn-primary"
                    style={{ textAlign: 'center', padding: '7px 10px' }}
                    onClick={() => {
                      setShowSettings(true);
                      refreshCurrentUser();
                      if (user.role === 'admin' && pendingNotificationCount > 0) {
                        setShowAdminView(true);
                        checkAdminNotifications(false);
                      }
                    }}
                  >
                    Open Admin Table
                  </div>
                </div>
              )}

              {(user.role === 'author' || user.role === 'admin') && (
                <div className="btn btn-primary" onClick={() => openComposeWindow()}>
                  + New Post
                </div>
              )}
              <div
                className="btn btn-secondary"
                onClick={() => {
                  setShowAdminView(false);
                  setSelectedPost(null);
                  setSelectedAuthor(null);
                  setFilterMode('all');
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
                    ? {
                        border: '1.5px solid #b91c1c',
                        fontWeight: 700,
                      }
                    : undefined
                }
                onClick={() => {
                  setShowSettings(true);
                  if (user.role === 'admin' && pendingNotificationCount > 0) {
                    setShowAdminView(true);
                    checkAdminNotifications(false);
                  }
                }}
              >
                Settings
              </div>
              <div className="btn btn-danger" onClick={handleLogoutClick}>
                Logout
              </div>
            </div>
          )}

          {sidebarToast && (
            <div className="sidebar-status-tooltip">
              <span>{sidebarToast}</span>
              <span
                className="sidebar-status-close"
                onClick={() => setSidebarToast(null)}
              >
                ✕
              </span>
            </div>
          )}
        </div>
        {}
        <div
          className={`app-main ${activeFullWindow ? 'split-active' : ''}`}
          ref={!activeFullWindow ? mainScrollRef : null}
          onScroll={!activeFullWindow ? handleScroll : undefined}
        >
          <div
            className="main-left-column"
            ref={activeFullWindow ? mainScrollRef : null}
            onScroll={activeFullWindow ? handleScroll : undefined}
          >
            {showAdminView && user?.role === 'admin' ? (
              <div style={{ width: '100%', maxWidth: '960px' }}>
                <div className="admin-panel">
                  <div className="admin-panel-header">
                    <div className="admin-panel-title">User Management</div>
                    <div className="btn btn-secondary" onClick={() => setShowAdminView(false)}>
                      ← Back to Feed
                    </div>
                  </div>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Activity Status</th>
                          <th>Role</th>
                          <th>Posts</th>
                          <th>Notification</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminUsers.map((u) => {
                          const isEditingActivity =
                            editingCell.userId === u.id && editingCell.field === 'activity';
                          const isEditingRole =
                            editingCell.userId === u.id && editingCell.field === 'role';

                          return (
                            <tr key={u.id}>
                              <td>#{u.id}</td>
                              <td>
                                <strong>{u.username}</strong>
                              </td>
                              <td>{u.email}</td>
                              <td>
                                {isEditingActivity ? (
                                  <div className="cell-inline-edit">
                                    <select
                                      className="inline-select"
                                      value={editingCell.value}
                                      onChange={(e) =>
                                        setEditingCell({ ...editingCell, value: e.target.value })
                                      }
                                    >
                                      <option value="1">Active</option>
                                      <option value="0">Inactive</option>
                                    </select>
                                    <div
                                      className="mini-edit-btn"
                                      onClick={() =>
                                        handleSaveUserEdit(u.id, 'activity', editingCell.value)
                                      }
                                    >
                                      Save
                                    </div>
                                  </div>
                                ) : (
                                  <div className="cell-inline-edit">
                                    <div
                                      className={`status-badge ${
                                        u.is_active ? 'status-active' : 'status-inactive'
                                      }`}
                                    >
                                      {u.is_active ? 'Active' : 'Inactive'}
                                    </div>
                                    <div
                                      className="mini-edit-btn"
                                      onClick={() =>
                                        setEditingCell({
                                          userId: u.id,
                                          field: 'activity',
                                          value: String(u.is_active),
                                        })
                                      }
                                    >
                                      Edit
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td>
                                {isEditingRole ? (
                                  <div className="cell-inline-edit">
                                    <select
                                      className="inline-select"
                                      value={editingCell.value}
                                      onChange={(e) =>
                                        setEditingCell({ ...editingCell, value: e.target.value })
                                      }
                                    >
                                      <option value="reader">Reader</option>
                                      <option value="author">Author</option>
                                      <option value="admin">Admin</option>
                                    </select>
                                    <div
                                      className="mini-edit-btn"
                                      onClick={() =>
                                        handleSaveUserEdit(u.id, 'role', editingCell.value)
                                      }
                                    >
                                      Save
                                    </div>
                                  </div>
                                ) : (
                                  <div className="cell-inline-edit">
                                    <strong>{u.role.toUpperCase()}</strong>
                                    <div
                                      className="mini-edit-btn"
                                      onClick={() =>
                                        setEditingCell({
                                          userId: u.id,
                                          field: 'role',
                                          value: u.role,
                                        })
                                      }
                                    >
                                      Edit
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td>{u.post_count}</td>
                              <td>
                                {u.admin_notification ? (
                                  <div className="notif-pill">{u.admin_notification}</div>
                                ) : (
                                  <div style={{ color: '#999' }}>—</div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="admin-panel admin-section-gap">
                  <div className="admin-panel-header">
                    <div className="admin-panel-title">
                      Audit Logs
                    </div>
                  </div>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>Performed By</th>
                          <th>Target / Post</th>
                          <th>Details</th>
                          <th>When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedLogs.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ color: '#777' }}>
                              No audit logs recorded yet.
                            </td>
                          </tr>
                        ) : (
                          pagedLogs.map((log) => (
                            <tr key={log.id}>
                              <td>
                                <strong>{log.action_type.replace('_', ' ').toUpperCase()}</strong>
                              </td>
                              <td>{log.actor_username}</td>
                              <td>
                                {log.action_type === 'post_edited' && log.post_id ? (
                                  <div
                                    className="log-post-link"
                                    onClick={() => {
                                      setShowAdminView(false);
                                      openSinglePost({ id: log.post_id });
                                    }}
                                  >
                                    {log.post_title || `Post #${log.post_id}`}
                                  </div>
                                ) : log.action_type === 'post_deleted' ? (
                                  <div>{log.post_title || `Post #${log.post_id}`}</div>
                                ) : (
                                  <div>
                                    {log.target_username || `User #${log.target_user_id}`}
                                  </div>
                                )}
                              </td>
                              <td>{log.details}</td>
                              <td>{new Date(log.created_at).toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="admin-pagination">
                    <div>
                      Page {logPage + 1} of {totalLogPages} ({adminLogs.length} total logs)
                    </div>
                    <div className="admin-pagination-btns">
                      <div
                        className="btn btn-secondary"
                        style={{
                          opacity: logPage === 0 ? 0.45 : 1,
                          pointerEvents: logPage === 0 ? 'none' : 'auto',
                        }}
                        onClick={() => setLogPage((p) => Math.max(0, p - 1))}
                      >
                        ← Back
                      </div>
                      <div
                        className="btn btn-secondary"
                        style={{
                          opacity: logPage + 1 >= totalLogPages ? 0.45 : 1,
                          pointerEvents: logPage + 1 >= totalLogPages ? 'none' : 'auto',
                        }}
                        onClick={() => setLogPage((p) => Math.min(totalLogPages - 1, p + 1))}
                      >
                        Next →
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="feed-column">
                {selectedPost ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div
                        className="btn btn-secondary"
                        style={{ display: 'inline-block' }}
                        onClick={() => setSelectedPost(null)}
                      >
                        ← Back to Feed
                      </div>
                    </div>
                    <div className="post-card">
                      <div className="post-top-bar">
                        <div
                          className="author-link"
                          onClick={() => {
                            const authorName =
                              selectedPost.author_name || user?.username || 'Unknown';
                            setSelectedAuthor({ id: selectedPost.author_id, name: authorName });
                            setSelectedPost(null);
                            setFilterMode('author');
                          }}
                        >
                          {selectedPost.author_name || user?.username || 'Unknown'}
                        </div>
                      </div>
                      <div className="post-body-inner">
                        <div className="post-title">{selectedPost.title}</div>
                        {renderAllowedMarkdown(
                          selectedPost.markdown_content || selectedPost.content || ''
                        )}
                      </div>
                      <div className="post-footer">
                        <div>
                          {new Date(selectedPost.created_at).toLocaleString()}
                          {selectedPost.edited_by_username &&
                            ` • Edited by ${selectedPost.edited_by_username}`}
                        </div>
                        {user && (user.id === selectedPost.author_id || user.role === 'admin') && (
                          <div className="post-actions">
                            <div
                              className="text-action"
                              onClick={() => openComposeWindow(selectedPost)}
                            >
                              Edit
                            </div>
                            <div
                              className="text-action text-action-danger"
                              onClick={() =>
                                handleDeletePost(selectedPost.id, () => setSelectedPost(null))
                              }
                            >
                              Delete
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    {(filterMode === 'author' && selectedAuthor) || filterMode === 'mine' ? (
                      <div className="filter-banner">
                        <div>
                          {filterMode === 'author' && selectedAuthor ? (
                            <div>
                              Filtered by Author: <strong>{selectedAuthor.name}</strong>
                            </div>
                          ) : (
                            <div>
                              Filtered: <strong>My Posts</strong>
                            </div>
                          )}
                        </div>
                        <div
                          className="btn btn-secondary"
                          onClick={() => {
                            setSelectedAuthor(null);
                            setFilterMode('all');
                          }}
                        >
                          Clear Filter
                        </div>
                      </div>
                    ) : null}

                    {displayedPosts.length === 0 ? (
                      <div className="post-card">
                        <div className="post-body-inner" style={{ color: '#777' }}>
                          No entries found.
                        </div>
                      </div>
                    ) : (
                      displayedPosts.map((post) => {
                        const authorName = post.author_name || user?.username || 'Unknown';
                        const canEdit =
                          user && (user.id === post.author_id || user.role === 'admin');
                        const canDelete =
                          user && (user.id === post.author_id || user.role === 'admin');
                        const isExpanded = Boolean(expandedPosts[post.id]);
                        const rawDisplay = post.markdown_content || post.content || '';
                        const trimmedForLength = rawDisplay.replace(/\n+$/, '');
                        const isLongPost =
                          trimmedForLength.split('\n').length > 5 || trimmedForLength.length > 350;

                        return (
                          <div key={post.id} className="post-card">
                            <div className="post-top-bar">
                              <div
                                className="author-link"
                                onClick={() => {
                                  setSelectedAuthor({ id: post.author_id, name: authorName });
                                  setFilterMode('author');
                                }}
                              >
                                {authorName}
                              </div>
                            </div>
                            <div className="post-body-inner">
                              <div
                                className="post-title post-title-link"
                                onClick={() => openSinglePost(post)}
                              >
                                {post.title}
                              </div>
                              <div className={isLongPost && !isExpanded ? 'post-content-clamped has-more' : ''}>
                                {renderAllowedMarkdown(rawDisplay)}
                              </div>
                              {isLongPost && (
                                <div
                                  className="read-more-btn"
                                  onClick={() => toggleExpandPost(post.id)}
                                >
                                  {isExpanded ? 'Show less' : 'Read more'}
                                </div>
                              )}
                            </div>
                            <div className="post-footer">
                              <div>{new Date(post.created_at).toLocaleString()}</div>
                              {(canEdit || canDelete) && (
                                <div className="post-actions">
                                  {canEdit && (
                                    <div
                                      className="text-action"
                                      onClick={() => openComposeWindow(post)}
                                    >
                                      Edit
                                    </div>
                                  )}
                                  {canDelete && (
                                    <div
                                      className="text-action text-action-danger"
                                      onClick={() => handleDeletePost(post.id)}
                                    >
                                      Delete
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {activeFullWindow && (
            <div className="main-right-compose-column">
              <div className="fullbody-compose-card">
                {fullViewWindows.length > 1 && (
                  <div className="full-compose-tabs">
                    {fullViewWindows.map((fw, idx) => (
                      <div
                        key={fw.windowId}
                        role="button"
                        tabIndex={0}
                        className={`full-compose-tab ${
                          fw.windowId === activeFullWindow.windowId ? 'active' : ''
                        }`}
                        onClick={() => {
                          if (fw.windowId !== activeFullWindow.windowId) {
                            const currEl = editorRefs.current[activeFullWindow.windowId];
                            if (currEl) {
                              updateComposeField(
                                activeFullWindow.windowId,
                                'content',
                                editorHtmlToMarkdown(currEl)
                              );
                            }
                            setActiveFullTabId(fw.windowId);
                          }
                        }}
                      >
                        <span className="full-compose-tab-title">
                          {idx + 1}. {fw.postId ? `Edit: ${fw.title || 'Post'}` : fw.title || 'New Post'}
                        </span>
                        <span
                          className="full-compose-tab-close"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeComposeWindow(fw.windowId);
                          }}
                        >
                          ✕
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="compose-header">
                  <div>
                    {activeFullWindow.postId
                      ? `Edit: ${activeFullWindow.title || 'Post'}`
                      : activeFullWindow.title || 'New Post'}
                  </div>
                  <div className="compose-controls">
                    <div
                      className="compose-ctrl-btn"
                      title="Dock to Bottom"
                      onClick={() => setWindowFullView(activeFullWindow.windowId, false)}
                    >
                      🗗
                    </div>
                    <div
                      className="compose-ctrl-btn"
                      title="Close"
                      onClick={() => closeComposeWindow(activeFullWindow.windowId)}
                    >
                      ✕
                    </div>
                  </div>
                </div>

                <div key={activeFullWindow.windowId} style={{ display: 'contents' }}>
                  {renderComposeBody(activeFullWindow)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {}
      {showBackToTop && !showAdminView && displayedPosts.length > 0 && (
        <div
          className={`back-to-top-btn ${
            composeWindows.some((w) => !w.fullscreen) ? 'shifted-left' : ''
          }`}
          onClick={scrollToTop}
        >
          ↑ Back to Top
        </div>
      )}

      {}
      {composeWindows.some((w) => !w.fullscreen) && (
        <div className="app-footer-dock">
          {composeWindows
            .filter((w) => !w.fullscreen)
            .map((win) => (
              <div key={win.windowId} className="compose-window">
                <div
                  className="compose-header"
                  onClick={() => updateComposeField(win.windowId, 'minimized', !win.minimized)}
                >
                  <div>{win.postId ? `Edit: ${win.title || 'Post'}` : win.title || 'New Post'}</div>
                  <div className="compose-controls" onClick={(e) => e.stopPropagation()}>
                    <div
                      className="compose-ctrl-btn"
                      title="Full Body View"
                      onClick={() => setWindowFullView(win.windowId, true)}
                    >
                      ⛶
                    </div>
                    <div
                      className="compose-ctrl-btn"
                      title="Minimize"
                      onClick={() => updateComposeField(win.windowId, 'minimized', !win.minimized)}
                    >
                      {win.minimized ? '+' : '—'}
                    </div>
                    <div
                      className="compose-ctrl-btn"
                      title="Close"
                      onClick={() => closeComposeWindow(win.windowId)}
                    >
                      ✕
                    </div>
                  </div>
                </div>
                {!win.minimized && renderComposeBody(win)}
              </div>
            ))}
        </div>
      )}
      {}
      {contactModal.open && user && (
        <div
          className="prompt-overlay"
          onClick={() => setContactModal({ ...contactModal, open: false })}
        >
          <div className="prompt-box" onClick={(e) => e.stopPropagation()}>
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
              <div
                className="btn btn-secondary"
                onClick={() => setContactModal({ ...contactModal, open: false })}
              >
                Cancel
              </div>
              <div
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
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      {promptBox.open && (
        <div className="prompt-overlay" onClick={closePrompt}>
          <div className="prompt-box" onClick={(e) => e.stopPropagation()}>
            <div className="prompt-header">{promptBox.title}</div>
            <div className="prompt-message">{promptBox.message}</div>
            <div className="prompt-actions">
              {promptBox.isConfirm && (
                <div className="btn btn-secondary" onClick={closePrompt}>
                  Cancel
                </div>
              )}
              <div
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
