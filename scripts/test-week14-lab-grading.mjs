// Test script for Week 14 Lab AI grading — Product Manager
// Run with: node scripts/test-week14-lab-grading.mjs

import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { getLessonContext } from "../netlify/functions/_lib/lesson-contexts.mjs";
import { getGradingPromptRules } from "../netlify/functions/_lib/ai-rules.mjs";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// === BAD SUBMISSION (~25-35 points) ===
// No private backing fields (uses auto-props), no validation, no constructor overloads,
// no this() chaining, no computed properties, List exists but foreach missing InStock/TotalValue
const BAD_SUBMISSION = `
// Lab 14
// Student: Test Bad

class Product {
    public string Name { get; set; }
    public double Price { get; set; }
    public int Stock { get; set; }

    public Product(string name, double price, int stock) {
        Name = name;
        Price = price;
        Stock = stock;
    }
}

List<Product> catalog = new List<Product>();
catalog.Add(new Product("Widget", 9.99, 50));
catalog.Add(new Product("Gadget", 24.99, 10));
catalog.Add(new Product("Doohickey", 4.50, 0));
catalog.Add(new Product("Thingamajig", 15.00, 5));

Console.WriteLine("Count: " + catalog.Count);
catalog.Remove(catalog[0]);
Console.WriteLine("After: " + catalog.Count);

foreach (Product p in catalog) {
    Console.WriteLine(p.Name + " " + p.Price);
}
`;

// === MID SUBMISSION (~65-75 points) ===
// Has private backing fields and some validation, but: Name doesn't trim, Price validation
// missing for constructor (only in property), no computed InStock/TotalValue properties,
// overloads duplicate validation instead of using this(), foreach missing TotalValue/InStock
const MID_SUBMISSION = `
// Lab 14 - Product Manager
// Student: Test Mid

using System.Collections.Generic;

class Product {
    private string _name;
    private double _price;
    private int _stock;

    public Product(string name, double price, int stock) {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name cannot be empty.");
        if (price < 0)
            throw new ArgumentException("Price cannot be negative.");
        if (stock < 0)
            throw new ArgumentException("Stock cannot be negative.");
        _name = name;
        _price = price;
        _stock = stock;
    }

    public Product(string name, double price) {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name cannot be empty.");
        if (price < 0)
            throw new ArgumentException("Price cannot be negative.");
        _name = name;
        _price = price;
        _stock = 0;
    }

    public Product(string name) {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name cannot be empty.");
        _name = name;
        _price = 0;
        _stock = 0;
    }

    public string Name {
        get { return _name; }
        set {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentException("Name cannot be empty.");
            _name = value;
        }
    }

    public double Price {
        get { return _price; }
        set {
            if (value < 0)
                throw new ArgumentException("Price cannot be negative.");
            _price = value;
        }
    }

    public int Stock {
        get { return _stock; }
        set {
            if (value < 0)
                throw new ArgumentException("Stock cannot be negative.");
            _stock = value;
        }
    }
}

List<Product> catalog = new List<Product>();
catalog.Add(new Product("Widget", 9.99, 50));
catalog.Add(new Product("Gadget", 24.99, 10));
catalog.Add(new Product("Doohickey", 4.50));
catalog.Add(new Product("Thingamajig"));

Console.WriteLine("Catalog count: " + catalog.Count);
catalog.Remove(catalog[0]);
Console.WriteLine("After removal: " + catalog.Count);

Console.WriteLine();
Console.WriteLine("=== PRODUCT CATALOG REPORT ===");
foreach (Product p in catalog) {
    Console.WriteLine($"Name: {p.Name} | Price: {p.Price:F2} | Stock: {p.Stock}");
}

try {
    Product bad = new Product("", -5.00, 0);
} catch (ArgumentException ex) {
    Console.WriteLine("Validation blocked: " + ex.Message);
}
`;

// === PERFECT SUBMISSION (95-100 points) ===
// Private fields, all three validated properties (Name trims), two computed properties,
// master constructor owns all validation, two overloads use : this(), List with 4+ products
// using different overloads, count before/after remove, foreach with all 5 properties, try/catch
const PERFECT_SUBMISSION = `
// Lab 14 - Product Manager
// Student: Test Perfect

using System.Collections.Generic;

class Product {
    private string _name;
    private double _price;
    private int _stock;

    public Product(string name, double price, int stock) {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name cannot be empty or whitespace.");
        if (price < 0)
            throw new ArgumentException("Price cannot be negative.");
        if (stock < 0)
            throw new ArgumentException("Stock cannot be negative.");
        _name = name.Trim();
        _price = price;
        _stock = stock;
    }

    public Product(string name, double price) : this(name, price, 0) { }

    public Product(string name) : this(name, 0.0, 0) { }

    public string Name {
        get { return _name; }
        set {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentException("Name cannot be empty or whitespace.");
            _name = value.Trim();
        }
    }

    public double Price {
        get { return _price; }
        set {
            if (value < 0)
                throw new ArgumentException("Price cannot be negative.");
            _price = value;
        }
    }

    public int Stock {
        get { return _stock; }
        set {
            if (value < 0)
                throw new ArgumentException("Stock cannot be negative.");
            _stock = value;
        }
    }

    public bool InStock { get { return _stock > 0; } }

    public double TotalValue { get { return _price * _stock; } }
}

// --- Part 1: Create products using different constructor overloads ---
Product p1 = new Product("Widget Pro", 9.99, 50);
Product p2 = new Product("Gadget", 24.99);
Product p3 = new Product("Placeholder");

// --- Part 2: Demonstrate validation rejection ---
try {
    Product bad = new Product("Test", -5.00, 0);
} catch (ArgumentException ex) {
    Console.WriteLine("Validation blocked: " + ex.Message);
}

// --- Part 3: Build a List<Product> catalog ---
List<Product> catalog = new List<Product>();
catalog.Add(new Product("Widget Pro", 9.99, 50));
catalog.Add(new Product("Gadget", 24.99, 10));
catalog.Add(new Product("Doohickey", 4.50));
catalog.Add(new Product("Placeholder"));

Console.WriteLine("Catalog count: " + catalog.Count);
catalog.Remove(catalog[1]);
Console.WriteLine("After removal: " + catalog.Count);

// --- Part 4: foreach report ---
Console.WriteLine();
Console.WriteLine("=== PRODUCT CATALOG REPORT ===");
foreach (Product p in catalog) {
    Console.WriteLine($"Name: {p.Name} | Price: {p.Price:F2} | Stock: {p.Stock} | InStock: {p.InStock} | TotalValue: {p.TotalValue:F2}");
}
`;

const testCases = [
  { name: "❌ BAD SUBMISSION (expect ~25-35)", content: BAD_SUBMISSION },
  { name: "😐 MID SUBMISSION (expect ~65-75)", content: MID_SUBMISSION },
  { name: "🌟 PERFECT SUBMISSION (expect 95-100)", content: PERFECT_SUBMISSION },
];

const assignmentId = "week-14-lab";

async function testLabGrading() {
  console.log('🔑 Checking GEMINI_API_KEY...');
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in .env');
    process.exit(1);
  }
  console.log('✅ API Key found\n');

  const context = getLessonContext(assignmentId);
  if (!context) {
    console.error(`❌ No context found for: ${assignmentId}`);
    console.error('   Make sure lessonContexts has a "week-14-lab" entry');
    process.exit(1);
  }
  console.log(`📚 Loaded context for: ${context.title}`);
  console.log(`📋 Rubric loaded: ${context.rubric.trim().substring(0, 80)}...`);
  console.log('');
  console.log('='.repeat(70));

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const geminiModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 1024,
    }
  });
  const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    if (i > 0) {
      console.log('\n⏳ Waiting 15s to avoid rate limits...');
      await sleep(15000);
    }
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📝 ${testCase.name}`);
    console.log(`${'='.repeat(70)}`);
    console.log(`Code preview: ${testCase.content.trim().substring(0, 100)}...`);
    console.log('');

    const prompt = `You are a friendly programming instructor grading a student's work.

${getGradingPromptRules()}

LESSON CONTEXT - What we taught:
${context.taughtConcepts}

ASSIGNMENT: ${context.assignmentPrompt}

STUDENT CODE:
\`\`\`csharp
${testCase.content}
\`\`\`

RUBRIC: ${context.rubric}
${context.requiredKeywords?.length ? `\nREQUIRED KEYWORDS (check if present): ${context.requiredKeywords.join(', ')}` : ''}

Grade the code and provide:
1. "score": total points (0-100)
2. "feedback": ONE sentence of praise + ONE short tip (shown to student)
3. "rubric": object with each rubric category from above, points awarded out of max, and brief rationale explaining WHY those points were given or deducted
4. "detailedReport": a 3-5 sentence instructor-facing summary explaining the overall grade, what the student did well, what they missed, and specific improvement areas

IMPORTANT: Use the EXACT rubric categories from the RUBRIC section above. Each rubric entry must include "points", "maxPoints", and "rationale".

Return JSON:
{
  "score": number,
  "feedback": "friendly 2-sentence feedback for student",
  "rubric": {
    "category-name": {"points": number, "maxPoints": number, "rationale": "specific reason for this score"}
  },
  "detailedReport": "3-5 sentence instructor-facing analysis of the submission"
}
`;

    try {
      let text;
      try {
        const result = await geminiModel.generateContent(prompt);
        text = result.response.text();
        console.log('   🤖 Graded by: Gemini');
      } catch (geminiErr) {
        const isRateLimit = geminiErr.message?.includes('429') || geminiErr.message?.includes('quota');
        if (!isRateLimit || !openai) throw geminiErr;
        console.log('   ⚠️  Gemini rate limited — falling back to OpenAI');
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1024,
          response_format: { type: "json_object" },
        });
        text = completion.choices[0].message.content;
        console.log('   🤖 Graded by: OpenAI (fallback)');
      }
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const data = JSON.parse(text.substring(jsonStart, jsonEnd));

      console.log(`   🎯 SCORE: ${data.score}/100`);
      console.log(`   💬 Feedback: ${data.feedback}`);
      console.log('');
      if (data.rubric) {
        console.log('   📋 Rubric Breakdown:');
        for (const [key, val] of Object.entries(data.rubric)) {
          const filled = Math.round((val.points / val.maxPoints) * 10);
          const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
          console.log(`      ${bar} ${key}: ${val.points}/${val.maxPoints} — ${val.rationale}`);
        }
      }
      if (data.detailedReport) {
        console.log('');
        console.log(`   📄 Instructor Report: ${data.detailedReport}`);
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('✅ All test cases completed!');
}

testLabGrading();

