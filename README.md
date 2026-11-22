# Final Exam
## Miniature

A lightweight, minimalist microblog and publishing platform built with React, Node.js, Express, and MariaDB.

**Live Demo:** [miniblog1.conname.pw](https://conname.pw) *(running on a personal server, may experience occasional outages)*

---

### Design Inspiration

| Inspiration | Reference | Shows |
| :--- | :--- | :--- |
| **[Athena Tumblr Theme](https://tumblr.com)** | ![Athena Tumblr Theme Preview](docs/inspirations/athena-theme.png) | Aesthetic + Tumblr infinite post card scroll, sticky side bar. |
| **[Gmail Compose Windows](https://google.com)** | ![Gmail Compose Window Preview](docs/inspirations/gmail-compose.png) | Multi-draft composing (up to 3 windows) that stays docked at the bottom or expands into a side-by-side tabbed workspace. |
| **[Notion Toggle Lists](https://notion.com)** | ![Notion Toggle Preview](docs/inspirations/notion-toggle.png) | Collapsible toggle rows (`▶` / `▼`) in mobile admin tables. |

---

### Features

#### Core Requirements
- **Authentication & Token Rotation:** User registration, password hashing, login, and automatic JWT access/refresh token rotation.
- **Role-Based Access Control (RBAC):** Enforces permissions across `reader` (read-only), `author` (create, edit, and delete own posts), and `admin` (full moderation and user management).
- **Blog CRUD & Feed Filtering:** Create, read, update, and delete entries with author attribution, single-post views, and filtering by **All Posts**, **My Posts**, or **Author**.
- **Admin User Moderation:** View registered users, update roles, and activate or deactivate user accounts.

#### Personal Touches
- **Hybrid Live Markdown Editor:** Order-independent nested formatting (`**bold**`, `*italic*`, `_underline_`, `~~strike~~`), headings, quotes, and lists with instant `Enter` style resets, `Backspace` syntax reversion, unclosed-tag warnings, and exact newline preservation.
- **Unified Split-View & Docked Compose:** Open up to 3 compose windows at once—either docked along the bottom bar or expanded together into a side-by-side tabbed workspace alongside the live feed.
- **Admin Request Workflow & Audit Logs:** Non-admin users can submit role or status requests (with duplicate requests locked as **Request Pending** until fulfilled), while admins receive live alerts and can inspect a full audit log with direct links to edited posts.
- **Dedicated Mobile Layout:** Automatically adapts to narrow or portrait screens with a one-handed bottom drawer trigger, floating `+ New Post` button, and Notion-style collapsible admin rows.

---

### Project Structure

```text
├── auth-server/    # Authentication, JWT & user management (Port 4000)
├── blog-server/    # Posts CRUD, RBAC & audit logs (Port 5000)
├── frontend/       # React + Vite client (Desktop & Mobile layouts)
├── initDB.js       # MariaDB table & seed initializer
└── start.js        # Runs both backend services together
```

---

### Running Locally

1. **Install dependencies:**
   ```bash
   npm install
   npm install --prefix auth-server
   npm install --prefix blog-server
   npm install --prefix frontend
   ```

2. **Configure environment variables:**
   Create a root `.env` file with your database credentials and JWT secrets:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=blog_platform
   JWT_ACCESS_SECRET=your_access_secret
   JWT_REFRESH_SECRET=your_refresh_secret
   ```

3. **Initialize the database & start the servers:**
   ```bash
   npm start
   ```

4. **Start the frontend (in a second terminal):**
   ```bash
   npm --prefix frontend run dev
   ```