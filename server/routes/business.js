const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

// Get all business ideas for user
router.get('/ideas', authenticateToken, async (req, res) => {
  try {
    const { status, industry, limit = 20, offset = 0 } = req.query;

    let whereClause = 'WHERE user_id = ?';
    let params = [req.user.id];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (industry) {
      whereClause += ' AND industry = ?';
      params.push(industry);
    }

    const result = await query(
      `SELECT id, title, description, industry, target_market, initial_investment,
              expected_revenue, success_probability, status, created_at, updated_at
       FROM business_ideas 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      ideas: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Get business ideas error:', error);
    res.status(500).json({ error: 'Failed to get business ideas' });
  }
});

// Get single business idea
router.get('/ideas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM business_ideas WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business idea not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get business idea error:', error);
    res.status(500).json({ error: 'Failed to get business idea' });
  }
});

// Update business idea
router.put('/ideas/:id', authenticateToken, [
  body('title').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim().isLength({ min: 1 }),
  body('industry').optional().trim().isLength({ min: 1 }),
  body('target_market').optional().trim().isLength({ min: 1 }),
  body('initial_investment').optional().isNumeric(),
  body('expected_revenue').optional().isNumeric(),
  body('success_probability').optional().isFloat({ min: 0, max: 100 }),
  body('status').optional().isIn(['draft', 'active', 'completed', 'archived'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    // Check if idea exists and belongs to user
    const existingIdea = await query(
      'SELECT id FROM business_ideas WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existingIdea.rows.length === 0) {
      return res.status(404).json({ error: 'Business idea not found' });
    }

    // Build update query
    const updateFields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await query(
      `UPDATE business_ideas SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated idea
    const result = await query(
      'SELECT * FROM business_ideas WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Business idea updated successfully',
      idea: result.rows[0]
    });

  } catch (error) {
    console.error('Update business idea error:', error);
    res.status(500).json({ error: 'Failed to update business idea' });
  }
});

// Delete business idea
router.delete('/ideas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM business_ideas WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Business idea not found' });
    }

    res.json({ message: 'Business idea deleted successfully' });

  } catch (error) {
    console.error('Delete business idea error:', error);
    res.status(500).json({ error: 'Failed to delete business idea' });
  }
});

// Get business plans for user
router.get('/plans', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const result = await query(
      `SELECT id, title, business_idea_id, status, created_at, updated_at
       FROM business_plans 
       WHERE user_id = ?
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), parseInt(offset)]
    );

    res.json({
      plans: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Get business plans error:', error);
    res.status(500).json({ error: 'Failed to get business plans' });
  }
});

// Get single business plan
router.get('/plans/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM business_plans WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business plan not found' });
    }

    res.json({ plan: result.rows[0] });

  } catch (error) {
    console.error('Get business plan error:', error);
    res.status(500).json({ error: 'Failed to get business plan' });
  }
});

// Update business plan section
router.put('/plans/:id/sections/:section', authenticateToken, [
  body('content').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id, section } = req.params;
    const { content } = req.body;

    // Check if plan exists and belongs to user
    const existingPlan = await query(
      'SELECT id FROM business_plans WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existingPlan.rows.length === 0) {
      return res.status(404).json({ error: 'Business plan not found' });
    }

    // Update the specific section
    const updateQuery = `UPDATE business_plans SET ${section} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await query(updateQuery, [content, id]);

    res.json({ message: 'Business plan section updated successfully' });

  } catch (error) {
    console.error('Update business plan section error:', error);
    res.status(500).json({ error: 'Failed to update business plan section' });
  }
});

// Get dashboard statistics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get total ideas count
    const ideasResult = await query(
      'SELECT COUNT(*) as total FROM business_ideas WHERE user_id = ?',
      [req.user.id]
    );

    // Get ideas by status
    const statusResult = await query(
      `SELECT status, COUNT(*) as count 
       FROM business_ideas 
       WHERE user_id = ? 
       GROUP BY status`,
      [req.user.id]
    );

    // Get ideas by industry
    const industryResult = await query(
      `SELECT industry, COUNT(*) as count 
       FROM business_ideas 
       WHERE user_id = ? 
       GROUP BY industry 
       ORDER BY count DESC 
       LIMIT 5`,
      [req.user.id]
    );

    // Get recent ideas (last 7 days)
    const recentResult = await query(
      `SELECT COUNT(*) as count 
       FROM business_ideas 
       WHERE user_id = ? 
       AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [req.user.id]
    );

    // Get total plans count
    const plansResult = await query(
      'SELECT COUNT(*) as total FROM business_plans WHERE user_id = ?',
      [req.user.id]
    );

    const statusCounts = {};
    statusResult.rows.forEach(row => {
      statusCounts[row.status] = row.count;
    });

    res.json({
      totalIdeas: ideasResult.rows[0].total,
      totalPlans: plansResult.rows[0].total,
      recentIdeas: recentResult.rows[0].count,
      ideasByStatus: statusCounts,
      topIndustries: industryResult.rows
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard statistics' });
  }
});

module.exports = router;