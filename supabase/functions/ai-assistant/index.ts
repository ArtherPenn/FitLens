import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExpenseContext {
  totalExpenses: number;
  monthlyTotal: number;
  topCategory: string;
  categoryBreakdown: Record<string, number>;
  recentExpenses: Array<{
    date: string;
    amount: number;
    category: string;
    description: string;
  }>;
  anomalies: number;
  avgDaily: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { question, context } = await req.json();

    if (!question) {
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const expenseContext: ExpenseContext = JSON.parse(context || "{}");

    const response = generateInsightResponse(question, expenseContext);

    return new Response(
      JSON.stringify({ response }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        response: "I apologize, but I encountered an error processing your question. Please try again."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateInsightResponse(question: string, context: ExpenseContext): string {
  const q = question.toLowerCase();

  if (q.includes("increase") || q.includes("went up") || q.includes("higher") || q.includes("more")) {
    if (context.topCategory) {
      return `Your expenses increased primarily due to ${context.topCategory} spending, which accounts for the largest portion of your budget at ₹${context.categoryBreakdown[context.topCategory]?.toFixed(2) || 0}. ${context.anomalies > 0 ? `I also detected ${context.anomalies} unusual transaction(s) that were significantly above your normal spending pattern.` : ""} Consider reviewing your ${context.topCategory} expenses to identify areas where you can cut back.`;
    }
    return `Your expenses have increased this month. ${context.anomalies > 0 ? `I detected ${context.anomalies} unusual transaction(s) that were significantly higher than normal.` : ""} I recommend reviewing your spending patterns by category to identify the main drivers.`;
  }

  if (q.includes("decrease") || q.includes("went down") || q.includes("lower") || q.includes("less") || q.includes("save")) {
    return `Great job! Your expenses decreased this month. Your daily average is ₹${context.avgDaily?.toFixed(2) || 0}. To continue this trend, focus on maintaining consistent spending in your top categories and avoid impulse purchases.`;
  }

  if (q.includes("most") || q.includes("spend") || q.includes("where")) {
    const categories = Object.entries(context.categoryBreakdown || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (categories.length > 0) {
      const breakdown = categories.map(([cat, amt]) => `${cat} (₹${amt.toFixed(2)})`).join(", ");
      return `Your top spending categories are: ${breakdown}. Your ${categories[0][0]} expenses are the highest at ₹${categories[0][1].toFixed(2)}, which represents ${((categories[0][1] / context.monthlyTotal) * 100).toFixed(1)}% of your total monthly spending.`;
    }
    return "You haven't recorded enough expenses yet for me to provide a detailed breakdown. Add more expenses to get personalized insights.";
  }

  if (q.includes("budget") || q.includes("target")) {
    return `Based on your current spending of ₹${context.monthlyTotal?.toFixed(2) || 0} this month with a daily average of ₹${context.avgDaily?.toFixed(2) || 0}, I recommend setting a monthly budget 10-15% lower than your current spending. Start by targeting the top spending categories like ${context.topCategory || "your main expense areas"}.`;
  }

  if (q.includes("anomaly") || q.includes("unusual") || q.includes("abnormal")) {
    if (context.anomalies > 0) {
      return `I detected ${context.anomalies} unusual transaction(s) that were significantly higher than your normal spending pattern. These are highlighted in your dashboard. Review these to ensure they're legitimate expenses and consider if they were one-time occurrences or indicate a new spending trend.`;
    }
    return "I haven't detected any unusual spending patterns in your recent transactions. Your expenses are consistent with your normal spending behavior.";
  }

  if (q.includes("forecast") || q.includes("predict") || q.includes("future") || q.includes("next month")) {
    const projectedMonthly = context.avgDaily * 30;
    return `Based on your current daily average of ₹${context.avgDaily?.toFixed(2) || 0}, I project your monthly expenses will be around ₹${projectedMonthly.toFixed(2)}. ${context.topCategory ? `Keep an eye on ${context.topCategory} expenses as they're your largest category.` : ""} Check the Forecasts tab for detailed 6-month projections by category.`;
  }

  if (q.includes("tip") || q.includes("advice") || q.includes("suggestion") || q.includes("help")) {
    return `Here are some personalized tips: 1) Track every expense consistently for accurate insights. 2) Set category-specific budgets for your top spending areas${context.topCategory ? ` like ${context.topCategory}` : ""}. 3) Review your spending weekly to catch issues early. 4) Look for patterns in your anomalies to identify impulse purchases. 5) Use the export feature to analyze trends over longer periods.`;
  }

  if (q.includes("category") || q.includes("categories")) {
    const catCount = Object.keys(context.categoryBreakdown || {}).length;
    return `You're currently tracking ${catCount} expense categories. ${context.topCategory ? `${context.topCategory} is your largest category at ₹${context.categoryBreakdown[context.topCategory]?.toFixed(2) || 0}.` : ""} Having well-organized categories helps you understand your spending patterns better.`;
  }

  if (q.includes("total") || q.includes("sum") || q.includes("all")) {
    return `Your total expenses for this month are ₹${context.monthlyTotal?.toFixed(2) || 0}, with a daily average of ₹${context.avgDaily?.toFixed(2) || 0}. You've recorded ${context.totalExpenses || 0} transactions so far.`;
  }

  if (q.includes("compare") || q.includes("comparison") || q.includes("versus") || q.includes("vs")) {
    return `Check the Analytics tab for detailed month-over-month comparisons. I can show you spending trends, category changes, and identify which areas increased or decreased compared to previous months.`;
  }

  if (q.includes("recent") || q.includes("last") || q.includes("latest")) {
    if (context.recentExpenses && context.recentExpenses.length > 0) {
      const recent = context.recentExpenses.slice(0, 3);
      const list = recent.map(e => `₹${e.amount} on ${e.category} (${e.date})`).join(", ");
      return `Your most recent expenses are: ${list}. You can view all transactions in the Expenses tab.`;
    }
    return "You haven't recorded any expenses yet. Start by adding your first expense to get personalized insights.";
  }

  return `I'm your AI expense assistant. I can help you understand your spending patterns, identify anomalies, forecast future expenses, and provide budgeting advice. Try asking questions like "Why did my expenses increase this month?" or "What am I spending the most on?" or "How can I save money?"`;
}
