require('dotenv').config();
const geminiService = require('./server/services/geminiService.js');

async function testGemini() {
    try {
        console.log('Testing Gemini Service...');
        console.log('API Key available:', process.env.GEMINI_API_KEY ? 'Yes' : 'No');
        console.log('API Key value:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'Not set');

        const testBusinessIdea = {
            title: "Test Business",
            description: "A test business idea",
            industry: "Technology",
            target_market: "Local market",
            initial_investment: 50000,
            expected_revenue: 100000
        };

        console.log('Testing business plan generation...');
        const result = await geminiService.generateBusinessPlan(testBusinessIdea, 'Musanze', '50000-200000');
        console.log('Result:', result);

    } catch (error) {
        console.error('Error testing Gemini:', error);
    }
}

testGemini();
