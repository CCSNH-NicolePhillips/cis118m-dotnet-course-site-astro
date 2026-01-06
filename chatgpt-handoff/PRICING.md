# API Pricing & Token Configuration

## Gemini 2.0 Flash Pricing (January 2026)

| Metric | Price |
|--------|-------|
| Input tokens | $0.10 per 1 million tokens |
| Output tokens | $0.40 per 1 million tokens |
| Context window | 1 million tokens |

**Note:** This is one of the most cost-effective AI models available, ideal for educational use.

---

## Our Token Limits

### AI Grading (`ai-grade.mjs`)
```javascript
generationConfig: {
  responseMimeType: "application/json",
  maxOutputTokens: 250,  // ~$0.0001 per request
}
```

### AI Tutor (`ai-tutor.mjs`)
```javascript
generationConfig: {
  maxOutputTokens: 300,  // ~$0.00012 per request
}
```

---

## Estimated Monthly Costs

### Assumptions:
- 30 students
- 16 weeks of course
- Average 5 homework submissions per week
- Average 10 AI tutor chats per week

### Calculations:

**AI Grading:**
- Submissions/month: 30 students × 5 submissions × 4 weeks = 600 requests
- Cost: 600 × $0.0001 = **$0.06/month**

**AI Tutor:**
- Chats/month: 30 students × 10 chats × 4 weeks = 1,200 requests
- Cost: 1,200 × $0.00012 = **$0.14/month**

**Total estimated cost: ~$0.20/month** 🎉

---

## Other Service Costs

### Upstash Redis
- **Free tier:** 10,000 requests/day (enough for most courses)
- **Pay-as-you-go:** $0.20 per 100,000 requests after free tier

### Render.com (Code Runner)
- **Free tier:** Available with cold starts (~30 seconds)
- **Starter tier:** $7/month for always-on

### Netlify
- **Free tier:** 100GB bandwidth, 300 build minutes/month
- **Pro:** $19/month if needed

---

## Cost Optimization Tips

1. **Keep output tokens low** - We use 250-300 max, which keeps responses brief and cheap
2. **Use Flash model** - Gemini 2.0 Flash is 10x cheaper than Pro
3. **Cache common responses** - Could add Redis caching for repeated questions
4. **Rate limit students** - Could add per-user limits if costs increase

---

## Environment Variables Needed

```env
# Gemini (Google AI)
GEMINI_API_KEY=your-api-key

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Auth0
AUTH0_DOMAIN=dev-xxx.us.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_AUDIENCE=https://your-api-identifier

# Code Runner (optional - for running .NET code)
RUNNER_URL=https://your-runner.onrender.com
```

---

## Known Pricing Issues We Encountered

1. **No issues!** - Gemini 2.0 Flash is incredibly affordable for educational use
2. **Auth0 free tier** - 7,000 active users/month (plenty for a course)
3. **Upstash free tier** - Usually sufficient unless heavy usage

---

## Monitoring Costs

- **Google Cloud Console** → APIs & Services → Generative Language API → See usage
- **Upstash Dashboard** → See request counts
- **Netlify Dashboard** → See function invocations and bandwidth
