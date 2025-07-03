import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { portfolio } = req.body;

    if (!portfolio || !Array.isArray(portfolio) || portfolio.length === 0) {
      return res.status(400).json({ message: 'Portfolio data required' });
    }

    const portfolioNews = [];
    
    const searchTerms = [];
    portfolio.forEach(stock => {
      searchTerms.push(stock.symbol.toLowerCase());
      searchTerms.push(stock.name.toLowerCase());
      searchTerms.push(stock.symbol.replace(/ltd|limited/gi, '').trim().toLowerCase());
      const nameWords = stock.name.toLowerCase().split(' ');
      nameWords.forEach(word => {
        if (word.length > 3) searchTerms.push(word);
      });
    });

    const scrapingSources = [
      {
        url: 'https://www.moneycontrol.com/news/business/markets/',
        searchUrl: 'https://www.moneycontrol.com/news/business/stocks/',
        source: 'Moneycontrol',
        selectors: {
          container: '.clearfix, .news_common_box, .news-item',
          title: 'h2 a, h3 a, .news_title a, .news-title a',
          link: 'h2 a, h3 a, .news_title a, .news-title a',
          time: '.ago, .time, .news_date, .news-time'
        }
      },
      {
        url: 'https://economictimes.indiatimes.com/markets',
        searchUrl: 'https://economictimes.indiatimes.com/topic/',
        source: 'Economic Times',
        selectors: {
          container: '.eachStory, .story-box, .news-item',
          title: 'h3 a, h4 a, .story-title a, .headline a',
          link: 'h3 a, h4 a, .story-title a, .headline a',
          time: '.time, .publish-date, .story-date, .timestamp'
        }
      },
      {
        url: 'https://www.business-standard.com/markets',
        source: 'Business Standard',
        selectors: {
          container: '.listingstyle, .news-card, .story-card',
          title: 'h2 a, h3 a, .headline a',
          link: 'h2 a, h3 a, .headline a',
          time: '.date, .time, .timestamp'
        }
      }
    ];

    const scrapeWebsiteForPortfolio = async (sourceConfig) => {
      try {
        const articles = [];
        
        const response = await fetch(sourceConfig.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
          },
          timeout: 12000
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const possibleSelectors = [
          sourceConfig.selectors.container,
          'article',
          '.story',
          '.news-item',
          '.article',
          '.post',
          '.content-item',
          '.news-card'
        ];

        for (const selector of possibleSelectors) {
          const elements = $(selector);
          if (elements.length > 0) {
            elements.each((i, element) => {
              if (i >= 30) return false; 

              const $element = $(element);
              
              const titleSelectors = [
                sourceConfig.selectors.title,
                'h1 a', 'h2 a', 'h3 a', 'h4 a', 'h5 a',
                '.title a', '.headline a', '.story-title a',
                'a[href*="/news/"]', 'a[href*="/story/"]',
                'a[href*="/stocks/"]', 'a[href*="/companies/"]'
              ];

              let title = '';
              let link = '';

              for (const titleSelector of titleSelectors) {
                const titleElement = $element.find(titleSelector).first();
                if (titleElement.length > 0) {
                  title = titleElement.text().trim();
                  link = titleElement.attr('href');
                  break;
                }
              }

              const timeSelectors = [
                sourceConfig.selectors.time,
                '.time', '.date', '.timestamp', '.ago',
                '[data-time]', '.publish-date', '.story-date',
                '.news-time', '.article-time'
              ];

              let timeText = '';
              for (const timeSelector of timeSelectors) {
                const timeElement = $element.find(timeSelector).first();
                if (timeElement.length > 0) {
                  timeText = timeElement.text().trim();
                  break;
                }
              }

              if (title && title.length > 10) {
                const titleLower = title.toLowerCase();
                const relevantStocks = [];
                
                portfolio.forEach(stock => {
                  const symbol = stock.symbol.toLowerCase();
                  const name = stock.name.toLowerCase();
                  
                  if (titleLower.includes(symbol) || 
                      titleLower.includes(symbol.replace(/ltd|limited/gi, '').trim())) {
                    relevantStocks.push(stock.symbol);
                  }
                  
                  const nameWords = name.split(' ');
                  const hasNameMatch = nameWords.some(word => 
                    word.length > 3 && titleLower.includes(word)
                  );
                  if (hasNameMatch && !relevantStocks.includes(stock.symbol)) {
                    relevantStocks.push(stock.symbol);
                  }
                });

                if (relevantStocks.length > 0) {
                  if (link && !link.startsWith('http')) {
                    const baseUrl = new URL(sourceConfig.url).origin;
                    link = link.startsWith('/') ? baseUrl + link : baseUrl + '/' + link;
                  }

                  articles.push({
                    title: cleanTitle(title),
                    url: link || sourceConfig.url,
                    source: sourceConfig.source,
                    timestamp: formatTimestamp(timeText) || getRelativeTime(new Date()),
                    relevantStocks: relevantStocks
                  });
                }
              }
            });
            break;
          }
        }

        return articles;
      } catch (error) {
        console.error(`Error scraping ${sourceConfig.source}:`, error);
        return [];
      }
    };

    const searchStockNews = async (stock) => {
      try {
        const searchQueries = [
          `${stock.symbol} stock news`,
          `${stock.name} share price`,
          `${stock.symbol} earnings`,
          `${stock.name} quarterly results`
        ];

        const stockNews = [];

        for (const query of searchQueries) {
          try {
            const searchUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' India stock market')}&hl=en-IN&gl=IN&ceid=IN:en`;
            
            const response = await fetch(searchUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
                'Accept': 'application/rss+xml, application/xml, text/xml'
              },
              timeout: 8000
            });

            if (response.ok) {
              const xmlText = await response.text();
              const $ = cheerio.load(xmlText, { xmlMode: true });
              
              $('item').each((i, element) => {
                if (i >= 5) return false; 
                
                const $item = $(element);
                const title = $item.find('title').text().trim();
                const link = $item.find('link').text().trim();
                const pubDate = $item.find('pubDate').text().trim();
                
                if (title && link) {
                  stockNews.push({
                    title: cleanTitle(title),
                    url: link,
                    source: 'Google News',
                    timestamp: formatTimestamp(pubDate) || 'Recent',
                    relevantStocks: [stock.symbol]
                  });
                }
              });
            }
          } catch (error) {
            console.error(`Error searching for ${stock.symbol}:`, error);
          }

          // Add delay between searches
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        return stockNews;
      } catch (error) {
        console.error(`Error in stock search for ${stock.symbol}:`, error);
        return [];
      }
    };

    // Scrape from multiple sources
    for (const source of scrapingSources) {
      try {
        const scrapedNews = await scrapeWebsiteForPortfolio(source);
        portfolioNews.push(...scrapedNews);
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to scrape ${source.source}:`, error);
      }
    }

    if (portfolioNews.length < 5) {
      for (const stock of portfolio.slice(0, 3)) { 
        try {
          const stockSpecificNews = await searchStockNews(stock);
          portfolioNews.push(...stockSpecificNews);
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error getting news for ${stock.symbol}:`, error);
        }
      }
    }

    const portfolioRSSFeeds = [
      'https://feeds.feedburner.com/NDTVPROFIT-Latest',
      'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms',
      'https://www.business-standard.com/rss/markets-106.rss'
    ];

    for (const feedUrl of portfolioRSSFeeds) {
      try {
        const response = await fetch(feedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml'
          },
          timeout: 8000
        });
        
        if (response.ok) {
          const xmlText = await response.text();
          const $ = cheerio.load(xmlText, { xmlMode: true });
          
          $('item').each((i, element) => {
            if (i >= 10) return false;
            
            const $item = $(element);
            const title = $item.find('title').text().trim();
            const link = $item.find('link').text().trim();
            const pubDate = $item.find('pubDate').text().trim();
            
            if (title && link) {
              const titleLower = title.toLowerCase();
              const relevantStocks = [];
              
              portfolio.forEach(stock => {
                const symbol = stock.symbol.toLowerCase();
                const name = stock.name.toLowerCase();
                
                if (titleLower.includes(symbol) || 
                    titleLower.includes(symbol.replace(/ltd|limited/gi, '').trim())) {
                  relevantStocks.push(stock.symbol);
                }
                
                const nameWords = name.split(' ');
                const hasNameMatch = nameWords.some(word => 
                  word.length > 3 && titleLower.includes(word)
                );
                if (hasNameMatch && !relevantStocks.includes(stock.symbol)) {
                  relevantStocks.push(stock.symbol);
                }
              });

              if (relevantStocks.length > 0) {
                portfolioNews.push({
                  title: cleanTitle(title),
                  url: link,
                  source: 'RSS Feed',
                  timestamp: formatTimestamp(pubDate) || 'Recent',
                  relevantStocks: relevantStocks
                });
              }
            }
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error parsing RSS feed:`, error);
      }
    }

    if (portfolioNews.length < 3) {
      portfolio.forEach(stock => {
        portfolioNews.push({
          title: `${stock.name} (${stock.symbol}): Monitor for latest market developments and quarterly results`,
          url: `https://www.moneycontrol.com/india/stockpricequote/${stock.symbol.toLowerCase()}`,
          source: 'Portfolio Alert',
          timestamp: 'Active monitoring',
          relevantStocks: [stock.symbol],
          isGenerated: true
        });
      });
    }

    const uniqueNews = portfolioNews
      .filter(item => item.title && item.title.length > 15)
      .filter((item, index, self) => 
        index === self.findIndex(t => 
          t.title.toLowerCase().trim() === item.title.toLowerCase().trim()
        )
      )
      .slice(0, 20); 

    res.status(200).json({ 
      portfolioNews: uniqueNews,
      totalFound: uniqueNews.length,
      portfolioStocks: portfolio.map(s => s.symbol)
    });
    
  } catch (error) {
    console.error('Error in portfolio news API:', error);
    
    const { portfolio } = req.body;
    const fallbackNews = portfolio ? portfolio.map(stock => ({
      title: `${stock.name} (${stock.symbol}): Latest market analysis and price movements to watch`,
      url: `https://www.moneycontrol.com/india/stockpricequote/${stock.symbol.toLowerCase()}`,
      source: 'Portfolio Monitor',
      timestamp: 'Active',
      relevantStocks: [stock.symbol],
      isGenerated: true
    })) : [];
    
    res.status(200).json({ 
      portfolioNews: fallbackNews,
      source: 'fallback',
      error: 'Portfolio news temporarily unavailable'
    });
  }
}

function cleanTitle(title) {
  return title
    .replace(/\s+/g, ' ')
    .replace(/[\r\n\t]/g, '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function formatTimestamp(timeText) {
  if (!timeText) return null;
  
  try {
    const cleanTime = timeText.toLowerCase().trim();
    
    if (cleanTime.includes('ago') || cleanTime.includes('hour') || cleanTime.includes('minute')) {
      return cleanTime;
    }
    
    if (cleanTime.includes('just') || cleanTime === 'now') {
      return 'Just now';
    }
    
    if (cleanTime.includes('ist') || cleanTime.includes('gmt')) {
      const dateMatch = cleanTime.match(/(\w{3}\s+\d{1,2},\s+\d{4})/);
      if (dateMatch) {
        const date = new Date(dateMatch[1]);
        return getRelativeTime(date);
      }
    }
    
    const date = new Date(timeText);
    if (!isNaN(date.getTime())) {
      return getRelativeTime(date);
    }
    
    return 'Recent';
  } catch (error) {
    return 'Recent';
  }
}

function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-IN');
}