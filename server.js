const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  const tokenSet = !!(process.env.GITHUB_TOKEN);
  console.log(`repovision running at http://localhost:${PORT}`);
  console.log(`GitHub API auth: ${tokenSet ? '✓ token configured (5000 req/hr)' : '✗ no token (60 req/hr) — set GITHUB_TOKEN env var for higher limits'}`);
});
