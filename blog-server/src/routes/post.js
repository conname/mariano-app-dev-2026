const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.get('/posts', postController.getAllPosts);
router.get('/posts/:id', postController.getPostById);
router.post('/posts', authenticate, authorize('author', 'admin'), postController.createPost);
router.put('/posts/:id', authenticate, postController.updatePost);
router.delete('/posts/:id', authenticate, authorize('admin'), postController.deletePost);
router.get('/me/posts', authenticate, postController.getMyPosts);

module.exports = router;
