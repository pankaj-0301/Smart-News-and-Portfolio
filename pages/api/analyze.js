import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { news, portfolio } = req.body;

    if (!news || !portfolio) {
      return res.status(400).json({ message: 'Missing news or portfolio data' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const analyses = [];

    for (const newsItem of news) {
      const prompt = `
        You are a professional stock market analyst. Analyze this Indian stock market news headline and determine its potential impact on the specified portfolio stocks.

        News Headline: "${newsItem.title}"
        Relevant Portfolio Stocks: ${newsItem.relevantStocks ? newsItem.relevantStocks.join(', ').toUpperCase() : 'General Market'}
        
        Provide a comprehensive analysis in the following JSON format:
        {
          "sentiment": "positive" | "negative" | "neutral",
          "confidence": number (0-100),
          "reasoning": "Detailed explanation of why this news impacts the stocks (2-3 sentences)",
          "impact": "Specific actionable impact description for portfolio holders",
          "timeframe": "short-term" | "medium-term" | "long-term",
          "sectors_affected": ["sector1", "sector2"],
          "risk_level": "low" | "medium" | "high"
        }
        
        Analysis Guidelines:
        - sentiment: "positive" if likely to increase stock prices, "negative" if likely to decrease, "neutral" if mixed/minimal impact
        - confidence: Your confidence level in this assessment (0-100)
        - reasoning: Professional analysis explaining the connection between news and stock impact
        - impact: Specific, actionable insights for portfolio holders
        - timeframe: Expected duration of impact
        - sectors_affected: Which sectors this news primarily affects
        - risk_level: Overall risk assessment for portfolio holders
        
        Consider:
        - Indian market dynamics and regulations
        - Sector-specific implications
        - Broader economic context
        - Historical market reactions to similar news
        
        Return only the JSON object, no additional text.
      `;

      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        let analysis;
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[0]);
            
            if (!analysis.sentiment || !analysis.confidence || !analysis.reasoning || !analysis.impact) {
              throw new Error('Missing required fields');
            }
            
            analysis.confidence = Math.max(0, Math.min(100, analysis.confidence));
            
            analysis.timeframe = analysis.timeframe || 'short-term';
            analysis.sectors_affected = analysis.sectors_affected || ['general'];
            analysis.risk_level = analysis.risk_level || 'medium';
            
          } else {
            throw new Error('No JSON found in response');
          }
        } catch (parseError) {
          const title = newsItem.title.toLowerCase();
          let sentiment = 'neutral';
          let confidence = 60;
          let reasoning = 'Market impact analysis based on news content.';
          let impact = 'Monitor for potential portfolio effects.';
          
          if (title.includes('surge') || title.includes('rally') || title.includes('gain') || 
              title.includes('profit') || title.includes('beats') || title.includes('strong') ||
              title.includes('growth') || title.includes('record') || title.includes('high')) {
            sentiment = 'positive';
            confidence = 75;
            reasoning = 'News contains positive market indicators suggesting potential upward movement.';
            impact = 'Consider this positive development for related portfolio holdings.';
          }
          
          else if (title.includes('fall') || title.includes('drop') || title.includes('decline') || 
                   title.includes('loss') || title.includes('weak') || title.includes('concern') ||
                   title.includes('risk') || title.includes('low')) {
            sentiment = 'negative';
            confidence = 75;
            reasoning = 'News indicates potential market headwinds that could affect stock performance.';
            impact = 'Exercise caution and monitor portfolio positions closely.';
          }
          
          analysis = {
            sentiment,
            confidence,
            reasoning,
            impact,
            timeframe: 'short-term',
            sectors_affected: newsItem.relevantStocks || ['general'],
            risk_level: sentiment === 'negative' ? 'medium' : 'low'
          };
        }
        
        analyses.push(analysis);
        
      } catch (error) {
        console.error('Error analyzing individual news item:', error);
        
        analyses.push({
          sentiment: 'neutral',
          confidence: 50,
          reasoning: 'Unable to perform detailed analysis due to technical limitations. Please review manually.',
          impact: 'Manual review recommended to assess potential portfolio impact.',
          timeframe: 'unknown',
          sectors_affected: ['general'],
          risk_level: 'medium'
        });
      }

      await new Promise(resolve => setTimeout(resolve, 800));
    }

    const overallSentiment = generateOverallSentiment(analyses);

    res.status(200).json({ 
      analyses,
      overallSentiment,
      analysisTimestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in analysis:', error);
    res.status(500).json({ 
      message: 'Error analyzing news', 
      error: error.message,
      fallbackMessage: 'Analysis service temporarily unavailable. Please try again later.'
    });
  }
}

function generateOverallSentiment(analyses) {
  if (analyses.length === 0) return null;
  
  const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
  let totalConfidence = 0;
  
  analyses.forEach(analysis => {
    sentimentCounts[analysis.sentiment]++;
    totalConfidence += analysis.confidence;
  });
  
  const avgConfidence = Math.round(totalConfidence / analyses.length);
  const dominantSentiment = Object.keys(sentimentCounts).reduce((a, b) => 
    sentimentCounts[a] > sentimentCounts[b] ? a : b
  );
  
  return {
    overall: dominantSentiment,
    confidence: avgConfidence,
    breakdown: sentimentCounts,
    summary: `Based on ${analyses.length} news items analyzed, the overall sentiment is ${dominantSentiment} with ${avgConfidence}% confidence.`
  };
}