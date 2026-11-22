const db = require('../../db');

const hasMarkdownSyntax = (text) => {
  if (!text) return false;
  const patterns = [
    /^#{2,3}\s+/m,
    /\*\*(?=\S).+?(?<=\S)\*\*/s,
    /(?<!\*)\*(?!\*)(?=\S).+?(?<=\S)(?<!\*)\*(?!\*)/s,
    /(?<!_)_(?!_)(?=\S).+?(?<=\S)(?<!_)_(?!_)/s,
    /~~(?=\S).+?(?<=\S)~~/s,
    /^>\s+/m,
    /^\s*[-*+]\s+/m,
    /^\s*\d+\.\s+/m,
  ];
  return patterns.some((rx) => rx.test(text));
};

const stripMarkdownPreserveLayout = (text) => {
  return text
    .split('\n')
    .map((line) => {
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch.at(1) : '';
      let body = line.slice(indent.length);

      body = body.replace(/^#{2,3}\s+/, '');
      body = body.replace(/^>\s+/, '');
      body = body.replace(/^([-*+]|\d+\.)\s+/, '');

      let prev;
      do {
        prev = body;
        body = body.replace(/\*\*(.+?)\*\*/g, '$1');
        body = body.replace(/~~(.+?)~~/g, '$1');
        body = body.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1');
        body = body.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '$1');
      } while (body !== prev);

      return indent + body;
    })
    .join('\n');
};

exports.getAllPosts = async (req, res) => {
  try {
    const [posts] = await db.query(
      `SELECT pe.*, p.*, u.username AS author_name
       FROM posts p
       JOIN users u ON p.author_id = u.id
       LEFT JOIN posts_extra pe ON pe.post_id = p.id
       ORDER BY p.created_at DESC`
    );
    res.status(200).json(posts);
  } catch (err) {
    try {
      const [fallbackPosts] = await db.query(
        `SELECT p.*, u.username AS author_name
         FROM posts p
         JOIN users u ON p.author_id = u.id
         ORDER BY p.created_at DESC`
      );
      res.status(200).json(fallbackPosts);
    } catch (fallbackErr) {
      res.status(500).json({ message: fallbackErr.message, error: fallbackErr.message });
    }
  }
};

exports.getPostById = async (req, res) => {
  try {
    const [posts] = await db.query(
      `SELECT pe.*, p.*, u.username AS author_name
       FROM posts p
       JOIN users u ON p.author_id = u.id
       LEFT JOIN posts_extra pe ON pe.post_id = p.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (posts.length === 0) return res.status(404).json({ message: 'Post not found' });
    res.status(200).json(posts.at(0));
  } catch (err) {
    try {
      const [fallbackPosts] = await db.query(
        `SELECT p.*, u.username AS author_name
         FROM posts p
         JOIN users u ON p.author_id = u.id
         WHERE p.id = ?`,
        [req.params.id]
      );
      if (fallbackPosts.length === 0) return res.status(404).json({ message: 'Post not found' });
      res.status(200).json(fallbackPosts.at(0));
    } catch (fallbackErr) {
      res.status(500).json({ message: fallbackErr.message, error: fallbackErr.message });
    }
  }
};

exports.getMyPosts = async (req, res) => {
  try {
    const [posts] = await db.query(
      `SELECT pe.*, p.*, u.username AS author_name
       FROM posts p
       JOIN users u ON p.author_id = u.id
       LEFT JOIN posts_extra pe ON pe.post_id = p.id
       WHERE p.author_id = ?
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.status(200).json(posts);
  } catch (err) {
    try {
      const [fallbackPosts] = await db.query(
        `SELECT p.*, u.username AS author_name
         FROM posts p
         JOIN users u ON p.author_id = u.id
         WHERE p.author_id = ?
         ORDER BY p.created_at DESC`,
        [req.user.id]
      );
      res.status(200).json(fallbackPosts);
    } catch (fallbackErr) {
      res.status(500).json({ message: fallbackErr.message, error: fallbackErr.message });
    }
  }
};

exports.createPost = async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    let actorName = req.user.username;
    if (!actorName) {
      const [uRows] = await db.query('SELECT username FROM users WHERE id = ?', [req.user.id]);
      actorName = uRows.at(0)?.username || `User #${req.user.id}`;
    }

    const containsMd = hasMarkdownSyntax(content);
    const plainContent = containsMd ? stripMarkdownPreserveLayout(content) : content;

    const [result] = await db.query(
      'INSERT INTO posts (author_id, title, content) VALUES (?, ?, ?)',
      [req.user.id, title, plainContent]
    );

    const newPostId = result.insertId;

    if (containsMd) {
      await db.query(
        `INSERT INTO posts_extra (post_id, markdown_content, edited_by_id, edited_by_username)
         VALUES (?, ?, ?, ?)`,
        [newPostId, content, req.user.id, actorName]
      );
    }

    res.status(201).json({
      id: newPostId,
      author_id: req.user.id,
      title,
      content: plainContent,
      markdown_content: containsMd ? content : null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message, error: err.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const [posts] = await db.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (posts.length === 0) return res.status(404).json({ message: 'Post not found' });

    const post = posts.at(0);
    if (post.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Not post owner or admin' });
    }

    let actorName = req.user.username;
    if (!actorName) {
      const [uRows] = await db.query('SELECT username FROM users WHERE id = ?', [req.user.id]);
      actorName = uRows.at(0)?.username || `User #${req.user.id}`;
    }

    const title = req.body.title || post.title;
    const rawContent = req.body.content !== undefined ? req.body.content : post.content;
    const containsMd = hasMarkdownSyntax(rawContent);
    const plainContent = containsMd ? stripMarkdownPreserveLayout(rawContent) : rawContent;

    await db.query('UPDATE posts SET title = ?, content = ? WHERE id = ?', [
      title,
      plainContent,
      req.params.id,
    ]);

    if (containsMd) {
      await db.query(
        `INSERT INTO posts_extra (post_id, markdown_content, edited_by_id, edited_by_username)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           markdown_content = VALUES(markdown_content),
           edited_by_id = VALUES(edited_by_id),
           edited_by_username = VALUES(edited_by_username),
           updated_at = CURRENT_TIMESTAMP`,
        [req.params.id, rawContent, req.user.id, actorName]
      );
    } else {
      await db.query('DELETE FROM posts_extra WHERE post_id = ?', [req.params.id]);
    }

    await db.query(
      `INSERT INTO admin (action_type, actor_id, actor_username, post_id, post_title, details)
       VALUES ('post_edited', ?, ?, ?, ?, ?)`,
      [req.user.id, actorName, req.params.id, title, `Edited post #${req.params.id}`]
    );

    res.status(200).json({ message: 'Post updated' });
  } catch (err) {
    res.status(500).json({ message: err.message, error: err.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const [posts] = await db.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (posts.length === 0) return res.status(404).json({ message: 'Post not found' });

    const post = posts.at(0);
    if (post.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Not post owner or admin' });
    }

    let actorName = req.user.username;
    if (!actorName) {
      const [uRows] = await db.query('SELECT username FROM users WHERE id = ?', [req.user.id]);
      actorName = uRows.at(0)?.username || `User #${req.user.id}`;
    }

    await db.query('DELETE FROM posts_extra WHERE post_id = ?', [req.params.id]);

    await db.query('DELETE FROM posts WHERE id = ?', [req.params.id]);

    await db.query(
      `INSERT INTO admin (action_type, actor_id, actor_username, post_id, post_title, details)
       VALUES ('post_deleted', ?, ?, ?, ?, ?)`,
      [req.user.id, actorName, post.id, post.title, `Deleted post #${post.id}`]
    );

    res.status(200).json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message, error: err.message });
  }
};
