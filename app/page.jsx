'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Plus, Trash2, AlertCircle, BarChart3, Clock, Target, Shield, Search, Zap, Globe, Rss, Database } from 'lucide-react';

export default function Home() {
  const [news, setNews] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioNews, setPortfolioNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [portfolioNewsLoading, setPortfolioNewsLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [newStock, setNewStock] = useState({ symbol: '', name: '', quantity: 0 });
  const [showAddStock, setShowAddStock] = useState(false);
  const [overallSentiment, setOverallSentiment] = useState(null);
  const [newsSource, setNewsSource] = useState('');
  const [newsBreakdown, setNewsBreakdown] = useState(null);
  const [activeTab, setActiveTab] = useState('latest'); 

  useEffect(() => {
    const savedPortfolio = localStorage.getItem('portfolio');
    if (savedPortfolio) {
      setPortfolio(JSON.parse(savedPortfolio));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      console.log('Fetching General News...');
      
      const response = await fetch('/api/news', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('News API response:', data);
      
      if (data.news && Array.isArray(data.news)) {
        setNews(data.news);
        setNewsSource(data.source || 'unknown');
        setNewsBreakdown(data.breakdown || null);
        console.log(`Loaded ${data.news.length} news items from ${data.source} sources`);
      } else {
        throw new Error('Invalid news data structure received');
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      
      const fallbackNews = [
        {
          title: "Market Update: Unable to fetch live news. Please check your connection and try again.",
          url: "#",
          source: "System Alert",
          timestamp: "Now",
          category: "error"
        },
        {
          title: "Indian markets continue to show resilience amid global uncertainties",
          url: "https://www.moneycontrol.com/news/business/markets/",
          source: "Market Monitor",
          timestamp: "Recent",
          category: "fallback"
        },
        {
          title: "Banking and IT sectors remain in focus for investors this week",
          url: "https://economictimes.indiatimes.com/markets",
          source: "Market Monitor",
          timestamp: "Recent",
          category: "fallback"
        }
      ];
      
      setNews(fallbackNews);
      setNewsSource('error');
      setNewsBreakdown(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolioNews = async () => {
    if (portfolio.length === 0) {
      setPortfolioNews([]);
      return;
    }

    setPortfolioNewsLoading(true);
    try {
      console.log('Fetching portfolio-specific news for:', portfolio.map(s => s.symbol));
      
      const response = await fetch('/api/portfolio-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ portfolio })
      });
      
      if (!response.ok) {
        throw new Error(`Portfolio news API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Portfolio news response:', data);
      
      if (data.portfolioNews && Array.isArray(data.portfolioNews)) {
        setPortfolioNews(data.portfolioNews);
        console.log(`Loaded ${data.portfolioNews.length} portfolio-specific news items`);
      } else {
        throw new Error('Invalid portfolio news data received');
      }
    } catch (error) {
      console.error('Error fetching portfolio news:', error);
      
      const fallbackNews = portfolio.map(stock => ({
        title: `${stock.name} (${stock.symbol}): Monitor for latest developments, quarterly results, and market movements`,
        url: `https://www.moneycontrol.com/india/stockpricequote/${stock.symbol.toLowerCase()}`,
        source: 'Portfolio Monitor',
        timestamp: 'Active monitoring',
        relevantStocks: [stock.symbol],
        isGenerated: true,
        category: 'portfolio-fallback'
      }));
      
      setPortfolioNews(fallbackNews);
    } finally {
      setPortfolioNewsLoading(false);
    }
  };

  const analyzePortfolioNews = async () => {
    if (portfolioNews.length === 0) {
      alert('No portfolio news available to analyze. Please fetch portfolio news first.');
      return;
    }
    
    setAnalysisLoading(true);
    try {
      console.log('Starting AI analysis of portfolio news...');
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          news: portfolioNews.map(n => ({ 
            title: n.title, 
            relevantStocks: n.relevantStocks || []
          })),
          portfolio: portfolio.map(p => p.symbol)
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Analysis failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log('Analysis response:', data);
      
      if (data.analyses && Array.isArray(data.analyses)) {
        const analyzedNews = portfolioNews.map((newsItem, index) => ({
          ...newsItem,
          analysis: data.analyses[index] || null
        }));
        setPortfolioNews(analyzedNews);
        setOverallSentiment(data.overallSentiment);
        console.log('AI analysis completed successfully');
      } else {
        throw new Error('Invalid analysis data structure received');
      }
    } catch (error) {
      console.error('Error analyzing portfolio news:', error);
      alert(`Analysis temporarily unavailable: ${error.message}. Please try again later.`);
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    if (portfolio.length > 0) {
      fetchPortfolioNews();
      setOverallSentiment(null); 
    } else {
      setPortfolioNews([]);
      setOverallSentiment(null);
    }
  }, [portfolio]);

  const addStock = () => {
    if (!newStock.symbol || !newStock.name || newStock.quantity <= 0) {
      alert('Please fill all fields with valid values!');
      return;
    }
    
    const exists = portfolio.some(stock => 
      stock.symbol.toLowerCase() === newStock.symbol.toLowerCase()
    );
    
    if (exists) {
      alert('Stock already exists in portfolio!');
      return;
    }
    
    setPortfolio(prev => [...prev, { ...newStock }]);
    setNewStock({ symbol: '', name: '', quantity: 0 });
    setShowAddStock(false);
    console.log('Added stock to portfolio:', newStock);
  };

  const removeStock = (index) => {
    if (confirm('Are you sure you want to remove this stock from your portfolio?')) {
      const removedStock = portfolio[index];
      setPortfolio(prev => prev.filter((_, i) => i !== index));
      console.log('Removed stock from portfolio:', removedStock);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'negative': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-50 border-green-200 text-green-800';
      case 'negative': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  const getTimeframeIcon = (timeframe) => {
    switch (timeframe) {
      case 'short-term': return <Clock className="w-3 h-3" />;
      case 'medium-term': return <Target className="w-3 h-3" />;
      case 'long-term': return <BarChart3 className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const getRiskIcon = (riskLevel) => {
    return <Shield className={`w-3 h-3 ${
      riskLevel === 'high' ? 'text-red-500' : 
      riskLevel === 'medium' ? 'text-yellow-500' : 'text-green-500'
    }`} />;
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'scraped': return <Globe className="w-4 h-4 text-green-600" />;
      case 'mixed': return <Database className="w-4 h-4 text-blue-600" />;
      case 'limited': return <Rss className="w-4 h-4 text-orange-600" />;
      case 'fallback': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'emergency': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Globe className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSourceDescription = (source) => {
    switch (source) {
      case 'scraped': return 'Live market data from multiple sources';
      case 'mixed': return 'Combined live and RSS feed data';
      case 'limited': return 'Limited live data available';
      case 'fallback': return 'Using backup news data';
      case 'emergency': return 'Emergency fallback mode';
      case 'error': return 'Connection issues detected';
      default: return 'News source status unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      
      <div className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Smart News + Portfolio Insights
              </h1>
              <p className="text-gray-600 mt-2 text-lg">AI-powered stock market analysis for Indian markets</p>
              
              {newsSource && (
                <div className="flex items-center gap-3 mt-3">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${
                    newsSource === 'scraped' ? 'bg-green-100 text-green-800' :
                    newsSource === 'mixed' ? 'bg-blue-100 text-blue-800' :
                    newsSource === 'limited' ? 'bg-orange-100 text-orange-800' :
                    newsSource === 'fallback' ? 'bg-yellow-100 text-yellow-800' :
                    newsSource === 'emergency' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {getSourceIcon(newsSource)}
                    <span>{getSourceDescription(newsSource)}</span>
                  </div>
                  
                  {newsBreakdown && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      
                      {newsBreakdown.fallback > 0 && (
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          Backup: {newsBreakdown.fallback}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              {portfolio.length > 0 && (
                <button
                  onClick={fetchPortfolioNews}
                  disabled={portfolioNewsLoading}
                  className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Search className={`w-5 h-5 ${portfolioNewsLoading ? 'animate-spin' : ''}`} />
                  {portfolioNewsLoading ? 'Searching...' : 'Find Portfolio News'}
                </button>
              )}
              <button
                onClick={fetchNews}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh News'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  Your Portfolio
                </h2>
                <button
                  onClick={() => setShowAddStock(true)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Stock
                </button>
              </div>
              
              {portfolio.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg mb-2">No stocks in portfolio</p>
                  <p className="text-gray-400 text-sm">Add stocks to get personalized AI-powered news analysis</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {portfolio.map((stock, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-100 hover:shadow-md transition-all duration-200">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 text-lg">{stock.symbol}</div>
                        <div className="text-sm text-gray-600 font-medium">{stock.name}</div>
                        <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full inline-block mt-1">
                          Qty: {stock.quantity.toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => removeStock(index)}
                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove stock"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showAddStock && (
                <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <h3 className="font-bold text-gray-900 mb-4 text-lg">Add New Stock</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Symbol</label>
                      <input
                        type="text"
                        value={newStock.symbol}
                        onChange={(e) => setNewStock(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="e.g., RELIANCE, TCS, INFY"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
                      <input
                        type="text"
                        value={newStock.name}
                        onChange={(e) => setNewStock(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="e.g., Reliance Industries, Tata Consultancy Services"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                      <input
                        type="number"
                        value={newStock.quantity}
                        onChange={(e) => setNewStock(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="100"
                        min="1"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={addStock}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium"
                      >
                        Add Stock
                      </button>
                      <button
                        onClick={() => setShowAddStock(false)}
                        className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3 flex flex-col gap-8">
            <div className="block lg:hidden mb-4">
              <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
                <button
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'latest' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => setActiveTab('latest')}
                >
                  General News
                </button>
                <button
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'portfolio' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => setActiveTab('portfolio')}
                  disabled={portfolio.length === 0}
                >
                  Portfolio News
                </button>
              </div>
            </div>

            <div className="block lg:hidden">
              {activeTab === 'latest' && (
                <div className="mb-8">
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow duration-300">
                    <div className="sticky top-20 bg-white z-10 pb-2 mb-4">
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <RefreshCw className="w-6 h-6 text-indigo-600" />
                        General News
                        <span className="text-sm bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full font-medium">
                          {news.length} items
                        </span>
                      </h2>
                    </div>
                    {loading ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                          <span className="text-gray-600 text-lg">Loading General News...</span>
                          <p className="text-gray-500 text-sm mt-2">Fetching from multiple sources...</p>
                        </div>
                      </div>
                    ) : news.length === 0 ? (
                      <div className="text-center py-16">
                        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg mb-2">No news available</p>
                        <p className="text-gray-400 text-sm">Please try refreshing or check your connection</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {news.map((item, index) => (
                          <div key={index} className={`border border-gray-200 rounded-xl p-5 hover:bg-gray-50 transition-all duration-200 hover:shadow-md group ${
                            item.category === 'error' ? 'bg-red-50 border-red-200' :
                            item.category === 'fallback' ? 'bg-yellow-50 border-yellow-200' :
                            item.category === 'emergency' ? 'bg-orange-50 border-orange-200' : ''
                          }`}>
                            <div className="flex justify-between items-start">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`font-semibold text-lg leading-tight hover:underline flex-1 mr-4 group-hover:text-blue-700 ${
                                  item.category === 'error' ? 'text-red-600 hover:text-red-800' :
                                  item.category === 'fallback' ? 'text-yellow-700 hover:text-yellow-800' :
                                  item.category === 'emergency' ? 'text-orange-700 hover:text-orange-800' :
                                  'text-blue-600 hover:text-blue-800'
                                }`}
                              >
                                {item.title}
                              </a>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  item.category === 'market' ? 'bg-green-100 text-green-800' :
                                  item.category === 'rss' ? 'bg-blue-100 text-blue-800' :
                                  item.category === 'fallback' ? 'bg-yellow-100 text-yellow-800' :
                                  item.category === 'emergency' ? 'bg-orange-100 text-orange-800' :
                                  item.category === 'error' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {item.source}
                                </span>
                                <span className="text-xs text-gray-400">{item.timestamp}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'portfolio' && portfolio.length > 0 && (
                <div>
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow duration-300">
                    <div className="sticky top-20 bg-white z-10 pb-2 mb-4">
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Zap className="w-6 h-6 text-purple-600" />
                        Portfolio News & AI Analysis
                        <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">
                          {portfolioNews.length} items
                        </span>
                      </h2>
                    </div>
                    {overallSentiment && (
                      <div className={`mb-6 p-4 rounded-xl border-2 ${getSentimentColor(overallSentiment.overall)}`}>
                        <div className="flex items-center gap-3 mb-2">
                          {getSentimentIcon(overallSentiment.overall)}
                          <span className="font-bold text-lg capitalize">Overall Portfolio Sentiment: {overallSentiment.overall}</span>
                          <span className="text-sm bg-white bg-opacity-50 px-2 py-1 rounded-full">
                            {overallSentiment.confidence}% confidence
                          </span>
                        </div>
                        <p className="text-sm font-medium">{overallSentiment.summary}</p>
                        <div className="flex gap-4 mt-2 text-xs">
                          <span className="text-green-700">✓ Positive: {overallSentiment.breakdown.positive}</span>
                          <span className="text-red-700">✗ Negative: {overallSentiment.breakdown.negative}</span>
                          <span className="text-yellow-700">◐ Neutral: {overallSentiment.breakdown.neutral}</span>
                        </div>
                      </div>
                    )}
                    {portfolioNewsLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                          <Search className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
                          <span className="text-gray-600 text-lg">Searching for portfolio-specific news...</span>
                        </div>
                      </div>
                    ) : portfolioNews.length === 0 ? (
                      <div className="text-center py-12">
                        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h1 className="text-center text-gray-600 text-lg font-medium">
                          No stocks in your portfolio — add some to get personalized AI-powered news analysis.
                        </h1>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {portfolioNews.map((item, index) => (
                          <div key={index} className={`border border-gray-200 rounded-xl p-6 hover:bg-gray-50 transition-all duration-200 hover:shadow-lg ${item.isGenerated ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200' : ''}`}>
                            <div className="flex justify-between items-start mb-3">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 font-semibold text-lg leading-tight hover:underline flex-1 mr-4"
                              >
                                {item.title}
                              </a>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  item.isGenerated ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {item.source}
                                </span>
                                <span className="text-xs text-gray-400">{item.timestamp}</span>
                              </div>
                            </div>
                            {item.relevantStocks && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {item.relevantStocks.map((stock, i) => (
                                  <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                                    {stock.toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.analysis && (
                              <div className={`mt-4 p-4 rounded-xl border-2 ${getSentimentColor(item.analysis.sentiment)}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    {getSentimentIcon(item.analysis.sentiment)}
                                    <span className="font-bold capitalize text-lg">{item.analysis.sentiment} Impact</span>
                                    <span className="text-sm bg-white bg-opacity-50 px-2 py-1 rounded-full">
                                      {item.analysis.confidence}% confidence
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs">
                                    <div className="flex items-center gap-1">
                                      {getTimeframeIcon(item.analysis.timeframe)}
                                      <span className="capitalize">{item.analysis.timeframe}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {getRiskIcon(item.analysis.risk_level)}
                                      <span className="capitalize">{item.analysis.risk_level} risk</span>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-sm mb-2 leading-relaxed">{item.analysis.reasoning}</p>
                                <p className="text-sm font-semibold bg-white bg-opacity-30 p-2 rounded-lg">
                                  💡 {item.analysis.impact}
                                </p>
                                {item.analysis.sectors_affected && item.analysis.sectors_affected.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {item.analysis.sectors_affected.map((sector, i) => (
                                      <span key={i} className="text-xs bg-white bg-opacity-40 px-2 py-1 rounded-full capitalize">
                                        {sector}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden lg:flex gap-8">
              <div className="w-1/2">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow duration-300 h-full flex flex-col">
                  <div className="sticky top-20 bg-white z-10 pb-2 mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <RefreshCw className="w-6 h-6 text-indigo-600" />
                      General News
                      <span className="text-sm bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full font-medium">
                        {news.length} items
                      </span>
                    </h2>
                  </div>
                  <div className="flex-1 overflow-y-auto max-h-[70vh] pr-2">
                    {loading ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                          <span className="text-gray-600 text-lg">Loading General News...</span>
                          <p className="text-gray-500 text-sm mt-2">Fetching from multiple sources...</p>
                        </div>
                      </div>
                    ) : news.length === 0 ? (
                      <div className="text-center py-16">
                        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg mb-2">No news available</p>
                        <p className="text-gray-400 text-sm">Please try refreshing or check your connection</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {news.map((item, index) => (
                          <div key={index} className={`border border-gray-200 rounded-xl p-5 hover:bg-gray-50 transition-all duration-200 hover:shadow-md group ${
                            item.category === 'error' ? 'bg-red-50 border-red-200' :
                            item.category === 'fallback' ? 'bg-yellow-50 border-yellow-200' :
                            item.category === 'emergency' ? 'bg-orange-50 border-orange-200' : ''
                          }`}>
                            <div className="flex justify-between items-start">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`font-semibold text-lg leading-tight hover:underline flex-1 mr-4 group-hover:text-blue-700 ${
                                  item.category === 'error' ? 'text-red-600 hover:text-red-800' :
                                  item.category === 'fallback' ? 'text-yellow-700 hover:text-yellow-800' :
                                  item.category === 'emergency' ? 'text-orange-700 hover:text-orange-800' :
                                  'text-blue-600 hover:text-blue-800'
                                }`}
                              >
                                {item.title}
                              </a>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  item.category === 'market' ? 'bg-green-100 text-green-800' :
                                  item.category === 'rss' ? 'bg-blue-100 text-blue-800' :
                                  item.category === 'fallback' ? 'bg-yellow-100 text-yellow-800' :
                                  item.category === 'emergency' ? 'bg-orange-100 text-orange-800' :
                                  item.category === 'error' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {item.source}
                                </span>
                                <span className="text-xs text-gray-400">{item.timestamp}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-1/2">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow duration-300 h-full flex flex-col">
                  <div className="sticky top-20 bg-white z-10 pb-2 mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <Zap className="w-6 h-6 text-purple-600" />
                      Portfolio News & AI Analysis
                    
                    </h2>
                  </div>
                  <div className="flex-1 overflow-y-auto max-h-[70vh] pr-2">
                    {overallSentiment && (
                      <div className={`mb-6 p-4 rounded-xl border-2 ${getSentimentColor(overallSentiment.overall)}`}>
                        <div className="flex items-center gap-3 mb-2">
                          {getSentimentIcon(overallSentiment.overall)}
                          <span className="font-bold text-lg capitalize">Overall Portfolio Sentiment: {overallSentiment.overall}</span>
                          <span className="text-sm bg-white bg-opacity-50 px-2 py-1 rounded-full">
                            {overallSentiment.confidence}% confidence
                          </span>
                        </div>
                        <p className="text-sm font-medium">{overallSentiment.summary}</p>
                        <div className="flex gap-4 mt-2 text-xs">
                          <span className="text-green-700">✓ Positive: {overallSentiment.breakdown.positive}</span>
                          <span className="text-red-700">✗ Negative: {overallSentiment.breakdown.negative}</span>
                          <span className="text-yellow-700">◐ Neutral: {overallSentiment.breakdown.neutral}</span>
                        </div>
                      </div>
                    )}
                    {portfolioNewsLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                          <Search className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
                          <span className="text-gray-600 text-lg">Searching for portfolio-specific news...</span>
                        </div>
                      </div>
                    ) : portfolioNews.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-600 text-lg font-semibold mb-2">No stocks added to your portfolio</p>
                        <p className="text-gray-500 text-sm">
                          Add a stock to your portfolio to view relevant news and insights.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {portfolioNews.map((item, index) => (
                          <div key={index} className={`border border-gray-200 rounded-xl p-6 hover:bg-gray-50 transition-all duration-200 hover:shadow-lg ${item.isGenerated ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200' : ''}`}>
                            <div className="flex justify-between items-start mb-3">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 font-semibold text-lg leading-tight hover:underline flex-1 mr-4"
                              >
                                {item.title}
                              </a>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  item.isGenerated ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {item.source}
                                </span>
                                <span className="text-xs text-gray-400">{item.timestamp}</span>
                              </div>
                            </div>
                            {item.relevantStocks && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {item.relevantStocks.map((stock, i) => (
                                  <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                                    {stock.toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.analysis && (
                              <div className={`mt-4 p-4 rounded-xl border-2 ${getSentimentColor(item.analysis.sentiment)}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    {getSentimentIcon(item.analysis.sentiment)}
                                    <span className="font-bold capitalize text-lg">{item.analysis.sentiment} Impact</span>
                                    <span className="text-sm bg-white bg-opacity-50 px-2 py-1 rounded-full">
                                      {item.analysis.confidence}% confidence
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs">
                                    <div className="flex items-center gap-1">
                                      {getTimeframeIcon(item.analysis.timeframe)}
                                      <span className="capitalize">{item.analysis.timeframe}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {getRiskIcon(item.analysis.risk_level)}
                                      <span className="capitalize">{item.analysis.risk_level} risk</span>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-sm mb-2 leading-relaxed">{item.analysis.reasoning}</p>
                                <p className="text-sm font-semibold bg-white bg-opacity-30 p-2 rounded-lg">
                                  💡 {item.analysis.impact}
                                </p>
                                {item.analysis.sectors_affected && item.analysis.sectors_affected.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {item.analysis.sectors_affected.map((sector, i) => (
                                      <span key={i} className="text-xs bg-white bg-opacity-40 px-2 py-1 rounded-full capitalize">
                                        {sector}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}