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
}
