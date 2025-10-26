const { GoogleGenerativeAI } = require('@google/generative-ai');
const { query } = require('../config/database');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  // Generate business ideas based on user input
  async generateBusinessIdeas(userInput, location = 'Musanze', budget = '50000-200000') {
    const budgetRanges = {
      '0-50000': '0 - 50,000 RWF (very low budget)',
      '50000-200000': '50,000 - 200,000 RWF (low budget)',
      '200000-500000': '200,000 - 500,000 RWF (medium budget)',
      '500000-1000000': '500,000 - 1,000,000 RWF (high budget)',
      '1000000+': '1,000,000+ RWF (very high budget)'
    };

    const budgetDescription = budgetRanges[budget] || budgetRanges['50000-200000'];

    const prompt = `
You are an expert business consultant specializing in Rwandan entrepreneurship, particularly in the ${location} region. 
Generate 5 innovative business ideas based on the following criteria:

User Input: ${userInput}
Location: ${location}
Budget Range: ${budgetDescription}

Consider:
- Local market opportunities in ${location} (tourism, agriculture, technology, services)
- Rwanda's economic development priorities
- Budget constraints: ${budgetDescription} - ALL investment amounts MUST be within this range
- Realistic revenue expectations for small businesses in ${location}
- Scalability potential within the budget
- Local resources and talent availability in ${location}
- Cultural and social factors specific to ${location}
- Typical pricing and income levels in ${location}

For each idea, provide:
1. Business Title
2. Brief Description (2-3 sentences)
3. Target Market
4. Initial Investment Required (in RWF - must be within the specified budget range)
5. Expected Monthly Revenue (in RWF - realistic range based on local market)
6. Key Success Factors
7. Potential Challenges

Format the response as a JSON array with these fields:
- title
- description
- targetMarket
- initialInvestment (in RWF, must be within budget range)
- expectedRevenue (in RWF, realistic monthly revenue)
- successFactors
- challenges
- industry
- successProbability (1-100)

Focus on practical, achievable ideas that can start small and grow.

IMPORTANT:
- Initial investment MUST be within the specified budget range (${budgetDescription})
- Expected revenue should be realistic for small businesses in ${location}
- Use RWF currency for all financial amounts
- Provide specific, achievable revenue projections based on local market conditions
- Example: For 50,000-200,000 RWF budget, investment should be 50,000-200,000 RWF
- Example: For small businesses in ${location}, monthly revenue might be 20,000-100,000 RWF
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Try to parse JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: return structured data even if not perfect JSON
      return this.parseBusinessIdeas(text);
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error('Failed to generate business ideas');
    }
  }

  // Chat with AI about business guidance
  async chatWithAI(message, conversationHistory = [], businessContext = null, location = 'Musanze', budget = '', businessSector = '') {
    const contextPrompt = businessContext ?
      `Business Context: ${JSON.stringify(businessContext, null, 2)}\n\n` : '';

    const historyPrompt = conversationHistory.length > 0 ?
      `Previous conversation:\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n\n` : '';

    const budgetRanges = {
      '0-50000': '0 - 50,000 RWF (very low budget)',
      '50000-200000': '50,000 - 200,000 RWF (low budget)',
      '200000-500000': '200,000 - 500,000 RWF (medium budget)',
      '500000-1000000': '500,000 - 1,000,000 RWF (high budget)',
      '1000000+': '1,000,000+ RWF (very high budget)'
    };

    const budgetDescription = budgetRanges[budget] || '';

    const prompt = `
You are InnoStart AI, a helpful business consultant specializing in Rwandan entrepreneurship, particularly in ${location}.

User Context:
- Location: ${location}
- Budget Range: ${budgetDescription}
- Business Sector: ${businessSector}

${contextPrompt}${historyPrompt}User Question: ${message}

Please provide helpful, practical advice about:
- Business planning and strategy specific to ${location}
- Market analysis and validation for ${businessSector} sector in ${location}
- Financial planning and projections within ${budgetDescription}
- Marketing and customer acquisition strategies for ${location}
- Operations and logistics considerations for ${location}
- Legal and regulatory requirements in Rwanda
- Local resources and opportunities in ${location}
- Sector-specific opportunities in ${businessSector}

Keep responses concise (2-3 paragraphs max) and actionable. Focus on practical steps the user can take.
If you don't know something specific about Rwanda, say so and provide general guidance.

Respond in a friendly, encouraging tone that motivates the user to take action.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini chat error:', error);
      throw new Error('Failed to get AI response');
    }
  }

  // Generate business plan sections
  async generateBusinessPlanSection(section, businessIdea, existingContent = '') {
    const prompts = {
      executive_summary: `
Create an executive summary for this business idea:
Title: ${businessIdea.title}
Description: ${businessIdea.description}
Industry: ${businessIdea.industry}
Target Market: ${businessIdea.target_market}
Initial Investment: $${businessIdea.initial_investment}

Make it compelling and professional, highlighting the key value proposition and growth potential.
Keep it to 2-3 paragraphs.
`,

      market_analysis: `
Conduct a market analysis for this business in Musanze, Rwanda:
Title: ${businessIdea.title}
Description: ${businessIdea.description}
Industry: ${businessIdea.industry}
Target Market: ${businessIdea.target_market}

Include:
- Market size and opportunity
- Target customer demographics
- Competitive landscape
- Market trends and growth potential
- Local market characteristics in Musanze

Focus on practical, research-based insights.
`,

      financial_projections: `
Create financial projections for this business:
Title: ${businessIdea.title}
Description: ${businessIdea.description}
Initial Investment: $${businessIdea.initial_investment}
Expected Revenue: $${businessIdea.expected_revenue}

Provide:
- 3-year revenue projections
- Monthly cash flow for first year
- Break-even analysis
- Key financial assumptions
- Funding requirements

Format as structured financial data suitable for business planning.
`,

      marketing_strategy: `
Develop a marketing strategy for this business in Musanze:
Title: ${businessIdea.title}
Description: ${businessIdea.description}
Target Market: ${businessIdea.target_market}

Include:
- Marketing channels (digital and traditional)
- Local marketing opportunities
- Customer acquisition strategy
- Brand positioning
- Budget allocation
- Timeline for implementation

Focus on cost-effective strategies suitable for small businesses.
`,

      operations_plan: `
Create an operations plan for this business:
Title: ${businessIdea.title}
Description: ${businessIdea.description}
Industry: ${businessIdea.industry}

Include:
- Daily operations workflow
- Required resources and equipment
- Staffing requirements
- Location and facilities
- Supply chain considerations
- Quality control measures
- Technology requirements

Make it practical and implementable for a small business in Musanze.
`,

      risk_analysis: `
Analyze risks for this business:
Title: ${businessIdea.title}
Description: ${businessIdea.description}
Industry: ${businessIdea.industry}

Include:
- Market risks
- Financial risks
- Operational risks
- Regulatory risks in Rwanda
- Mitigation strategies
- Contingency plans

Be realistic about challenges while providing solutions.
`
    };

    const prompt = prompts[section] || `Generate content for ${section} section of a business plan.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error(`Gemini business plan error for ${section}:`, error);
      throw new Error(`Failed to generate ${section} section`);
    }
  }

  // Parse business ideas from text response (fallback method)
  parseBusinessIdeas(text) {
    const ideas = [];
    const lines = text.split('\n');
    let currentIdea = {};

    for (let line of lines) {
      line = line.trim();
      if (line.includes('Business Title:') || line.includes('1.')) {
        if (Object.keys(currentIdea).length > 0) {
          ideas.push(currentIdea);
        }
        currentIdea = { title: line.replace(/^(Business Title:|1\.)\s*/, '') };
      } else if (line.includes('Description:')) {
        currentIdea.description = line.replace('Description:', '').trim();
      } else if (line.includes('Target Market:')) {
        currentIdea.targetMarket = line.replace('Target Market:', '').trim();
      } else if (line.includes('Investment:')) {
        const investment = line.match(/\$?([0-9,]+)/);
        currentIdea.initialInvestment = investment ? parseInt(investment[1].replace(',', '')) : 0;
      } else if (line.includes('Revenue:')) {
        const revenue = line.match(/\$?([0-9,]+)/);
        currentIdea.expectedRevenue = revenue ? parseInt(revenue[1].replace(',', '')) : 0;
      }
    }

    if (Object.keys(currentIdea).length > 0) {
      ideas.push(currentIdea);
    }

    return ideas;
  }

  // Generate complete business plan
  async generateBusinessPlan(businessIdea, location = 'Musanze', budget = '50000-200000') {
    const budgetRanges = {
      '0-50000': '0 - 50,000 RWF (very low budget)',
      '50000-200000': '50,000 - 200,000 RWF (low budget)',
      '200000-500000': '200,000 - 500,000 RWF (medium budget)',
      '500000-1000000': '500,000 - 1,000,000 RWF (high budget)',
      '1000000+': '1,000,000+ RWF (very high budget)'
    };

    const budgetDescription = budgetRanges[budget] || budgetRanges['50000-200000'];

    const prompt = `
You are an expert business consultant creating a comprehensive business plan for a Rwandan entrepreneur in ${location}.

Business Idea Details:
- Title: ${businessIdea.title}
- Description: ${businessIdea.description}
- Industry: ${businessIdea.industry}
- Target Market: ${businessIdea.target_market}
- Initial Investment: ${businessIdea.initial_investment} RWF
- Expected Revenue: ${businessIdea.expected_revenue} RWF
- Success Probability: ${businessIdea.success_probability}%

Location: ${location}
Budget Range: ${budgetDescription}

Create a comprehensive business plan with the following sections:

1. EXECUTIVE SUMMARY
   - Business overview and mission
   - Key value proposition
   - Financial highlights
   - Growth potential

2. COMPANY DESCRIPTION
   - Business concept and vision
   - Legal structure recommendations
   - Location advantages in ${location}

3. MARKET ANALYSIS
   - Target market analysis for ${location}
   - Market size and opportunity
   - Competitive landscape
   - Market trends and growth potential

4. ORGANIZATION & MANAGEMENT
   - Organizational structure
   - Key personnel requirements
   - Management team recommendations

5. SERVICE/PRODUCT LINE
   - Detailed product/service description
   - Unique selling propositions
   - Development roadmap

6. MARKETING & SALES
   - Marketing strategy for ${location}
   - Sales strategy and channels
   - Customer acquisition plan
   - Pricing strategy

7. FINANCIAL PROJECTIONS
   - 3-year financial projections
   - Monthly cash flow (first year)
   - Break-even analysis
   - Funding requirements

8. OPERATIONS PLAN
   - Daily operations workflow
   - Required resources and equipment
   - Location and facilities
   - Technology requirements

9. RISK ANALYSIS
   - Market risks
   - Financial risks
   - Operational risks
   - Mitigation strategies

10. IMPLEMENTATION TIMELINE
    - Phase-by-phase launch plan
    - Key milestones
    - Resource allocation

IMPORTANT: Format your response as a valid JSON object with the following structure:
{
  "title": "Business Plan Title",
  "executiveSummary": "...",
  "companyDescription": "...",
  "marketAnalysis": "...",
  "organizationManagement": "...",
  "serviceProductLine": "...",
  "marketingSales": "...",
  "financialProjections": "...",
  "operationsPlan": "...",
  "riskAnalysis": "...",
  "implementationTimeline": "..."
}

Focus on practical, actionable content specific to ${location} and the ${budgetDescription} budget range.
Use RWF currency throughout and provide realistic projections based on local market conditions.
Ensure the JSON is properly formatted and valid.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('Gemini business plan response length:', text.length);
      console.log('First 500 chars:', text.substring(0, 500));

      // Try to parse JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (jsonError) {
          console.log('JSON parse error, using fallback:', jsonError.message);
          // Fallback: return structured text
          return {
            title: `${businessIdea.title} - Business Plan`,
            content: text,
            sections: this.parseBusinessPlanSections(text)
          };
        }
      }

      // Fallback: return structured text
      return {
        title: `${businessIdea.title} - Business Plan`,
        content: text,
        sections: this.parseBusinessPlanSections(text)
      };
    } catch (error) {
      console.error('Gemini business plan error:', error);
      throw new Error('Failed to generate business plan');
    }
  }

  // Generate financial projection
  async generateFinancialProjection(businessIdea, location = 'Musanze', budget = '50000-200000') {
    const budgetRanges = {
      '0-50000': '0 - 50,000 RWF (very low budget)',
      '50000-200000': '50,000 - 200,000 RWF (low budget)',
      '200000-500000': '200,000 - 500,000 RWF (medium budget)',
      '500000-1000000': '500,000 - 1,000,000 RWF (high budget)',
      '1000000+': '1,000,000+ RWF (very high budget)'
    };

    const budgetDescription = budgetRanges[budget] || budgetRanges['50000-200000'];

    const prompt = `
You are a financial analyst creating detailed financial projections for a business in ${location}, Rwanda.

Business Details:
- Title: ${businessIdea.title}
- Description: ${businessIdea.description}
- Industry: ${businessIdea.industry}
- Target Market: ${businessIdea.target_market}
- Initial Investment: ${businessIdea.initial_investment} RWF
- Expected Revenue: ${businessIdea.expected_revenue} RWF

Location: ${location}
Budget Range: ${budgetDescription}

Create comprehensive financial projections including:

1. REVENUE PROJECTIONS
   - Monthly revenue for first 12 months
   - Annual revenue for years 1-3
   - Revenue growth assumptions
   - Seasonal variations for ${location}

2. EXPENSE PROJECTIONS
   - Fixed costs (rent, utilities, salaries)
   - Variable costs (materials, marketing, operations)
   - One-time startup costs
   - Monthly expense breakdown

3. CASH FLOW ANALYSIS
   - Monthly cash flow statement
   - Working capital requirements
   - Cash flow break-even point
   - Peak funding requirements

4. PROFIT & LOSS PROJECTIONS
   - Monthly P&L for first year
   - Annual P&L for years 1-3
   - Gross margin analysis
   - Net profit projections

5. BALANCE SHEET PROJECTIONS
   - Assets (current and fixed)
   - Liabilities and equity
   - Working capital analysis

6. KEY FINANCIAL RATIOS
   - Gross margin percentage
   - Net profit margin
   - Return on investment (ROI)
   - Break-even analysis

7. FUNDING REQUIREMENTS
   - Total funding needed
   - Funding timeline
   - Use of funds breakdown
   - Repayment projections

8. SENSITIVITY ANALYSIS
   - Best case scenario
   - Worst case scenario
   - Most likely scenario
   - Key assumptions

IMPORTANT: Format your response as a valid JSON object with the following structure:
{
  "title": "Financial Projections Title",
  "revenueProjections": {...},
  "expenseProjections": {...},
  "cashFlowAnalysis": {...},
  "profitLossProjections": {...},
  "balanceSheetProjections": {...},
  "keyFinancialRatios": {...},
  "fundingRequirements": {...},
  "sensitivityAnalysis": {...}
}

Use RWF currency throughout and base projections on realistic market conditions in ${location}.
Provide specific numbers and calculations that can be used for business planning.
Ensure the JSON is properly formatted and valid.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('Gemini financial projection response length:', text.length);
      console.log('First 500 chars:', text.substring(0, 500));

      // Try to parse JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (jsonError) {
          console.log('JSON parse error, using fallback:', jsonError.message);
          // Fallback: return structured text
          return {
            title: `${businessIdea.title} - Financial Projections`,
            content: text,
            projections: this.parseFinancialProjections(text)
          };
        }
      }

      // Fallback: return structured text
      return {
        title: `${businessIdea.title} - Financial Projections`,
        content: text,
        projections: this.parseFinancialProjections(text)
      };
    } catch (error) {
      console.error('Gemini financial projection error:', error);
      throw new Error('Failed to generate financial projection');
    }
  }

  // Parse business plan sections from text (fallback method)
  parseBusinessPlanSections(text) {
    const sections = {};
    const lines = text.split('\n');
    let currentSection = '';
    let currentContent = [];

    for (let line of lines) {
      line = line.trim();
      if (line.match(/^\d+\.\s+[A-Z\s]+/) || line.match(/^[A-Z\s]+:$/)) {
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n');
        }
        currentSection = line.replace(/^\d+\.\s+/, '').replace(':', '');
        currentContent = [];
      } else if (line && currentSection) {
        currentContent.push(line);
      }
    }

    if (currentSection) {
      sections[currentSection] = currentContent.join('\n');
    }

    return sections;
  }

  // Parse financial projections from text (fallback method)
  parseFinancialProjections(text) {
    const projections = {};
    const lines = text.split('\n');
    let currentSection = '';
    let currentData = [];

    for (let line of lines) {
      line = line.trim();
      if (line.match(/^\d+\.\s+[A-Z\s]+/) || line.match(/^[A-Z\s]+:$/)) {
        if (currentSection) {
          projections[currentSection] = currentData.join('\n');
        }
        currentSection = line.replace(/^\d+\.\s+/, '').replace(':', '');
        currentData = [];
      } else if (line && currentSection) {
        currentData.push(line);
      }
    }

    if (currentSection) {
      projections[currentSection] = currentData.join('\n');
    }

    return projections;
  }

  // Get relevant local knowledge for RAG
  async getRelevantKnowledge(query, limit = 5) {
    try {
      // This would typically use vector similarity search
      // For now, we'll do a simple text search
      const result = await query(
        `SELECT title, content, document_type, source, metadata
         FROM knowledge_documents 
         WHERE content ILIKE ? OR title ILIKE ?
         ORDER BY created_at DESC 
         LIMIT ?`,
        [`%${query}%`, `%${query}%`, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Knowledge retrieval error:', error);
      return [];
    }
  }

  // Generate individual business plan section
  async generateBusinessPlanSection(businessIdea, section, existingContent = '', location = 'Musanze', budget = '50000-200000') {
    const budgetRanges = {
      '0-50000': '0 - 50,000 RWF (very low budget)',
      '50000-200000': '50,000 - 200,000 RWF (low budget)',
      '200000-500000': '200,000 - 500,000 RWF (medium budget)',
      '500000-1000000': '500,000 - 1,000,000 RWF (high budget)',
      '1000000+': '1,000,000+ RWF (very high budget)'
    };
    const budgetDescription = budgetRanges[budget] || budgetRanges['50000-200000'];

    const sectionPrompts = {
      'executive_summary': `Create a comprehensive executive summary for a business plan in ${location}, Rwanda.`,
      'market_analysis': `Conduct a detailed market analysis for a business in ${location}, Rwanda.`,
      'financial_projections': `Create detailed financial projections for a business in ${location}, Rwanda.`,
      'marketing_strategy': `Develop a comprehensive marketing strategy for a business in ${location}, Rwanda.`,
      'operations_plan': `Create a detailed operations plan for a business in ${location}, Rwanda.`,
      'risk_analysis': `Conduct a thorough risk analysis for a business in ${location}, Rwanda.`
    };

    const sectionPrompt = sectionPrompts[section] || `Generate content for the ${section} section of a business plan.`;

    const prompt = `
      You are an expert business consultant creating content for a business plan section in ${location}, Rwanda.

      Business Details:
      - Title: ${businessIdea.title}
      - Description: ${businessIdea.description}
      - Industry: ${businessIdea.industry}
      - Target Market: ${businessIdea.target_market}
      - Initial Investment: ${businessIdea.initial_investment} RWF
      - Expected Revenue: ${businessIdea.expected_revenue} RWF
      - Success Probability: ${businessIdea.success_probability}%

      Location: ${location}
      Budget Range: ${budgetDescription}
      Section: ${section}

      ${sectionPrompt}

      ${existingContent ? `\nExisting content to improve or expand upon:\n${existingContent}\n` : ''}

      Requirements:
      - Focus specifically on ${location} market conditions
      - Use RWF currency throughout
      - Provide practical, actionable content
      - Make it specific to the ${budgetDescription} budget range
      - Ensure content is detailed and professional
      - If improving existing content, enhance and expand it rather than replacing it entirely

      Generate comprehensive, well-structured content for this section.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log(`Generated ${section} section content length:`, text.length);

      return text;
    } catch (error) {
      console.error(`Gemini ${section} section error:`, error);
      throw new Error(`Failed to generate ${section} section`);
    }
  }
}

module.exports = new GeminiService();

