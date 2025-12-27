# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY cis118m-dotnet-runner.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage - Use SDK image instead of runtime-only to support compiling user code
FROM mcr.microsoft.com/dotnet/sdk:8.0
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8787
EXPOSE 8787
ENTRYPOINT ["dotnet", "cis118m-dotnet-runner.dll"]
