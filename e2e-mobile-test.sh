#!/usr/bin/env bash
# =============================================================================
# ViraWorkx — Mobile & New Features E2E Test Suite
# Tests: responsive endpoints, new routes, mobile UA, CORS, new admin APIs
# Usage: ./e2e-mobile-test.sh
#        API_URL=https://... FRONTEND_URL=https://... ./e2e-mobile-test.sh
# =============================================================================

API_URL="${API_URL:-http://localhost:4001}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

PASS=0; FAIL=0; SKIP=0

pass()  { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)) || true; }
fail()  { echo -e "  ${RED}✗${NC} $1\n    ${RED}↳ $2${NC}"; ((FAIL++)) || true; }
skip()  { echo -e "  ${YELLOW}⊘${NC} $1 (skipped: $2)"; ((SKIP++)) || true; }

# Mobile and Desktop user agents
UA_MOBILE="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
UA_ANDROID="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
UA_TABLET="Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
UA_DESKTOP="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Helper: GET with optional auth
get() {
  local url="$1" token="$2" ua="${3:-$UA_DESKTOP}"
  if [ -n "$token" ]; then
    curl -s --max-time 12 -H "Authorization: Bearer $token" -A "$ua" "$url"
  else
    curl -s --max-time 12 -A "$ua" "$url"
  fi
}

# Helper: POST JSON
post() {
  local url="$1" data="$2" token="${3:-}"
  if [ -n "$token" ]; then
    curl -s --max-time 12 -X POST -H "Content-Type: application/json" \
      -H "Authorization: Bearer $token" -d "$data" "$url"
  else
    curl -s --max-time 12 -X POST -H "Content-Type: application/json" -d "$data" "$url"
  fi
}

# Helper: extract field via python
extract() { echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print($2)" 2>/dev/null || echo ""; }

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     ViraWorkx Mobile & New Features E2E Test Suite       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  API:      $API_URL"
echo "  Frontend: $FRONTEND_URL"
echo ""

# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}[1/8] Infrastructure & Health${NC}"
echo "────────────────────────────────────────"

health=$(curl -s --max-time 8 "$API_URL/health")
echo "$health" | grep -q '"ok"' && pass "API health check" || fail "API health check" "$health"

# Frontend serves HTML to desktop browser
desktop_status=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" -A "$UA_DESKTOP" "$FRONTEND_URL/")
[ "$desktop_status" = "200" ] && pass "Frontend serves HTML to desktop UA" \
  || fail "Frontend serves HTML to desktop UA" "HTTP $desktop_status"

# Frontend serves HTML to mobile browser (iPhone)
mobile_status=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" -A "$UA_MOBILE" "$FRONTEND_URL/")
[ "$mobile_status" = "200" ] && pass "Frontend serves HTML to iPhone UA" \
  || fail "Frontend serves HTML to iPhone UA" "HTTP $mobile_status"

# Frontend serves HTML to Android
android_status=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" -A "$UA_ANDROID" "$FRONTEND_URL/")
[ "$android_status" = "200" ] && pass "Frontend serves HTML to Android UA" \
  || fail "Frontend serves HTML to Android UA" "HTTP $android_status"

# Frontend serves HTML to iPad
tablet_status=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" -A "$UA_TABLET" "$FRONTEND_URL/")
[ "$tablet_status" = "200" ] && pass "Frontend serves HTML to iPad UA" \
  || fail "Frontend serves HTML to iPad UA" "HTTP $tablet_status"

# Mobile HTML has viewport meta tag
mobile_html=$(curl -s --max-time 10 -A "$UA_MOBILE" "$FRONTEND_URL/")
echo "$mobile_html" | grep -qi 'viewport' \
  && pass "HTML contains viewport meta tag" \
  || fail "HTML contains viewport meta tag" "No <meta name=\"viewport\"> found"

# Content-Type is text/html
ct=$(curl -s --max-time 10 -o /dev/null -w "%{content_type}" -A "$UA_MOBILE" "$FRONTEND_URL/")
echo "$ct" | grep -q "text/html" \
  && pass "Frontend Content-Type is text/html for mobile" \
  || fail "Frontend Content-Type is text/html for mobile" "Got: $ct"

echo ""

# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}[2/8] CORS Headers (Mobile Browser Simulation)${NC}"
echo "────────────────────────────────────────"

# Preflight from web origin
cors_resp=$(curl -s --max-time 10 -X OPTIONS \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -I "$API_URL/api/v1/auth/login" 2>&1)

echo "$cors_resp" | grep -qi "access-control-allow-origin" \
  && pass "CORS: Access-Control-Allow-Origin present" \
  || fail "CORS: Access-Control-Allow-Origin present" "$(echo "$cors_resp" | grep -i access-control | head -3)"

echo "$cors_resp" | grep -qi "access-control-allow-methods" \
  && pass "CORS: Access-Control-Allow-Methods present" \
  || fail "CORS: Access-Control-Allow-Methods present" "Missing ACAO methods header"

# Cross-origin request from mobile app (simulating native app or webview)
cors_get=$(curl -s --max-time 10 \
  -H "Origin: https://app.viraworkx.ai" \
  -I "$API_URL/api/v1/jobs" 2>&1)
# Should return 200 (public endpoint, CORS may or may not block based on config)
echo "$cors_get" | grep -q "200" \
  && pass "API: Public jobs endpoint accessible cross-origin" \
  || skip "API: Public jobs accessible cross-origin" "CORS policy may restrict origin"

echo ""

# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}[3/8] Authentication — Mobile Tokens${NC}"
echo "────────────────────────────────────────"

# Setup: auto-provision accounts
post "$API_URL/api/v1/auth/register" \
  '{"email":"mobile-client@viraworkx.ai","password":"Mobile2026!","userType":"client","companyName":"Mobile Test Co"}' > /dev/null 2>&1
post "$API_URL/api/v1/auth/register" \
  '{"email":"mobile-cand@viraworkx.ai","password":"Mobile2026!","userType":"candidate","firstName":"Mobile","lastName":"Tester"}' > /dev/null 2>&1

# Admin login from mobile UA
admin_resp=$(curl -s --max-time 10 -X POST -A "$UA_MOBILE" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@viraworkx.ai","password":"Ds1%2nWBCo@mHLHz"}' \
  "$API_URL/api/v1/auth/login")
ADMIN_TOKEN=$(extract "$admin_resp" "d.get('accessToken','')")
[ -n "$ADMIN_TOKEN" ] && pass "Admin login via mobile UA" \
  || fail "Admin login via mobile UA" "${admin_resp:0:150}"

# Client login from Android UA
client_resp=$(curl -s --max-time 10 -X POST -A "$UA_ANDROID" \
  -H "Content-Type: application/json" \
  -d '{"email":"mobile-client@viraworkx.ai","password":"Mobile2026!"}' \
  "$API_URL/api/v1/auth/login")
CLIENT_TOKEN=$(extract "$client_resp" "d.get('accessToken','')")
[ -n "$CLIENT_TOKEN" ] && pass "Client login via Android UA" \
  || fail "Client login via Android UA" "${client_resp:0:150}"

# Candidate login from iPad UA
cand_resp=$(curl -s --max-time 10 -X POST -A "$UA_TABLET" \
  -H "Content-Type: application/json" \
  -d '{"email":"mobile-cand@viraworkx.ai","password":"Mobile2026!"}' \
  "$API_URL/api/v1/auth/login")
CAND_TOKEN=$(extract "$cand_resp" "d.get('accessToken','')")
[ -n "$CAND_TOKEN" ] && pass "Candidate login via iPad UA" \
  || fail "Candidate login via iPad UA" "${cand_resp:0:150}"

# Token refresh works from mobile
if [ -n "$CAND_TOKEN" ]; then
  cand_refresh_token=$(extract "$cand_resp" "d.get('refreshToken','')")
  refresh_resp=$(curl -s --max-time 10 -X POST -A "$UA_MOBILE" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$cand_refresh_token\"}" \
    "$API_URL/api/v1/auth/refresh")
  extract "$refresh_resp" "d.get('accessToken','')" | grep -q "eyJ" \
    && pass "Token refresh works from mobile UA" \
    || fail "Token refresh works from mobile UA" "${refresh_resp:0:150}"
else
  skip "Token refresh" "no candidate token"
fi

echo ""

# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}[4/8] New Admin Routes (from App.tsx changes)${NC}"
echo "────────────────────────────────────────"

# All new SPA routes should serve the same HTML (React router handles them client-side)
for route in "/" "/login" "/admin/dashboard" "/admin/candidates" "/admin/clients" \
             "/admin/jobs" "/admin/applications" "/admin/interviews" \
             "/admin/analytics" "/admin/users" "/admin/settings" \
             "/admin/vetting" "/admin/contracts" "/admin/ai-monitor"; do
  status=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" -A "$UA_MOBILE" "$FRONTEND_URL$route")
  [ "$status" = "200" ] && pass "SPA route $route → 200" \
    || fail "SPA route $route → 200" "HTTP $status"
done

echo ""

# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}[5/8] Candidate Portal Routes (Mobile)${NC}"
echo "────────────────────────────────────────"

for route in "/candidate/dashboard" "/candidate/applications" "/candidate/assessments" \
             "/candidate/profile" "/candidate/jobs"; do
  status=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" -A "$UA_MOBILE" "$FRONTEND_URL$route")
  [ "$status" = "200" ] && pass "Candidate SPA route $route → 200" \
    || fail "Candidate SPA route $route → 200" "HTTP $status"
done

echo ""

# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}[6/8] New API Endpoints${NC}"
echo "────────────────────────────────────────"

if [ -z "$ADMIN_TOKEN" ]; then
  skip "All new API endpoint tests" "no admin token"
else
  # Users management endpoint (new route added)
  users_resp=$(get "$API_URL/api/v1/users" "$ADMIN_TOKEN" "$UA_MOBILE")
  echo "$users_resp" | grep -q '"users"' \
    && pass "GET /api/v1/users returns users list" \
    || fail "GET /api/v1/users returns users list" "${users_resp:0:200}"

  # Users list has expected fields
  echo "$users_resp" | grep -q '"email"' \
    && pass "Users list has email field" \
    || fail "Users list has email field" "${users_resp:0:200}"

  echo "$users_resp" | grep -q '"userType"' \
    && pass "Users list has userType field" \
    || fail "Users list has userType field" "${users_resp:0:200}"

  # Candidate cannot access users list
  if [ -n "$CAND_TOKEN" ]; then
    cand_users=$(get "$API_URL/api/v1/users" "$CAND_TOKEN" "$UA_MOBILE")
    echo "$cand_users" | grep -qi "forbidden\|unauthorized\|denied\|not allowed\|access\|permission\|insufficient" \
      && pass "Candidate blocked from /api/v1/users" \
      || fail "Candidate blocked from /api/v1/users" "${cand_users:0:150}"
  else
    skip "Candidate blocked from /users" "no candidate token"
  fi

  # Candidates list via mobile (existing route, now with tier filter)
  cands_resp=$(get "$API_URL/api/v1/candidates" "$ADMIN_TOKEN" "$UA_MOBILE")
  echo "$cands_resp" | grep -q '"candidates"' \
    && pass "GET /api/v1/candidates works from mobile UA" \
    || fail "GET /api/v1/candidates works from mobile UA" "${cands_resp:0:200}"

  # Tier filter
  tier_resp=$(get "$API_URL/api/v1/candidates?tier=Tier+1" "$ADMIN_TOKEN" "$UA_MOBILE")
  echo "$tier_resp" | grep -q '"candidates"' \
    && pass "GET /api/v1/candidates?tier=Tier+1 filter works" \
    || fail "GET /api/v1/candidates?tier=Tier+1 filter works" "${tier_resp:0:200}"

  # Analytics from mobile
  analytics_resp=$(get "$API_URL/api/v1/analytics/overview" "$ADMIN_TOKEN" "$UA_MOBILE")
  echo "$analytics_resp" | grep -q '"overview"' \
    && pass "Analytics overview accessible from mobile UA" \
    || fail "Analytics overview accessible from mobile UA" "${analytics_resp:0:200}"

  # AI actions list
  ai_actions=$(get "$API_URL/api/v1/ai/actions" "$ADMIN_TOKEN" "$UA_MOBILE")
  echo "$ai_actions" | grep -qi '"actions"\|"data"\|\[\]' \
    && pass "GET /api/v1/ai/actions accessible from mobile" \
    || fail "GET /api/v1/ai/actions accessible from mobile" "${ai_actions:0:200}"
fi

echo ""

# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}[7/8] Candidate API — Mobile Access${NC}"
echo "────────────────────────────────────────"

if [ -z "$CAND_TOKEN" ]; then
  skip "All candidate API tests" "no candidate token"
else
  # Profile from iPhone
  profile_resp=$(get "$API_URL/api/v1/candidates/profile" "$CAND_TOKEN" "$UA_MOBILE")
  echo "$profile_resp" | grep -q '"profile"' \
    && pass "GET /candidates/profile works from iPhone" \
    || fail "GET /candidates/profile works from iPhone" "${profile_resp:0:200}"

  profile_fname=$(extract "$profile_resp" "d.get('profile',{}).get('firstName','')")
  [ -n "$profile_fname" ] && pass "Profile has firstName (Mobile)" \
    || fail "Profile has firstName (Mobile)" "${profile_resp:0:150}"

  # Job matches from Android
  jm_resp=$(get "$API_URL/api/v1/candidates/job-matches" "$CAND_TOKEN" "$UA_ANDROID")
  jm_status=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $CAND_TOKEN" -A "$UA_ANDROID" \
    "$API_URL/api/v1/candidates/job-matches")
  [ "$jm_status" = "200" ] && pass "GET /candidates/job-matches works from Android" \
    || fail "GET /candidates/job-matches works from Android" "HTTP $jm_status"

  # Applications from mobile
  apps_status=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $CAND_TOKEN" -A "$UA_MOBILE" \
    "$API_URL/api/v1/candidates/me/applications")
  [ "$apps_status" = "200" ] && pass "GET /candidates/me/applications works from mobile" \
    || fail "GET /candidates/me/applications works from mobile" "HTTP $apps_status"

  # Assessments from mobile
  assess_resp=$(get "$API_URL/api/v1/assessments" "$CAND_TOKEN" "$UA_MOBILE")
  echo "$assess_resp" | grep -qi '"assessments"\|\[\]' \
    && pass "GET /assessments accessible from mobile" \
    || fail "GET /assessments accessible from mobile" "${assess_resp:0:200}"

  # Notifications from mobile
  notif_resp=$(get "$API_URL/api/v1/notifications" "$CAND_TOKEN" "$UA_MOBILE")
  echo "$notif_resp" | grep -qi '"notifications"\|\[\]' \
    && pass "GET /notifications accessible from mobile" \
    || fail "GET /notifications accessible from mobile" "${notif_resp:0:200}"

  # Profile update from mobile (PUT)
  update_resp=$(curl -s --max-time 10 -X PUT \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CAND_TOKEN" \
    -A "$UA_MOBILE" \
    -d '{"headline":"Mobile Engineer","location":"Bangalore, India"}' \
    "$API_URL/api/v1/candidates/me/profile")
  echo "$update_resp" | grep -q '"profile"' \
    && pass "PUT /candidates/me/profile works from mobile" \
    || fail "PUT /candidates/me/profile works from mobile" "${update_resp:0:200}"
fi

echo ""

# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}[8/8] Client API — Mobile Access${NC}"
echo "────────────────────────────────────────"

if [ -z "$CLIENT_TOKEN" ]; then
  skip "All client API tests" "no client token"
else
  # Client auth/me from mobile
  me_resp=$(get "$API_URL/api/v1/auth/me" "$CLIENT_TOKEN" "$UA_MOBILE")
  extract "$me_resp" "d.get('user',{}).get('userType','')" | grep -q "client" \
    && pass "Client /auth/me works from mobile" \
    || fail "Client /auth/me works from mobile" "${me_resp:0:150}"

  # Jobs list from mobile
  jobs_resp=$(get "$API_URL/api/v1/jobs" "$CLIENT_TOKEN" "$UA_MOBILE")
  echo "$jobs_resp" | grep -q '"jobs"' \
    && pass "GET /jobs accessible from mobile (client)" \
    || fail "GET /jobs accessible from mobile (client)" "${jobs_resp:0:200}"

  # Create job from mobile
  new_job=$(curl -s --max-time 12 -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CLIENT_TOKEN" \
    -A "$UA_MOBILE" \
    -d '{"title":"Mobile React Native Engineer","skillsRequired":["React Native","TypeScript"],"location":"Remote","remotePolicy":"remote"}' \
    "$API_URL/api/v1/jobs")
  JOB_ID=$(extract "$new_job" "d.get('job',{}).get('id','')")
  [ -n "$JOB_ID" ] && pass "POST /jobs — create job from mobile" \
    || fail "POST /jobs — create job from mobile" "${new_job:0:200}"

  # Publish job from mobile
  if [ -n "$JOB_ID" ]; then
    pub_resp=$(curl -s --max-time 10 -X POST \
      -H "Authorization: Bearer $CLIENT_TOKEN" \
      -A "$UA_MOBILE" \
      "$API_URL/api/v1/jobs/$JOB_ID/publish")
    echo "$pub_resp" | grep -qi '"active"\|published\|success' \
      && pass "POST /jobs/:id/publish works from mobile" \
      || fail "POST /jobs/:id/publish works from mobile" "${pub_resp:0:150}"

    # Published job visible to unauthenticated mobile user
    pub_view=$(curl -s --max-time 10 -A "$UA_MOBILE" "$API_URL/api/v1/jobs/$JOB_ID")
    echo "$pub_view" | grep -q '"job"' \
      && pass "Published job visible to unauthenticated mobile user" \
      || fail "Published job visible to unauthenticated mobile user" "${pub_view:0:150}"
  else
    skip "Publish job from mobile" "job not created"
    skip "Published job visible unauthenticated" "job not created"
  fi

  # Notifications from mobile
  notif_client=$(get "$API_URL/api/v1/notifications" "$CLIENT_TOKEN" "$UA_ANDROID")
  echo "$notif_client" | grep -qi '"notifications"\|\[\]' \
    && pass "GET /notifications accessible from mobile (client)" \
    || fail "GET /notifications accessible from mobile (client)" "${notif_client:0:200}"
fi

echo ""

# ─────────────────────────────────────────────────────────────
# RESULTS
# ─────────────────────────────────────────────────────────────
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           MOBILE & NEW FEATURES TEST RESULTS             ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Total:   $((PASS + FAIL + SKIP))"
echo -e "  ${GREEN}Passed:  $PASS${NC}"
echo -e "  ${RED}Failed:  $FAIL${NC}"
echo -e "  ${YELLOW}Skipped: $SKIP${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  ALL TESTS PASSED — Mobile & new features verified!      ${NC}"
  echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
else
  echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
  echo -e "${RED}  $FAIL TEST(S) FAILED                                      ${NC}"
  echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
fi
echo ""
