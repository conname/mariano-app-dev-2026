const { spawn } = require('child_process');
const path = require('path');
const initDatabase = require('./initDB');

async function startAll() {
  
  await initDatabase();

  const auth = spawn(
    'npx',
    ['nodemon', '--watch', 'auth-server', '--watch', '.env', 'auth-server/server.js'],
    { stdio: 'inherit', shell: true }
  );

  const blog = spawn(
    'npx',
    ['nodemon', '--watch', 'blog-server', '--watch', '.env', 'blog-server/server.js'],
    { stdio: 'inherit', shell: true }
  );

  const web = spawn('npm', ['--prefix', path.join(__dirname, 'frontend'), 'run', 'dev'], {
    stdio: 'inherit',
    shell: true,
  });

  process.on('SIGINT', () => {
    auth.kill();
    blog.kill();
    web.kill();
    process.exit();
  });
}

startAll();
