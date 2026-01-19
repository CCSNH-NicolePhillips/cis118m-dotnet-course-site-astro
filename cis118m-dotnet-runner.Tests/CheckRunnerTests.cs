using Xunit;

public class CheckRunnerTests
{
    [Fact]
    public void Week01Lesson1_AllChecksFail_WhenProgramIsEmpty()
    {
        var programCs = "// Empty program";

        var results = CheckRunner.RunChecks("week-01-lesson-1", programCs);

        Assert.Equal(3, results.Count);
        Assert.All(results, check => Assert.False(check.Passed));
    }

    [Fact]
    public void Week01Lesson1_HasConsoleWriteLine_PassesWhenPresent()
    {
        var programCs = @"
using System;
class Program
{
    static void Main()
    {
        Console.WriteLine(""Hello"");
    }
}";

        var results = CheckRunner.RunChecks("week-01-lesson-1", programCs);

        var writeLineCheck = results.First(c => c.Name == "HasConsoleWriteLine");
        Assert.True(writeLineCheck.Passed);
    }

    [Fact]
    public void Week01Lesson1_HasTwoWriteLines_PassesWhenTwoOrMorePresent()
    {
        var programCs = @"
using System;
class Program
{
    static void Main()
    {
        Console.WriteLine(""Hello"");
        Console.WriteLine(""World"");
    }
}";

        var results = CheckRunner.RunChecks("week-01-lesson-1", programCs);

        var twoWriteLinesCheck = results.First(c => c.Name == "HasTwoWriteLines");
        Assert.True(twoWriteLinesCheck.Passed);
    }

    [Fact]
    public void Week01Lesson1_HasTwoWriteLines_FailsWhenOnlyOne()
    {
        var programCs = @"
using System;
class Program
{
    static void Main()
    {
        Console.WriteLine(""Hello"");
    }
}";

        var results = CheckRunner.RunChecks("week-01-lesson-1", programCs);

        var twoWriteLinesCheck = results.First(c => c.Name == "HasTwoWriteLines");
        Assert.False(twoWriteLinesCheck.Passed);
    }

    [Fact]
    public void Week01Lesson1_HasStringLiteral_PassesWhenQuotedStringPresent()
    {
        var programCs = @"
using System;
class Program
{
    static void Main()
    {
        Console.WriteLine(""Hello, World!"");
    }
}";

        var results = CheckRunner.RunChecks("week-01-lesson-1", programCs);

        var stringLiteralCheck = results.First(c => c.Name == "HasStringLiteral");
        Assert.True(stringLiteralCheck.Passed);
    }

    [Fact]
    public void Week01Lesson1_AllChecksPass_WhenProgramIsComplete()
    {
        var programCs = @"
using System;
class Program
{
    static void Main()
    {
        Console.WriteLine(""Hello, C#!"");
        Console.WriteLine(""This is my first program."");
    }
}";

        var results = CheckRunner.RunChecks("week-01-lesson-1", programCs);

        Assert.Equal(3, results.Count);
        Assert.All(results, check => Assert.True(check.Passed, $"Check {check.Name} failed: {check.Message}"));
    }

    [Fact]
    public void GetHint_ReturnsAppropriateHint_ForFirstFailedCheck()
    {
        var checks = new List<CheckResult>
        {
            new("HasConsoleWriteLine", true, ""),
            new("HasTwoWriteLines", false, "Need 2"),
            new("HasStringLiteral", false, "Need quotes")
        };

        var hint = CheckRunner.GetHint("week-01-lesson-1", checks);

        Assert.Contains("second", hint, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void UnknownStarterId_ReturnsEmptyChecksList()
    {
        var results = CheckRunner.RunChecks("unknown-starter", "any code");

        Assert.Empty(results);
    }

    // ============================================================
    // Week 01 Lab 1 Tests
    // ============================================================

    [Fact]
    public void Week01Lab1_StarterCode_ShouldFailAllChecks()
    {
        // This is the exact starter code students get
        var starterCode = @"// Lab 1: Welcome Program
// Name: Your Name Here

using System;

class Program
{
    static void Main()
    {
        // Print 4 lines about yourself
        // Line 1: Your name
        // Line 2: The course (CIS 118M)
        // Line 3: Your goal for this course
        // Line 4: A fun fact about yourself
        
        Console.WriteLine(""My name is ..."");
        
    }
}";

        var results = CheckRunner.RunChecks("week-01-lab-1", starterCode);

        Assert.Equal(4, results.Count);
        
        // Header comment should FAIL - "Your Name Here" is placeholder
        var headerCheck = results.First(c => c.Name == "HasHeaderComment");
        Assert.False(headerCheck.Passed, "Header check should fail for placeholder 'Your Name Here'");
        
        // Has Console.WriteLine should PASS (there is one)
        var writeLineCheck = results.First(c => c.Name == "HasConsoleWriteLine");
        Assert.True(writeLineCheck.Passed, "Should find the one Console.WriteLine");
        
        // Four WriteLines should FAIL (only 1)
        var fourCheck = results.First(c => c.Name == "HasFourWriteLines");
        Assert.False(fourCheck.Passed, "Should fail with only 1 Console.WriteLine");
        
        // Custom content should FAIL (still has placeholder)
        var customCheck = results.First(c => c.Name == "HasCustomContent");
        Assert.False(customCheck.Passed, "Should fail because it still has 'My name is ...'");
    }

    [Fact]
    public void Week01Lab1_HeaderComment_FailsForPlaceholder()
    {
        var code = @"// Lab 1: Welcome Program
// Name: Your Name Here

using System;
class Program { static void Main() { } }";

        var results = CheckRunner.RunChecks("week-01-lab-1", code);
        var headerCheck = results.First(c => c.Name == "HasHeaderComment");
        
        Assert.False(headerCheck.Passed, "'Your Name Here' should be detected as placeholder");
    }

    [Fact]
    public void Week01Lab1_HeaderComment_PassesForRealName()
    {
        var code = @"// Lab 1: Welcome Program
// Name: John Smith

using System;
class Program { static void Main() { Console.WriteLine(""test""); } }";

        var results = CheckRunner.RunChecks("week-01-lab-1", code);
        var headerCheck = results.First(c => c.Name == "HasHeaderComment");
        
        Assert.True(headerCheck.Passed, "Real name 'John Smith' should pass");
    }

    [Fact]
    public void Week01Lab1_FourWriteLines_FailsWithOne()
    {
        var code = @"using System;
class Program { static void Main() { Console.WriteLine(""Hello""); } }";

        var results = CheckRunner.RunChecks("week-01-lab-1", code);
        var check = results.First(c => c.Name == "HasFourWriteLines");
        
        Assert.False(check.Passed, "Should fail with only 1 Console.WriteLine");
    }

    [Fact]
    public void Week01Lab1_FourWriteLines_PassesWithFour()
    {
        var code = @"// Name: Test Student
using System;
class Program { 
    static void Main() { 
        Console.WriteLine(""Line 1""); 
        Console.WriteLine(""Line 2""); 
        Console.WriteLine(""Line 3""); 
        Console.WriteLine(""Line 4""); 
    } 
}";

        var results = CheckRunner.RunChecks("week-01-lab-1", code);
        var check = results.First(c => c.Name == "HasFourWriteLines");
        
        Assert.True(check.Passed, "Should pass with 4 Console.WriteLine statements");
    }

    [Fact]
    public void Week01Lab1_CustomContent_FailsWithPlaceholder()
    {
        var code = @"// Name: Test Student
using System;
class Program { 
    static void Main() { 
        Console.WriteLine(""My name is ...""); 
    } 
}";

        var results = CheckRunner.RunChecks("week-01-lab-1", code);
        var check = results.First(c => c.Name == "HasCustomContent");
        
        Assert.False(check.Passed, "Should fail when placeholder 'My name is ...' is present");
    }

    [Fact]
    public void Week01Lab1_AllChecksPassing()
    {
        var completeCode = @"// Lab 1: Welcome Program
// Name: Jane Doe

using System;

class Program
{
    static void Main()
    {
        Console.WriteLine(""My name is Jane Doe"");
        Console.WriteLine(""This is CIS 118M"");
        Console.WriteLine(""I want to learn C#"");
        Console.WriteLine(""I love pizza"");
    }
}";

        var results = CheckRunner.RunChecks("week-01-lab-1", completeCode);

        Assert.Equal(4, results.Count);
        Assert.All(results, check => Assert.True(check.Passed, $"Check {check.Name} failed: {check.Message}"));
    }
}
