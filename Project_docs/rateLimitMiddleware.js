// ============================================================
// PRIMARY: Redis rate limit check, runs before the DB insert.
// Atomic INCR means no race condition — two simultaneous requests
// cannot both "pass" the same count, unlike a SELECT COUNT(*) check.
// ============================================================

const DAILY_INTEREST_LIMIT = 10;
const WINDOW_SECONDS = 24 * 60 * 60; // rolling 24h from first request

async function checkInterestRateLimit(redisClient, userId) {
  const key = `ratelimit:interest:${userId}`;

  // INCR is atomic — this is the whole point. No read-then-write gap.
  const count = await redisClient.incr(key);

  if (count === 1) {
    // first request in this window — start the 24h countdown
    await redisClient.expire(key, WINDOW_SECONDS);
  }

  if (count > DAILY_INTEREST_LIMIT) {
    const err = new Error(
      `Daily interest limit reached (${DAILY_INTEREST_LIMIT}/day). Try again later.`
    );
    err.statusCode = 429;
    throw err;
  }
}

// Express middleware wrapper
function interestRateLimitMiddleware(redisClient) {
  return async (req, res, next) => {
    try {
      const userId = req.user.id; // set by your auth middleware upstream
      await checkInterestRateLimit(redisClient, userId);
      next();
    } catch (err) {
      if (err.statusCode === 429) {
        return res.status(429).json({ error: err.message });
      }
      // Redis unreachable or other failure — decide fail-open vs fail-closed.
      // Fail-closed (block the request) is safer for abuse prevention;
      // fail-open is safer for user experience if Redis has an outage.
      // Recommendation: fail-closed for this endpoint — a blocked "interest"
      // click is low-cost to the user, an abuse spike is not low-cost to you.
      console.error('Rate limit check failed:', err);
      return res.status(503).json({ error: 'Service temporarily unavailable' });
    }
  };
}

// Usage in route:
// router.post('/rooms/:roomId/interest', authMiddleware, interestRateLimitMiddleware(redisClient), createInterestHandler);

module.exports = { checkInterestRateLimit, interestRateLimitMiddleware };
