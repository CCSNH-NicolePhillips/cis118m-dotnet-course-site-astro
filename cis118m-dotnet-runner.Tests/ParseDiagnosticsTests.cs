using Xunit;

public class ParseDiagnosticsTests
{
    [Fact]
    public void ExtractsLineColumnAndMessage()
    {
        var sample = "Program.cs(7,15): error CS1002: ; expected\nProgram.cs(12,5): warning CS0219: The variable 'x' is assigned but its value is never used";

        var results = RunnerUtilities.ParseDiagnostics(sample);

        Assert.Collection(results,
            first =>
            {
                Assert.Equal(7, first.Line);
                Assert.Equal(15, first.Column);
                Assert.Equal("; expected", first.Message);
            },
            second =>
            {
                Assert.Equal(12, second.Line);
                Assert.Equal(5, second.Column);
                Assert.Equal("The variable 'x' is assigned but its value is never used", second.Message);
            });
    }
}
