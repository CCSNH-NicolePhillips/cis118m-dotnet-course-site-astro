export type Starter = {
  id: string;
  week: string;
  slug: "lesson-1" | "lesson-2" | "extra-practice" | "overview";
  title: string;
  language: "csharp";
  source: string;
};

const placeholderSource = (week: string) => `// Week ${week} starter
// Content coming soon. Write a short console app to practice.
using System;

Console.WriteLine("Week ${week} practice stub.");
`;

const baseStarters: Record<string, string> = {
  "01": `// Week 1: Hello .NET
// Write and run your first console app.
using System;

Console.WriteLine("Hello, .NET!");
Console.WriteLine("This is my first C# program.");
`,
  "02": `// Week 2: Variables and interpolation
using System;

string name = "Sage";
int age = 19;
double gpa = 3.8;

Console.WriteLine($"Hello {name}! You are {age} years old.");
Console.WriteLine($"GPA: {gpa:F1}");
`,
  "03": `// Week 3: Input and TryParse
using System;

Console.Write("Enter a number: ");
string? input = Console.ReadLine();

if (double.TryParse(input, out double value))
{
    Console.WriteLine($"You entered: {value}");
}
else
{
    Console.WriteLine("That was not a valid number.");
}
`,
  "04": `// Week 4: if/else practice
using System;

Console.Write("Enter a score (0-100): ");
string? scoreText = Console.ReadLine();

if (int.TryParse(scoreText, out int score))
{
    if (score >= 90)
    {
        Console.WriteLine("Grade: A");
    }
    else if (score >= 80)
    {
        Console.WriteLine("Grade: B");
    }
    else if (score >= 70)
    {
        Console.WriteLine("Grade: C");
    }
    else
    {
        Console.WriteLine("Keep practicing and try again!");
    }
}
else
{
    Console.WriteLine("Please enter a whole number between 0 and 100.");
}
`,
};

const starterSlugs: Starter["slug"][] = ["lesson-1", "lesson-2", "extra-practice"];

export const buildStarterId = (week: string, slug: Starter["slug"]) => `week-${week}-${slug}`;

const buildStarter = (week: string, slug: Starter["slug"], source: string): Starter => ({
  id: buildStarterId(week, slug),
  week,
  slug,
  title: `Week ${Number(week)} • ${slug.replace("-", " ")}`,
  language: "csharp",
  source,
});

const makeWeekStarters = (week: string, source: string) =>
  starterSlugs.map((slug) => buildStarter(week, slug, source));

const starterList: Starter[] = [];

for (let w = 1; w <= 16; w += 1) {
  const week = String(w).padStart(2, "0");
  const source = baseStarters[week] ?? placeholderSource(week);
  starterList.push(...makeWeekStarters(week, source));
}

export const starters = starterList;

export const normalizeWeek = (week: string) => week.padStart(2, "0");

export const findStarterById = (id: string) => starters.find((s) => s.id === id);

export const findStarter = (week: string, slug: string) =>
  starters.find((s) => s.week === normalizeWeek(week) && s.slug === slug);

export const startersByWeek = (week: string) => {
  const normalized = normalizeWeek(week);
  return starters.filter((s) => s.week === normalized);
};

export const defaultStarterForWeek = (week: string) => {
  const list = startersByWeek(week);
  return list.find((s) => s.slug === "lesson-1") || list[0] || starters[0];
};
