export type StarterFile = {
  name: string;
  content: string;
};

export type Starter = {
  id: string;
  week: string;
  slug: "lesson-1" | "lesson-2" | "extra-practice" | "overview";
  title: string;
  language: "csharp";
  files: StarterFile[];
};

// Helper to get primary source (first file) for backward compatibility
export const getStarterSource = (starter: Starter): string => 
  starter.files[0]?.content ?? "";

// Helper to create single-file starter
const singleFile = (content: string): StarterFile[] => [
  { name: "Program.cs", content }
];

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

// Multi-file starters for weeks introducing classes
const multiFileStarters: Record<string, StarterFile[]> = {
  "08": [
    { name: "Program.cs", content: `// Week 8: Introduction to Classes
using System;

class Program
{
    static void Main()
    {
        // Create a Pet object and use it
        Pet myPet = new Pet();
        myPet.Name = "Max";
        myPet.Species = "Dog";
        myPet.Age = 3;
        
        myPet.Introduce();
        myPet.Speak();
    }
}
` },
    { name: "Pet.cs", content: `// Pet class definition
public class Pet
{
    // Properties
    public string Name { get; set; } = "";
    public string Species { get; set; } = "";
    public int Age { get; set; }
    
    // Methods
    public void Introduce()
    {
        Console.WriteLine($"This is {Name}, a {Age}-year-old {Species}.");
    }
    
    public void Speak()
    {
        Console.WriteLine($"{Name} says hello!");
    }
}
` }
  ],
  "09": [
    { name: "Program.cs", content: `// Week 9: Constructors and Methods
using System;

class Program
{
    static void Main()
    {
        // Use the constructor to create objects
        BankAccount checking = new BankAccount("Checking", 500.00m);
        BankAccount savings = new BankAccount("Savings", 1000.00m);
        
        checking.Deposit(100);
        checking.Withdraw(50);
        checking.PrintBalance();
        
        savings.PrintBalance();
    }
}
` },
    { name: "BankAccount.cs", content: `// BankAccount class with constructor
public class BankAccount
{
    public string AccountName { get; private set; }
    public decimal Balance { get; private set; }
    
    // Constructor
    public BankAccount(string name, decimal initialBalance)
    {
        AccountName = name;
        Balance = initialBalance;
    }
    
    public void Deposit(decimal amount)
    {
        if (amount > 0)
        {
            Balance += amount;
            Console.WriteLine($"Deposited {amount:C} to {AccountName}");
        }
    }
    
    public void Withdraw(decimal amount)
    {
        if (amount > 0 && amount <= Balance)
        {
            Balance -= amount;
            Console.WriteLine($"Withdrew {amount:C} from {AccountName}");
        }
        else
        {
            Console.WriteLine("Insufficient funds!");
        }
    }
    
    public void PrintBalance()
    {
        Console.WriteLine($"{AccountName} Balance: {Balance:C}");
    }
}
` }
  ],
  "10": [
    { name: "Program.cs", content: `// Week 10: Inheritance
using System;

class Program
{
    static void Main()
    {
        Dog myDog = new Dog("Buddy", 5);
        Cat myCat = new Cat("Whiskers", 3);
        
        myDog.Introduce();
        myDog.Speak();  // Overridden method
        myDog.Fetch();  // Dog-specific method
        
        Console.WriteLine();
        
        myCat.Introduce();
        myCat.Speak();  // Overridden method
        myCat.Purr();   // Cat-specific method
    }
}
` },
    { name: "Animal.cs", content: `// Base class
public class Animal
{
    public string Name { get; set; }
    public int Age { get; set; }
    
    public Animal(string name, int age)
    {
        Name = name;
        Age = age;
    }
    
    public void Introduce()
    {
        Console.WriteLine($"This is {Name}, age {Age}.");
    }
    
    // Virtual method - can be overridden
    public virtual void Speak()
    {
        Console.WriteLine($"{Name} makes a sound.");
    }
}
` },
    { name: "Dog.cs", content: `// Dog inherits from Animal
public class Dog : Animal
{
    public Dog(string name, int age) : base(name, age)
    {
    }
    
    // Override the Speak method
    public override void Speak()
    {
        Console.WriteLine($"{Name} barks: Woof woof!");
    }
    
    // Dog-specific method
    public void Fetch()
    {
        Console.WriteLine($"{Name} fetches the ball!");
    }
}
` },
    { name: "Cat.cs", content: `// Cat inherits from Animal
public class Cat : Animal
{
    public Cat(string name, int age) : base(name, age)
    {
    }
    
    // Override the Speak method
    public override void Speak()
    {
        Console.WriteLine($"{Name} meows: Meow!");
    }
    
    // Cat-specific method
    public void Purr()
    {
        Console.WriteLine($"{Name} purrs contentedly.");
    }
}
` }
  ],
};

const starterSlugs: Starter["slug"][] = ["lesson-1", "lesson-2", "extra-practice"];

export const buildStarterId = (week: string, slug: Starter["slug"]) => `week-${week}-${slug}`;

const buildStarter = (week: string, slug: Starter["slug"], files: StarterFile[]): Starter => ({
  id: buildStarterId(week, slug),
  week,
  slug,
  title: `Week ${Number(week)} • ${slug.replace("-", " ")}`,
  language: "csharp",
  files,
});

const makeWeekStarters = (week: string, files: StarterFile[]) =>
  starterSlugs.map((slug) => buildStarter(week, slug, files));

const starterList: Starter[] = [];

for (let w = 1; w <= 16; w += 1) {
  const week = String(w).padStart(2, "0");
  // Use multi-file starter if available, otherwise single file
  const files = multiFileStarters[week] ?? singleFile(baseStarters[week] ?? placeholderSource(week));
  starterList.push(...makeWeekStarters(week, files));
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
