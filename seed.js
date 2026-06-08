// Starter question bank. Real product replaces/expands this (and adds a
// code-execution sandbox for the Developer role). MCQ is the honest v1.
const QUESTIONS = [
  // ── DEVELOPER ──
  { role: 'developer', difficulty: 1, prompt: `What does HTML stand for?`, options: [`HyperText Markup Language`, `HighText Machine Language`, `Hyperlink Text Mark Language`, `Home Tool Markup Language`], correct: 0 },
  { role: 'developer', difficulty: 1, prompt: `Which of these is NOT a primitive type in JavaScript?`, options: [`string`, `number`, `array`, `boolean`], correct: 2 },
  { role: 'developer', difficulty: 2, prompt: `What is the average time complexity of binary search?`, options: [`O(n)`, `O(log n)`, `O(n log n)`, `O(1)`], correct: 1 },
  { role: 'developer', difficulty: 2, prompt: `Which HTTP method is considered safe (no side effects)?`, options: [`POST`, `PATCH`, `GET`, `DELETE`], correct: 2 },
  { role: 'developer', difficulty: 2, prompt: `In CSS, what does "flex: 1" on a flex item do?`, options: [`Hides the item`, `Makes it grow to fill available space`, `Sets font size to 1em`, `Adds a 1px border`], correct: 1 },
  { role: 'developer', difficulty: 3, prompt: `A closure in JavaScript is best described as:`, options: [`A way to close a browser tab`, `A function bundled with its lexical scope`, `A CSS layout mode`, `A type of database lock`], correct: 1 },

  // ── DESIGNER ──
  { role: 'designer', difficulty: 1, prompt: `Which color model is used for digital screens?`, options: [`CMYK`, `RGB`, `Pantone`, `Print HSL`], correct: 1 },
  { role: 'designer', difficulty: 1, prompt: `A low-fidelity sketch of a screen's layout is called a:`, options: [`Wireframe`, `Render`, `Final mockup`, `Production build`], correct: 0 },
  { role: 'designer', difficulty: 2, prompt: `Whitespace (negative space) primarily improves:`, options: [`Wasted space`, `Visual clarity and focus`, `File size`, `SEO ranking`], correct: 1 },
  { role: 'designer', difficulty: 2, prompt: `Contrast ratio is most relevant to:`, options: [`Accessibility and readability`, `Animation speed`, `Database design`, `API latency`], correct: 0 },
  { role: 'designer', difficulty: 2, prompt: `A reusable set of components, tokens and rules is a:`, options: [`Design system`, `Single stylesheet`, `One mockup`, `Moodboard`], correct: 0 },
  { role: 'designer', difficulty: 3, prompt: `Hick's Law states that:`, options: [`More choices increase decision time`, `Red always converts best`, `Users read every word`, `Bigger fonts are always better`], correct: 0 },

  // ── DATA ANALYST ──
  { role: 'analyst', difficulty: 1, prompt: `Which measure is most robust to outliers?`, options: [`Mean`, `Median`, `Sum`, `Range`], correct: 1 },
  { role: 'analyst', difficulty: 1, prompt: `Which chart best shows one variable's distribution?`, options: [`Pie chart`, `Histogram`, `Line of best fit`, `Gantt chart`], correct: 1 },
  { role: 'analyst', difficulty: 2, prompt: `In SQL, which clause filters groups after aggregation?`, options: [`WHERE`, `HAVING`, `ORDER BY`, `LIMIT`], correct: 1 },
  { role: 'analyst', difficulty: 2, prompt: `"Correlation does not imply ___":`, options: [`Causation`, `Regression`, `Variance`, `Sampling`], correct: 0 },
  { role: 'analyst', difficulty: 2, prompt: `A low p-value (e.g. < 0.05) generally suggests:`, options: [`The result is likely not just chance`, `The data is wrong`, `A larger sample is required`, `Nothing at all`], correct: 0 },
  { role: 'analyst', difficulty: 3, prompt: `Normalizing data typically means:`, options: [`Deleting outliers`, `Scaling values to a common range`, `Doubling the dataset`, `Encrypting columns`], correct: 1 },

  // ── PRODUCT MANAGER ──
  { role: 'pm', difficulty: 1, prompt: `What does MVP stand for?`, options: [`Most Valuable Player`, `Minimum Viable Product`, `Maximum Value Plan`, `Multi-Variable Product`], correct: 1 },
  { role: 'pm', difficulty: 1, prompt: `A good user story follows the format:`, options: [`"As a <user>, I want <goal>, so that <reason>"`, `"Build <feature> by <date>"`, `"Fix <bug> now"`, `"Ship it fast"`], correct: 0 },
  { role: 'pm', difficulty: 2, prompt: `In RICE prioritization, the "E" stands for:`, options: [`Engagement`, `Effort`, `Earnings`, `Experience`], correct: 1 },
  { role: 'pm', difficulty: 2, prompt: `DAU/MAU is a common measure of:`, options: [`Revenue`, `Stickiness / engagement`, `Server load`, `Code quality`], correct: 1 },
  { role: 'pm', difficulty: 2, prompt: `The main purpose of an A/B test is to:`, options: [`Compare two variants to see which performs better`, `Back up the database`, `Write documentation`, `Hire engineers`], correct: 0 },
  { role: 'pm', difficulty: 3, prompt: `A product roadmap primarily communicates:`, options: [`Exact code`, `Direction and priorities over time`, `Server config`, `Salaries`], correct: 1 },

  // ── QA ENGINEER ──
  { role: 'qa', difficulty: 1, prompt: `A regression test is run to:`, options: [`Catch newly introduced breakages`, `Design the UI`, `Deploy to production`, `Write requirements`], correct: 0 },
  { role: 'qa', difficulty: 1, prompt: `A test case typically includes:`, options: [`Steps, input and expected result`, `Only a title`, `Just a screenshot`, `Source code only`], correct: 0 },
  { role: 'qa', difficulty: 2, prompt: `Black-box testing focuses on:`, options: [`Internal code structure`, `Inputs and expected outputs`, `Database indexes`, `Git history`], correct: 1 },
  { role: 'qa', difficulty: 2, prompt: `Validation answers the question:`, options: [`"Are we building it right?"`, `"Are we building the right thing?"`, `"Is the server up?"`, `"Is the font correct?"`], correct: 1 },
  { role: 'qa', difficulty: 2, prompt: `Severity (vs priority) measures:`, options: [`Business urgency`, `Technical impact of a defect`, `Cost`, `Team size`], correct: 1 },
  { role: 'qa', difficulty: 3, prompt: `Continuous Integration (CI) helps QA by:`, options: [`Running tests automatically on each change`, `Replacing all manual testing`, `Designing logos`, `Managing payroll`], correct: 0 },

  // ── ENTREPRENEUR ──
  { role: 'entrepreneur', difficulty: 1, prompt: `Product-market fit means:`, options: [`You have a logo`, `The market strongly wants your product`, `You raised money`, `You hired a team`], correct: 1 },
  { role: 'entrepreneur', difficulty: 1, prompt: `CAC stands for:`, options: [`Customer Acquisition Cost`, `Common Average Cost`, `Capital Asset Class`, `Customer Account Credit`], correct: 0 },
  { role: 'entrepreneur', difficulty: 2, prompt: `"Runway" refers to:`, options: [`Office space`, `How long cash lasts at the current burn rate`, `A marketing channel`, `A type of pitch`], correct: 1 },
  { role: 'entrepreneur', difficulty: 2, prompt: `A pivot is:`, options: [`A change in strategy or direction`, `A funding round`, `A co-founder`, `A legal document`], correct: 0 },
  { role: 'entrepreneur', difficulty: 2, prompt: `A value proposition explains:`, options: [`Your office location`, `Why a customer should choose you`, `Your tech stack`, `Your org chart`], correct: 1 },
  { role: 'entrepreneur', difficulty: 3, prompt: `The main point of an MVP is to:`, options: [`Look perfect`, `Validate key assumptions cheaply`, `Maximize features`, `Avoid customers`], correct: 1 }
];

async function seedQuestions(pool) {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM questions');
    if (rows[0].c > 0) return;
    for (const q of QUESTIONS) {
      await pool.query(
        'INSERT INTO questions (role, difficulty, prompt, options, correct_index) VALUES ($1,$2,$3,$4,$5)',
        [q.role, q.difficulty, q.prompt, JSON.stringify(q.options), q.correct]
      );
    }
    console.log(`✅ Seeded ${QUESTIONS.length} questions`);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  }
}

module.exports = { QUESTIONS, seedQuestions };
