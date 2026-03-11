#!/usr/bin/env bash
# ViraWorkx Security Test Suite
# Tests production load balancer (34.160.43.144) and Cloud Run API endpoint.
#
# LB IP:  34.160.43.144  (HTTP→HTTPS redirect + Cloud Armor WAF)
# API URL: https://viraworkx-api-668077541916.us-central1.run.app (direct app-level tests)

set -uo pipefail

LB_IP="34.160.43.144"
API_URL="https://viraworkx-api-668077541916.us-central1.run.app"
ADMIN_EMAIL="admin@viraworkx.ai"
ADMIN_PASSWORD='Ds1%2nWBCo@mHLHz'

PASS=0
FAIL=0
WARN=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass() {
  echo -e "  ${GREEN}[PASS]${NC} $1"
  PASS=$((PASS + 1))
}

fail() {
  echo -e "  ${RED}[FAIL]${NC} $1"
  FAIL=$((FAIL + 1))
}

warn() {
  echo -e "  ${YELLOW}[WARN]${NC} $1"
  WARN=$((WARN + 1))
}

section() {
  echo ""
  echo -e "${BLUE}======================================================${NC}"
  echo -e "${BLUE} $1${NC}"
  echo -e "${BLUE}======================================================${NC}"
}

http_status() {
  curl -s -o /dev/null -w "%{http_code}" "$@"
}

http_headers() {
  curl -s -D - -o /dev/null "$@"
}

echo ""
echo -e "${BLUE}##################################################${NC}"
echo -e "${BLUE}  ViraWorkx Security Test Suite${NC}"
echo -e "${BLUE}  LB IP:  ${LB_IP}${NC}"
echo -e "${BLUE}  API URL: ${API_URL}${NC}"
echo -e "${BLUE}  Date: $(date -u)${NC}"
echo -e "${BLUE}##################################################${NC}"

# ============================================================
section "1. HTTP → HTTPS Redirect"
# ============================================================

STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
  -H "Host: api.viraworkx.ai" "http://${LB_IP}/" 2>/dev/null || echo "000")
if [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
  pass "HTTP port 80 → redirect (${STATUS})"
else
  fail "HTTP port 80 did not redirect — got ${STATUS} (expected 301/302)"
fi

LOCATION=$(curl -s -D - -o /dev/null --max-time 10 \
  -H "Host: api.viraworkx.ai" "http://${LB_IP}/" 2>/dev/null \
  | grep -i "^location:" | tr -d '\r' || echo "")
if echo "$LOCATION" | grep -qi "https://"; then
  pass "Redirect location points to HTTPS: ${LOCATION}"
else
  warn "Could not verify redirect location: '${LOCATION}'"
fi

# ============================================================
section "2. Security Headers (via Cloud Run URL)"
# ============================================================

# Health endpoint is at /health (not /api/v1/health)
HEADERS=$(http_headers --max-time 15 "${API_URL}/health" 2>/dev/null)

if echo "$HEADERS" | grep -qi "x-content-type-options:.*nosniff"; then
  pass "X-Content-Type-Options: nosniff present"
else
  fail "X-Content-Type-Options: nosniff MISSING"
  echo "    Received: $(echo "$HEADERS" | grep -i 'x-content-type' || echo '(none)')"
fi

if echo "$HEADERS" | grep -qi "x-frame-options:"; then
  HDR=$(echo "$HEADERS" | grep -i 'x-frame-options' | tr -d '\r')
  pass "X-Frame-Options present: ${HDR}"
else
  fail "X-Frame-Options MISSING"
fi

if echo "$HEADERS" | grep -qi "strict-transport-security:"; then
  HDR=$(echo "$HEADERS" | grep -i 'strict-transport' | tr -d '\r')
  pass "Strict-Transport-Security present: ${HDR}"
else
  fail "Strict-Transport-Security (HSTS) MISSING"
fi

if echo "$HEADERS" | grep -qi "content-security-policy:"; then
  pass "Content-Security-Policy present"
elif echo "$HEADERS" | grep -qi "x-xss-protection:"; then
  pass "X-XSS-Protection present (CSP not set but fallback header found)"
else
  fail "Content-Security-Policy AND X-XSS-Protection both MISSING"
fi

# ============================================================
section "3. Authentication & Authorization"
# ============================================================

# 3a. Wrong password → 401
STATUS=$(http_status --max-time 15 -X POST "${API_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword123"}' 2>/dev/null)
if [ "$STATUS" = "401" ]; then
  pass "Wrong password → 401"
else
  fail "Wrong password → got ${STATUS} (expected 401)"
fi

# 3b. GET /candidates without token → 401
STATUS=$(http_status --max-time 15 "${API_URL}/api/v1/candidates" 2>/dev/null)
if [ "$STATUS" = "401" ]; then
  pass "GET /candidates without token → 401"
else
  fail "GET /candidates without token → got ${STATUS} (expected 401)"
fi

# 3c. Admin endpoint /users without token → 401
# Note: /api/v1/admin/users does not exist; the admin user route is /api/v1/users
STATUS=$(http_status --max-time 15 "${API_URL}/api/v1/users" 2>/dev/null)
if [ "$STATUS" = "401" ]; then
  pass "GET /users (admin) without token → 401"
else
  fail "GET /users (admin) without token → got ${STATUS} (expected 401)"
fi

# 3d. GET /assessments without token → 401
STATUS=$(http_status --max-time 15 "${API_URL}/api/v1/assessments" 2>/dev/null)
if [ "$STATUS" = "401" ]; then
  pass "GET /assessments without token → 401"
else
  fail "GET /assessments without token → got ${STATUS} (expected 401)"
fi

# Obtain admin token
echo "  [INFO] Obtaining admin token..."
ADMIN_RESPONSE=$(curl -s --max-time 15 -X POST "${API_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" 2>/dev/null)
ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -n "$ADMIN_TOKEN" ]; then
  echo "  [INFO] Admin token obtained (${#ADMIN_TOKEN} chars)"
else
  warn "Could not obtain admin token. Response: $(echo "$ADMIN_RESPONSE" | head -c 200)"
fi

# Register candidate test user
echo "  [INFO] Registering candidate test user..."
CAND_EMAIL="sectest_cand_$(date +%s)@mailnull.com"
CAND_REG=$(curl -s --max-time 15 -X POST "${API_URL}/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${CAND_EMAIL}\",\"password\":\"TestPass1!\",\"user_type\":\"candidate\",\"first_name\":\"Sec\",\"last_name\":\"Test\"}" 2>/dev/null)
CAND_TOKEN=$(echo "$CAND_REG" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -n "$CAND_TOKEN" ]; then
  echo "  [INFO] Candidate token obtained"
  # 3e. Candidate token → admin /users → 403
  STATUS=$(http_status --max-time 15 \
    -H "Authorization: Bearer ${CAND_TOKEN}" \
    "${API_URL}/api/v1/users" 2>/dev/null)
  if [ "$STATUS" = "403" ] || [ "$STATUS" = "401" ]; then
    pass "Candidate token cannot access admin /users → ${STATUS}"
  else
    fail "Candidate token accessed admin /users → got ${STATUS} (expected 403)"
  fi
else
  warn "Could not obtain candidate token — skipping candidate role isolation test. Response: $(echo "$CAND_REG" | head -c 200)"
fi

# Register client test user
echo "  [INFO] Registering client test user..."
CLIENT_EMAIL="sectest_client_$(date +%s)@mailnull.com"
CLIENT_REG=$(curl -s --max-time 15 -X POST "${API_URL}/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${CLIENT_EMAIL}\",\"password\":\"TestPass1!\",\"user_type\":\"client\",\"company_name\":\"SecTestCo\"}" 2>/dev/null)
CLIENT_TOKEN=$(echo "$CLIENT_REG" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -n "$CLIENT_TOKEN" ]; then
  echo "  [INFO] Client token obtained"
  # 3f. Client token → candidate-only /me/profile (which for a client returns their client profile, not a candidate profile)
  # More meaningful: client token → admin /users → 403
  STATUS=$(http_status --max-time 15 \
    -H "Authorization: Bearer ${CLIENT_TOKEN}" \
    "${API_URL}/api/v1/users" 2>/dev/null)
  if [ "$STATUS" = "403" ] || [ "$STATUS" = "401" ]; then
    pass "Client token cannot access admin /users → ${STATUS}"
  else
    fail "Client token accessed admin /users → got ${STATUS} (expected 403)"
  fi
  # 3g. Client accessing a candidate-specific list endpoint
  STATUS=$(http_status --max-time 15 \
    -H "Authorization: Bearer ${CLIENT_TOKEN}" \
    "${API_URL}/api/v1/candidates" 2>/dev/null)
  if [ "$STATUS" = "403" ] || [ "$STATUS" = "401" ]; then
    pass "Client token cannot list all candidates → ${STATUS}"
  else
    warn "Client token can list candidates → ${STATUS} (check if this is intentional for client portal)"
  fi
else
  warn "Could not obtain client token — skipping client role isolation test. Response: $(echo "$CLIENT_REG" | head -c 200)"
fi

# ============================================================
section "4. SQL Injection via Cloud Armor (LB IP)"
# ============================================================

SQL_PAYLOAD="1' OR '1'='1'; DROP TABLE users; --"
SQL_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote(\"${SQL_PAYLOAD}\"))" 2>/dev/null \
  || echo "1'+OR+'1'%3D'1'%3B+DROP+TABLE+users%3B+--")

STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
  -H "Host: api.viraworkx.ai" \
  "http://${LB_IP}/api/v1/jobs?search=${SQL_ENCODED}" 2>/dev/null || echo "000")

if [ "$STATUS" = "403" ]; then
  pass "SQL injection blocked by Cloud Armor → 403"
elif [ "$STATUS" = "000" ]; then
  warn "SQL injection test — connection failed (LB may not be reachable on HTTP or Cloud Armor blocking entirely)"
elif [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
  fail "SQL injection NOT blocked — LB redirected (${STATUS}) instead of blocking. Cloud Armor WAF rules may not be propagated yet."
  warn "Cloud Armor WAF rule propagation can take 5-10 minutes after configuration"
else
  fail "SQL injection NOT blocked by Cloud Armor → got ${STATUS} (expected 403)"
  warn "Cloud Armor WAF rules may not be fully propagated yet"
fi

# ============================================================
section "5. XSS via Cloud Armor (LB IP)"
# ============================================================

XSS_PAYLOAD='<script>alert(document.cookie)</script>'
XSS_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${XSS_PAYLOAD}'))" 2>/dev/null \
  || echo "%3Cscript%3Ealert%28document.cookie%29%3C%2Fscript%3E")

STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
  -H "Host: api.viraworkx.ai" \
  "http://${LB_IP}/api/v1/jobs?q=${XSS_ENCODED}" 2>/dev/null || echo "000")

if [ "$STATUS" = "403" ]; then
  pass "XSS payload blocked by Cloud Armor → 403"
elif [ "$STATUS" = "000" ]; then
  warn "XSS test — connection failed (LB may not be reachable on HTTP or Cloud Armor blocking entirely)"
elif [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
  fail "XSS NOT blocked — LB redirected (${STATUS}) instead of blocking. Cloud Armor WAF rules may not be propagated yet."
  warn "Cloud Armor WAF rule propagation can take 5-10 minutes after configuration"
else
  fail "XSS payload NOT blocked by Cloud Armor → got ${STATUS} (expected 403)"
  warn "Cloud Armor WAF rules may not be fully propagated yet"
fi

# ============================================================
section "6. JWT Security"
# ============================================================

# 6a. Malformed JWT
STATUS=$(http_status --max-time 15 \
  -H "Authorization: Bearer thisisnotajwtatall" \
  "${API_URL}/api/v1/candidates" 2>/dev/null)
if [ "$STATUS" = "401" ]; then
  pass "Malformed JWT → 401"
else
  fail "Malformed JWT → got ${STATUS} (expected 401)"
fi

# 6b. Expired/tampered JWT (expired iat/exp, bad signature)
TAMPERED="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.TAMPERED_SIGNATURE_HERE"
STATUS=$(http_status --max-time 15 \
  -H "Authorization: Bearer ${TAMPERED}" \
  "${API_URL}/api/v1/candidates" 2>/dev/null)
if [ "$STATUS" = "401" ]; then
  pass "Expired/tampered JWT → 401"
else
  fail "Expired/tampered JWT → got ${STATUS} (expected 401)"
fi

# 6c. JWT signed with wrong secret (structurally valid, wrong HMAC)
WRONG_SECRET_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwMDAwMDAwMC0wMDAwLTQwMDAtYTAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImFkbWluQHZpcmF3b3JreC5haSIsInVzZXJUeXBlIjoiYWRtaW4iLCJpYXQiOjk5OTk5OTk5OTksImV4cCI6OTk5OTk5OTk5OX0.wrongsecretfakehmacXXXXXXXXXXXXXXXXXXXXXXX"
STATUS=$(http_status --max-time 15 \
  -H "Authorization: Bearer ${WRONG_SECRET_JWT}" \
  "${API_URL}/api/v1/users" 2>/dev/null)
if [ "$STATUS" = "401" ]; then
  pass "JWT with wrong secret → 401"
else
  fail "JWT with wrong secret → got ${STATUS} (expected 401)"
fi

# ============================================================
section "7. Rate Limiting"
# ============================================================

echo "  [INFO] Sending 10 rapid login requests to /api/v1/auth/login..."
ALL_OK=true
RATE_LIMITED=false
for i in $(seq 1 10); do
  STATUS=$(http_status --max-time 10 -X POST "${API_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"ratetest@example.com","password":"wrongpass"}' 2>/dev/null)
  if [ "$STATUS" = "429" ]; then
    RATE_LIMITED=true
    echo "  [INFO] Rate limited at request ${i}"
    break
  fi
  if [ "$STATUS" != "400" ] && [ "$STATUS" != "401" ] && [ "$STATUS" != "422" ]; then
    ALL_OK=false
    echo "    Request ${i}: unexpected status ${STATUS}"
  fi
done

if [ "$RATE_LIMITED" = "true" ]; then
  warn "Rate limiter triggered within 10 requests — check if threshold is too aggressive"
elif [ "$ALL_OK" = "true" ]; then
  pass "10 rapid login requests all returned 400/401 — under rate limit threshold, API stable"
else
  fail "Some login requests returned unexpected status codes (not 400/401/429)"
fi

# ============================================================
section "8. CORS"
# ============================================================

# 8a. Allowed origin (www.viraworkx.ai) — should return ACAO header
CORS_RESPONSE=$(curl -s -D - -o /dev/null --max-time 15 \
  -X OPTIONS \
  -H "Origin: https://www.viraworkx.ai" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  "${API_URL}/api/v1/auth/login" 2>/dev/null)

CORS_STATUS=$(echo "$CORS_RESPONSE" | grep "^HTTP" | awk '{print $2}' | tr -d '\r')
ACAO=$(echo "$CORS_RESPONSE" | grep -i "^access-control-allow-origin:" | tr -d '\r')

if [ -n "$ACAO" ] && echo "$ACAO" | grep -qi "viraworkx.ai"; then
  pass "CORS preflight from allowed origin → ${CORS_STATUS} with ACAO: ${ACAO}"
elif [ -n "$ACAO" ] && echo "$ACAO" | grep -qi "\*"; then
  fail "CORS returns wildcard (*) origin — should be restricted to viraworkx.ai"
elif [ -n "$ACAO" ]; then
  warn "CORS preflight returned ACAO but not for viraworkx.ai: ${ACAO}"
else
  fail "CORS preflight from allowed origin (www.viraworkx.ai) — no ACAO header (status ${CORS_STATUS})"
  echo "    All access-control headers: $(echo "$CORS_RESPONSE" | grep -i 'access-control' || echo '(none)')"
fi

# 8b. Disallowed origin — should NOT return ACAO with evil-site.com
CORS_RESPONSE2=$(curl -s -D - -o /dev/null --max-time 15 \
  -X OPTIONS \
  -H "Origin: https://evil-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  "${API_URL}/api/v1/auth/login" 2>/dev/null)

ACAO2=$(echo "$CORS_RESPONSE2" | grep -i "^access-control-allow-origin:" | tr -d '\r')

if [ -z "$ACAO2" ]; then
  pass "CORS preflight from disallowed origin → no ACAO header (correct)"
elif echo "$ACAO2" | grep -qi "evil-site.com"; then
  fail "CORS preflight from disallowed origin returned evil origin in ACAO: ${ACAO2}"
elif echo "$ACAO2" | grep -qi "\*"; then
  fail "CORS allows wildcard (*) — disallowed origins can make credentialed requests"
else
  # The response has an ACAO but not the evil origin — this is the cors library reflecting a non-matching origin as empty
  warn "CORS for disallowed origin has ACAO header but not the evil domain: ${ACAO2} (may be benign)"
fi

# ============================================================
section "9. API Input Validation"
# ============================================================

# 9a. Register with missing required fields
STATUS=$(http_status --max-time 15 -X POST "${API_URL}/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' 2>/dev/null)
if [ "$STATUS" = "400" ] || [ "$STATUS" = "422" ]; then
  pass "Register with missing fields → ${STATUS}"
else
  fail "Register with missing fields → got ${STATUS} (expected 400 or 422)"
fi

# 9b. Register with invalid email format
STATUS=$(http_status --max-time 15 -X POST "${API_URL}/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"notanemail","password":"TestPass1!","user_type":"candidate","first_name":"A","last_name":"B"}' 2>/dev/null)
if [ "$STATUS" = "400" ] || [ "$STATUS" = "422" ]; then
  pass "Register with invalid email → ${STATUS}"
else
  fail "Register with invalid email → got ${STATUS} (expected 400 or 422)"
fi

# 9c. Login with empty body
STATUS=$(http_status --max-time 15 -X POST "${API_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null)
if [ "$STATUS" = "400" ] || [ "$STATUS" = "422" ] || [ "$STATUS" = "401" ]; then
  pass "Login with empty body → ${STATUS}"
else
  fail "Login with empty body → got ${STATUS} (expected 400/401/422)"
fi

# ============================================================
section "10. Sensitive Data Exposure"
# ============================================================

# 10a. Health endpoint must not expose secrets, env vars, or stack traces
HEALTH_RESPONSE=$(curl -s --max-time 15 "${API_URL}/health" 2>/dev/null)
HEALTH_HTTP=$(http_status --max-time 10 "${API_URL}/health" 2>/dev/null)
echo "  [INFO] Health HTTP status: ${HEALTH_HTTP}"
echo "  [INFO] Health response: $(echo "$HEALTH_RESPONSE" | head -c 300)"

LEAKED=false
for KEYWORD in "password" "secret" "api_key" "apikey" "DATABASE_URL" "REDIS_URL" "JWT_SECRET" \
               "sk-ant" "SG." "ANTHROPIC" "AWS_ACCESS" "AWS_SECRET" \
               "process.env" "node_modules" "stack"; do
  if echo "$HEALTH_RESPONSE" | grep -qi "$KEYWORD"; then
    fail "Health endpoint exposes sensitive data — found keyword: '${KEYWORD}'"
    LEAKED=true
    break
  fi
done

if [ "$LEAKED" = "false" ]; then
  pass "Health endpoint does not expose obvious secrets or env vars"
fi

# 10b. Error responses must not expose stack traces or internal paths
ERROR_RESPONSE=$(curl -s --max-time 15 "${API_URL}/api/v1/nonexistent-endpoint-sectest-xyz" 2>/dev/null)
echo "  [INFO] 404/error response: $(echo "$ERROR_RESPONSE" | head -c 250)"

STACK_LEAKED=false
for KEYWORD in "at Object." "at Module." "node_modules" "internal/modules" \
               "UnhandledPromise" "/app/src/" "/usr/src/" "Error\\.stack"; do
  if echo "$ERROR_RESPONSE" | grep -qi "$KEYWORD"; then
    fail "Error response exposes stack trace — found: '${KEYWORD}'"
    STACK_LEAKED=true
    break
  fi
done

if [ "$STACK_LEAKED" = "false" ]; then
  pass "Error response does not expose stack traces or internal paths"
fi

# 10c. Login error should not reveal whether the email exists (user enumeration)
RESP_UNKNOWN=$(curl -s --max-time 15 -X POST "${API_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"definitely-not-exist-xyz@mailnull.com","password":"WrongPass1!"}' 2>/dev/null)
RESP_KNOWN=$(curl -s --max-time 15 -X POST "${API_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"WrongPass1!\"}" 2>/dev/null)
MSG_UNKNOWN=$(echo "$RESP_UNKNOWN" | grep -o '"message":"[^"]*"' | head -1)
MSG_KNOWN=$(echo "$RESP_KNOWN" | grep -o '"message":"[^"]*"' | head -1)
echo "  [INFO] Unknown email msg:  ${MSG_UNKNOWN}"
echo "  [INFO] Known email msg:    ${MSG_KNOWN}"

if [ "$MSG_UNKNOWN" = "$MSG_KNOWN" ]; then
  pass "Login error messages are identical for unknown vs known email (no user enumeration)"
else
  warn "Login error messages differ between unknown and known email — potential user enumeration: '${MSG_UNKNOWN}' vs '${MSG_KNOWN}'"
fi

# ============================================================
echo ""
echo -e "${BLUE}##################################################${NC}"
echo -e "${BLUE}  SUMMARY${NC}"
echo -e "${BLUE}##################################################${NC}"
echo -e "  ${GREEN}PASS: ${PASS}${NC}"
echo -e "  ${RED}FAIL: ${FAIL}${NC}"
echo -e "  ${YELLOW}WARN: ${WARN}${NC}"
TOTAL=$((PASS + FAIL + WARN))
echo -e "  TOTAL CHECKS: ${TOTAL}"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}All checks passed or warned. No critical failures.${NC}"
else
  echo -e "  ${RED}${FAIL} check(s) FAILED. Review details above.${NC}"
fi
echo ""
