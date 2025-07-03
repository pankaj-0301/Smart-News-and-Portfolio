# Smart News + Portfolio Insights

A modern web dashboard for Indian stock market news, portfolio tracking, and AI-powered insights.

## 🚀 Features
- **General News:** Automatically curates the latest Indian stock market headlines (Moneycontrol, Economic Times, etc.).
- **Portfolio Linking:** Add your stock holdings manually (mock portfolio) or integrate with broker APIs (if available).
- **Filtered News:** See news relevant to your portfolio stocks.
- **AI Analysis:** Uses Gemini API (Google AI) to analyze news and summarize the impact on your portfolio (Positive, Neutral, Negative).
- **UI:** Responsive, user-friendly dashboard built with Next.js and Tailwind CSS.

## 🛠️ Tech Stack
- [Next.js](https://nextjs.org/) (React framework)
- [Tailwind CSS](https://tailwindcss.com/) (styling)
- Gemini API (Google AI, via API key)
- News scraping/APIs for Indian markets

## ⚡ Getting Started

1. **Clone the repo:**
   ```bash
   git clone <your-repo-url>
   cd project
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up your Gemini API key:**
   - Create a `.env.local` file in the project root:
     ```env
     GEMINI_API_KEY=your_gemini_api_key_here
     ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Usage
- **General News:** View the latest market headlines.
- **Add Portfolio:** Enter your stocks (symbol, name, quantity) to simulate a portfolio.
- **Portfolio News:** See news filtered for your holdings.
- **AI Analysis:** Click "AI Analysis" to get sentiment and impact summary for your portfolio.

