const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');
const geminiService = require('../services/geminiService');

const router = express.Router();

// Generate business ideas
router.post('/generate-ideas', authenticateToken, [
  body('input').trim().isLength({ min: 10 }).withMessage('Input must be at least 10 characters'),
  body('location').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { input, location = 'Musanze', budget = '50000-200000' } = req.body;

    const ideas = await geminiService.generateBusinessIdeas(input, location, budget);

    // Save ideas to database
    const savedIdeas = [];
    for (const idea of ideas) {
      const result = await query(
        `INSERT INTO business_ideas 
         (user_id, title, description, industry, target_market, initial_investment, 
          expected_revenue, success_probability, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
        [
          req.user.id,
          idea.title || 'Untitled Business Idea',
          idea.description || '',
          idea.industry || 'General',
          idea.targetMarket || '',
          idea.initialInvestment || 0,
          idea.expectedRevenue || 0,
          idea.successProbability || 50
        ]
      );

      // Get the created idea
      const newIdea = await query(
        'SELECT id, title, description, industry, target_market, initial_investment, expected_revenue, success_probability, created_at FROM business_ideas WHERE id = ?',
        [result.insertId]
      );

      savedIdeas.push(newIdea.rows[0]);
    }

    res.json({
      message: 'Business ideas generated successfully',
      ideas: savedIdeas
    });

  } catch (error) {
    console.error('Generate ideas error:', error);
    res.status(500).json({ error: 'Failed to generate business ideas' });
  }
});

// Chat with AI
router.post('/chat', authenticateToken, [
  body('message').trim().isLength({ min: 1 }).withMessage('Message is required'),
  body('conversationId').optional().isInt().withMessage('Conversation ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message, conversationId, location = 'Musanze', budget = '', businessSector = '' } = req.body;
    const userId = req.user.id;

    // Get or create conversation
    let convId = conversationId;
    console.log('Chat request - conversationId:', conversationId, 'userId:', userId);

    if (!convId || convId === 'undefined' || convId === 'null') {
      console.log('Creating new conversation...');
      const convResult = await query(
        'INSERT INTO chat_conversations (user_id, title) VALUES (?, ?)',
        [userId, 'New Conversation']
      );
      console.log('Insert result:', convResult);
      convId = convResult.insertId || convResult.rows?.insertId;
      console.log('Created conversation with ID:', convId);
    }

    // Ensure we have a valid conversation ID
    if (!convId || convId === 'undefined' || convId === 'null') {
      console.error('Failed to get valid conversation ID:', convId);
      return res.status(500).json({ error: 'Failed to create conversation' });
    }

    console.log('Using conversation ID:', convId);

    // Save user message
    await query(
      'INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, ?, ?)',
      [convId, 'user', message]
    );

    // Get conversation history
    const historyResult = await query(
      'SELECT role, content FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [convId]
    );

    const conversationHistory = historyResult.rows.map(row => ({
      role: row.role,
      content: row.content
    }));

    // Get AI response
    const aiResponse = await geminiService.chatWithAI(message, conversationHistory, null, location, budget, businessSector);

    // Save AI response
    await query(
      'INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, ?, ?)',
      [convId, 'assistant', aiResponse]
    );

    res.json({
      message: aiResponse,
      conversationId: convId
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Generate business plan section
router.post('/generate-plan-section', authenticateToken, [
  body('section').trim().isLength({ min: 1 }).withMessage('Section is required'),
  body('businessIdea').trim().isLength({ min: 10 }).withMessage('Business idea is required'),
  body('existingContent').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { section, businessIdea, existingContent } = req.body;

    const content = await geminiService.generateBusinessPlanSection(
      section,
      businessIdea,
      existingContent
    );

    res.json({
      message: 'Business plan section generated successfully',
      content
    });

  } catch (error) {
    console.error('Generate plan section error:', error);
    res.status(500).json({ error: 'Failed to generate business plan section' });
  }
});

// Search local knowledge base
router.get('/search-knowledge', authenticateToken, async (req, res) => {
  try {
    const { query: searchQuery, limit = 10 } = req.query;

    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await query(
      `SELECT id, title, content, category, created_at
       FROM knowledge_documents 
       WHERE MATCH(title, content) AGAINST(? IN NATURAL LANGUAGE MODE)
       ORDER BY created_at DESC 
       LIMIT ?`,
      [searchQuery, parseInt(limit)]
    );

    res.json({
      documents: result.rows
    });

  } catch (error) {
    console.error('Search knowledge error:', error);
    res.status(500).json({ error: 'Failed to search knowledge base' });
  }
});

// Get user's chat conversations
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const result = await query(
      `SELECT id, title, created_at, updated_at
       FROM chat_conversations 
       WHERE user_id = ?
       ORDER BY updated_at DESC 
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), parseInt(offset)]
    );

    res.json({
      conversations: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Get conversation messages
router.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify conversation belongs to user
    const convResult = await query(
      'SELECT id FROM chat_conversations WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const result = await query(
      'SELECT role, content, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [id]
    );

    res.json({
      messages: result.rows
    });

  } catch (error) {
    console.error('Get conversation messages error:', error);
    res.status(500).json({ error: 'Failed to get conversation messages' });
  }
});

// Generate business plan
router.post('/generate-business-plan', authenticateToken, [
  body('businessIdeaId').isInt().withMessage('Business idea ID is required'),
  body('location').optional().trim(),
  body('budget').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { businessIdeaId, location = 'Musanze', budget = '50000-200000' } = req.body;
    const userId = req.user.id;

    // Get business idea details
    const ideaResult = await query(
      'SELECT * FROM business_ideas WHERE id = ? AND user_id = ?',
      [businessIdeaId, userId]
    );

    if (ideaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business idea not found' });
    }

    const businessIdea = ideaResult.rows[0];

    // Generate business plan using AI
    const businessPlan = await geminiService.generateBusinessPlan(businessIdea, location, budget);

    // Save business plan to database with proper section mapping
    const planResult = await query(
      `INSERT INTO business_plans 
       (user_id, business_idea_id, title, executive_summary, market_analysis, 
        financial_projections, marketing_strategy, operations_plan, risk_analysis, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        userId,
        businessIdeaId,
        businessPlan.title || `${businessIdea.title} - Business Plan`,
        businessPlan.executiveSummary || businessPlan.executive_summary || '',
        businessPlan.marketAnalysis || businessPlan.market_analysis || '',
        JSON.stringify(businessPlan.financialProjections || businessPlan.financial_projections || {}),
        businessPlan.marketingSales || businessPlan.marketing_strategy || '',
        businessPlan.operationsPlan || businessPlan.operations_plan || '',
        businessPlan.riskAnalysis || businessPlan.risk_analysis || ''
      ]
    );

    res.json({
      message: 'Business plan generated successfully',
      planId: planResult.insertId,
      businessPlan
    });

  } catch (error) {
    console.error('Generate business plan error:', error);
    res.status(500).json({ error: 'Failed to generate business plan' });
  }
});

// Generate financial projection
router.post('/generate-financial-projection', authenticateToken, [
  body('businessIdeaId').isInt().withMessage('Business idea ID is required'),
  body('location').optional().trim(),
  body('budget').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { businessIdeaId, location = 'Musanze', budget = '50000-200000' } = req.body;
    const userId = req.user.id;

    // Get business idea details
    const ideaResult = await query(
      'SELECT * FROM business_ideas WHERE id = ? AND user_id = ?',
      [businessIdeaId, userId]
    );

    if (ideaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business idea not found' });
    }

    const businessIdea = ideaResult.rows[0];

    // Generate financial projection using AI
    const financialProjection = await geminiService.generateFinancialProjection(businessIdea, location, budget);

    // For now, we'll return the projection directly
    // In a full implementation, you might want to save this to a separate table
    res.json({
      message: 'Financial projection generated successfully',
      projectionId: businessIdeaId, // Using business idea ID as projection ID for now
      financialProjection
    });

  } catch (error) {
    console.error('Generate financial projection error:', error);
    res.status(500).json({ error: 'Failed to generate financial projection' });
  }
});

// Get business plan by ID
router.get('/business-plan/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get business plan
    const planResult = await query(
      'SELECT * FROM business_plans WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business plan not found' });
    }

    const plan = planResult.rows[0];

    // Get the related business idea
    const ideaResult = await query(
      'SELECT * FROM business_ideas WHERE id = ? AND user_id = ?',
      [plan.business_idea_id, userId]
    );

    if (ideaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Related business idea not found' });
    }

    const businessIdea = ideaResult.rows[0];

    // Helper function to convert objects to readable text with proper formatting
    const formatObjectToText = (obj) => {
      if (typeof obj === 'string') return obj;
      if (typeof obj === 'object' && obj !== null) {
        // Handle arrays (like table rows)
        if (Array.isArray(obj)) {
          return obj.map(item => formatObjectToText(item)).join('\n');
        }

        // Handle objects
        return Object.entries(obj)
          .map(([key, value]) => {
            const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

            if (typeof value === 'object' && value !== null) {
              // Check if this looks like a table (has numeric values or array structure)
              if (Array.isArray(value) || (typeof value === 'object' && Object.values(value).some(v => typeof v === 'number' || typeof v === 'string'))) {
                return formatTable(formattedKey, value);
              }
              return `${formattedKey}:\n${formatObjectToText(value).split('\n').map(line => `  ${line}`).join('\n')}`;
            }
            return `${formattedKey}: ${value}`;
          })
          .join('\n\n');
      }
      return String(obj || '');
    };

    // Helper function to format data as tables
    const formatTable = (title, data) => {
      if (Array.isArray(data)) {
        // Simple array - just list items
        return `${title}:\n${data.map(item => `• ${item}`).join('\n')}`;
      }

      if (typeof data === 'object' && data !== null) {
        // Check if this looks like tabular data (has year columns, etc.)
        const keys = Object.keys(data);
        const values = Object.values(data);

        // If all values are numbers or strings, format as a simple list
        if (values.every(v => typeof v === 'number' || typeof v === 'string')) {
          return `${title}:\n${keys.map(key => `• ${key}: ${data[key]}`).join('\n')}`;
        }

        // If values are objects, format as nested structure
        return `${title}:\n${Object.entries(data).map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            return `  ${key}:\n${Object.entries(value).map(([subKey, subValue]) => `    ${subKey}: ${subValue}`).join('\n')}`;
          }
          return `  ${key}: ${value}`;
        }).join('\n')}`;
      }

      return `${title}: ${data}`;
    };

    // Check if this is the new format (sections in separate columns) or old format (JSON in executive_summary)
    let formattedBusinessPlan;

    // Check if any of the section columns have content (new format)
    const hasNewFormat = plan.market_analysis || plan.financial_projections || plan.marketing_strategy || plan.operations_plan || plan.risk_analysis;

    // Check if executive_summary contains JSON (old format)
    const hasOldFormat = plan.executive_summary && plan.executive_summary.trim().startsWith('{');

    console.log('Business plan format detection:', {
      hasNewFormat,
      hasOldFormat,
      executive_summary_length: plan.executive_summary?.length || 0,
      executive_summary_starts_with_json: plan.executive_summary?.trim().startsWith('{') || false,
      market_analysis: plan.market_analysis ? 'has content' : 'empty',
      financial_projections: plan.financial_projections ? 'has content' : 'empty'
    });

    if (hasNewFormat && !hasOldFormat) {
      // New format: sections are in separate columns
      formattedBusinessPlan = {
        id: plan.id,
        title: plan.title,
        business_idea_id: plan.business_idea_id,
        status: plan.status,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
        executive_summary: formatObjectToText(plan.executive_summary || ''),
        market_analysis: formatObjectToText(plan.market_analysis || ''),
        financial_projections: formatObjectToText(plan.financial_projections || ''),
        marketing_strategy: formatObjectToText(plan.marketing_strategy || ''),
        operations_plan: formatObjectToText(plan.operations_plan || ''),
        risk_analysis: formatObjectToText(plan.risk_analysis || '')
      };
    } else {
      // Old format: try to parse JSON from executive_summary
      let businessPlan = null;
      if (plan.executive_summary) {
        try {
          businessPlan = JSON.parse(plan.executive_summary);
          console.log('Successfully parsed old format business plan JSON');
          console.log('Parsed business plan keys:', Object.keys(businessPlan));
        } catch (error) {
          console.log('Failed to parse business plan JSON, using raw content');
          console.log('JSON parse error:', error.message);
          businessPlan = {
            title: plan.title,
            content: plan.executive_summary
          };
        }
      }

      formattedBusinessPlan = {
        id: plan.id,
        title: plan.title,
        business_idea_id: plan.business_idea_id,
        status: plan.status,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
        // Map the parsed JSON content to the expected fields and convert objects to text
        executive_summary: formatObjectToText(businessPlan?.executiveSummary || businessPlan?.content || ''),
        market_analysis: formatObjectToText(businessPlan?.marketAnalysis || ''),
        financial_projections: formatObjectToText(businessPlan?.financialProjections || ''),
        marketing_strategy: formatObjectToText(businessPlan?.marketingSales || ''),
        operations_plan: formatObjectToText(businessPlan?.operationsPlan || ''),
        risk_analysis: formatObjectToText(businessPlan?.riskAnalysis || '')
      };
    }

    console.log('Formatted business plan sections:', {
      executive_summary: formattedBusinessPlan.executive_summary?.substring(0, 100) + '...',
      market_analysis: formattedBusinessPlan.market_analysis?.substring(0, 100) + '...',
      financial_projections: formattedBusinessPlan.financial_projections?.substring(0, 100) + '...',
      marketing_strategy: formattedBusinessPlan.marketing_strategy?.substring(0, 100) + '...',
      operations_plan: formattedBusinessPlan.operations_plan?.substring(0, 100) + '...',
      risk_analysis: formattedBusinessPlan.risk_analysis?.substring(0, 100) + '...'
    });

    res.json({
      businessIdea,
      businessPlan: formattedBusinessPlan
    });

  } catch (error) {
    console.error('Get business plan error:', error);
    res.status(500).json({ error: 'Failed to fetch business plan' });
  }
});

// Generate business plan section with AI
router.post('/generate-business-plan-section', authenticateToken, [
  body('section').notEmpty().withMessage('Section is required'),
  body('businessIdeaId').isInt().withMessage('Business idea ID is required'),
  body('content').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { section, businessIdeaId, content = '' } = req.body;
    const userId = req.user.id;

    // Get the business idea
    const ideaResult = await query(
      'SELECT * FROM business_ideas WHERE id = ? AND user_id = ?',
      [businessIdeaId, userId]
    );

    if (ideaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business idea not found' });
    }

    const businessIdea = ideaResult.rows[0];

    // Generate section content using AI
    const sectionContent = await geminiService.generateBusinessPlanSection(
      businessIdea,
      section,
      content,
      businessIdea.location || 'Musanze',
      businessIdea.budget_range || '50000-200000'
    );

    res.json({
      message: 'Section generated successfully',
      content: sectionContent
    });

  } catch (error) {
    console.error('Generate business plan section error:', error);
    res.status(500).json({ error: 'Failed to generate section' });
  }
});

module.exports = router;