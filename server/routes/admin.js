const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { query } = require('../config/database');
const geminiService = require('../services/geminiService');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow text files and documents
    if (file.mimetype.startsWith('text/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only text and document files are allowed'), false);
    }
  }
});

// Get all knowledge documents
router.get('/knowledge', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type, limit = 20, offset = 0 } = req.query;

    let whereClause = '';
    let params = [];
    let paramCount = 0;

    if (type) {
      whereClause = 'WHERE document_type = ?';
      params.push(type);
      paramCount = 1;
    }

    const result = await query(
      `SELECT id, title, document_type, source, metadata, created_at
       FROM knowledge_documents 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      documents: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Get knowledge documents error:', error);
    res.status(500).json({ error: 'Failed to get knowledge documents' });
  }
});

// Add knowledge document manually
router.post('/knowledge', authenticateToken, requireAdmin, [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('content').trim().isLength({ min: 10 }).withMessage('Content must be at least 10 characters'),
  body('document_type').optional().trim(),
  body('source').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, document_type = 'manual', source = 'admin' } = req.body;

    // Generate embedding for the content
    const embedding = await geminiService.generateEmbedding(content);
    const metadata = {
      word_count: content.split(' ').length,
      added_by: req.user.email,
      added_at: new Date().toISOString()
    };

    const result = await query(
      `INSERT INTO knowledge_documents (title, content, document_type, source, embedding, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, content, document_type, source, JSON.stringify(embedding), JSON.stringify(metadata)]
    );

    // Get the created document
    const newDoc = await query(
      'SELECT id, title, document_type, source, created_at FROM knowledge_documents WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Knowledge document added successfully',
      document: newDoc.rows[0]
    });

  } catch (error) {
    console.error('Add knowledge document error:', error);
    res.status(500).json({ error: 'Failed to add knowledge document' });
  }
});

// Upload knowledge document from file
router.post('/knowledge/upload', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, mimetype, buffer } = req.file;
    const { document_type = 'uploaded', source = 'file_upload' } = req.body;

    // Extract text content based on file type
    let content = '';
    if (mimetype.startsWith('text/')) {
      content = buffer.toString('utf8');
    } else {
      // For other file types, you might want to use a library like pdf-parse
      // For now, we'll just use the filename as content
      content = `File: ${originalname}\nType: ${mimetype}\nContent processing not implemented for this file type.`;
    }

    const title = originalname.replace(/\.[^/.]+$/, ''); // Remove file extension

    // Generate embedding
    const embedding = await geminiService.generateEmbedding(content);
    const metadata = {
      original_filename: originalname,
      file_type: mimetype,
      word_count: content.split(' ').length,
      uploaded_by: req.user.email,
      uploaded_at: new Date().toISOString()
    };

    const result = await query(
      `INSERT INTO knowledge_documents (title, content, document_type, source, embedding, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, content, document_type, source, JSON.stringify(embedding), JSON.stringify(metadata)]
    );

    // Get the created document
    const newDoc = await query(
      'SELECT id, title, document_type, source, created_at FROM knowledge_documents WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Knowledge document uploaded successfully',
      document: newDoc.rows[0]
    });

  } catch (error) {
    console.error('Upload knowledge document error:', error);
    res.status(500).json({ error: 'Failed to upload knowledge document' });
  }
});

// Update knowledge document
router.put('/knowledge/:id', authenticateToken, requireAdmin, [
  body('title').optional().trim().isLength({ min: 1 }),
  body('content').optional().trim().isLength({ min: 10 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, content } = req.body;

    // Get existing document
    const existingResult = await query(
      'SELECT content FROM knowledge_documents WHERE id = ?',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const updates = [];
    const values = [];

    if (title) {
      updates.push('title = ?');
      values.push(title);
    }

    if (content) {
      updates.push('content = ?');
      values.push(content);
      // Regenerate embedding if content changed
      const embedding = await geminiService.generateEmbedding(content);
      updates.push('embedding = ?');
      values.push(JSON.stringify(embedding));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await query(
      `UPDATE knowledge_documents SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated document
    const result = await query(
      'SELECT id, title, content, document_type, source, created_at, updated_at FROM knowledge_documents WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Knowledge document updated successfully',
      document: result.rows[0]
    });

  } catch (error) {
    console.error('Update knowledge document error:', error);
    res.status(500).json({ error: 'Failed to update knowledge document' });
  }
});

// Delete knowledge document
router.delete('/knowledge/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM knowledge_documents WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Knowledge document deleted successfully' });

  } catch (error) {
    console.error('Delete knowledge document error:', error);
    res.status(500).json({ error: 'Failed to delete knowledge document' });
  }
});

// Get system statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get user count
    const userCount = await query('SELECT COUNT(*) as count FROM users');

    // Get business ideas count
    const ideasCount = await query('SELECT COUNT(*) as count FROM business_ideas');

    // Get business plans count
    const plansCount = await query('SELECT COUNT(*) as count FROM business_plans');

    // Get knowledge documents count
    const docsCount = await query('SELECT COUNT(*) as count FROM knowledge_documents');

    // Get chat conversations count
    const convsCount = await query('SELECT COUNT(*) as count FROM chat_conversations');

    res.json({
      users: userCount.rows[0].count,
      businessIdeas: ideasCount.rows[0].count,
      businessPlans: plansCount.rows[0].count,
      knowledgeDocuments: docsCount.rows[0].count,
      chatConversations: convsCount.rows[0].count
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to get system statistics' });
  }
});

module.exports = router;