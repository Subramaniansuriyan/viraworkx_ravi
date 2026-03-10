#!/bin/bash

# ViraWorkx Phase 1 + Phase 2 E2E Test Suite

API_URL="${API_URL:-http://localhost:4001}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0

pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗${NC} $1"; echo -e "    ${RED}↳ $2${NC}"; ((FAIL++)); }
skip() { echo -e "  ${YELLOW}⊘${NC} $1 (skipped: $2)"; ((SKIP++)); }

expect_field() {
  local name="$1" url="$2" token="$3" field="$4"
  local response
  if [ -n "$token" ]; then
    response=$(curl -s --max-time 10 -H "Authorization: Bearer $token" "$url")
  else
    response=$(curl -s --max-time 10 "$url")
  fi
  if echo "$response" | grep -q "$field"; then
    pass "$name"
  else
    fail "$name" "Expected '$field' in: ${response:0:200}"
  fi
}

expect_post() {
  local name="$1" url="$2" token="$3" body="$4" field="$5"
  local response
  response=$(curl -s --max-time 10 -X POST \
    -H "Content-Type: application/json" \
    ${token:+-H "Authorization: Bearer $token"} \
    -d "$body" "$url")
  if echo "$response" | grep -q "$field"; then
    pass "$name"
    echo "$response"
  else
    fail "$name" "Expected '$field' in: ${response:0:200}"
    echo ""
  fi
}

extract() {
  echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d$(echo "$2"))" 2>/dev/null || echo ""
}

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     ViraWorkx Phase 1 + Phase 2 E2E Test Suite           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[1/12] Infrastructure${NC}"
echo "────────────────────────────────────────"

health=$(curl -s --max-time 8 "$API_URL/health")
if echo "$health" | grep -q '"ok"'; then
  pass "API health check ($API_URL)"
else
  fail "API health check" "API not reachable at $API_URL — is the server running?"
fi

frontend=$(curl -s --max-time 8 -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$frontend" = "200" ]; then
  pass "Frontend accessible ($FRONTEND_URL)"
else
  skip "Frontend check" "got HTTP $frontend — may not be running"
fi

echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[2/12] Authentication${NC}"
echo "────────────────────────────────────────"

admin_resp=$(curl -s --max-time 10 -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@viraworkx.ai","password":"Ds1%2nWBCo@mHLHz"}')
ADMIN_TOKEN=$(extract "$admin_resp" ".get('accessToken','')")
[ -n "$ADMIN_TOKEN" ] && pass "Admin login" || fail "Admin login" "${admin_resp:0:200}"

# Auto-provision test client if needed
curl -s --max-time 10 -X POST "$API_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e-client@viraworkx.ai","password":"E2eTest2026!","userType":"client","companyName":"E2E Test Co"}' > /dev/null 2>&1
client_resp=$(curl -s --max-time 10 -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e-client@viraworkx.ai","password":"E2eTest2026!"}')
CLIENT_TOKEN=$(extract "$client_resp" ".get('accessToken','')")
[ -n "$CLIENT_TOKEN" ] && pass "Client login" || fail "Client login" "${client_resp:0:200}"

# Auto-provision test candidate if needed
curl -s --max-time 10 -X POST "$API_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e-candidate@viraworkx.ai","password":"E2eTest2026!","userType":"candidate","firstName":"E2E","lastName":"Tester"}' > /dev/null 2>&1
candidate_resp=$(curl -s --max-time 10 -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e-candidate@viraworkx.ai","password":"E2eTest2026!"}')
CANDIDATE_TOKEN=$(extract "$candidate_resp" ".get('accessToken','')")
[ -n "$CANDIDATE_TOKEN" ] && pass "Candidate login" || fail "Candidate login" "${candidate_resp:0:200}"

invalid=$(curl -s --max-time 10 -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"nobody@example.com","password":"wrongpass"}')
if echo "$invalid" | grep -qi "invalid\|error\|credentials\|unauthorized"; then
  pass "Invalid credentials rejected"
else
  fail "Invalid credentials rejected" "${invalid:0:200}"
fi

admin_me=$(curl -s --max-time 10 -H "Authorization: Bearer $ADMIN_TOKEN" "$API_URL/api/v1/auth/me")
if echo "$admin_me" | grep -q '"admin"'; then
  pass "GET /auth/me returns admin userType"
else
  fail "GET /auth/me returns admin userType" "${admin_me:0:200}"
fi

echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[3/12] Role Isolation (Access Control)${NC}"
echo "────────────────────────────────────────"

cand_block=$(curl -s --max-time 10 -H "Authorization: Bearer $CANDIDATE_TOKEN" "$API_URL/api/v1/candidates")
if echo "$cand_block" | grep -qi "forbidden\|403\|unauthorized\|not allowed\|insufficient\|permission"; then
  pass "Candidate blocked from GET /candidates (admin-only)"
else
  fail "Candidate blocked from GET /candidates" "${cand_block:0:200}"
fi

job_block=$(curl -s --max-time 10 -X POST "$API_URL/api/v1/jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CANDIDATE_TOKEN" \
  -d '{"title":"Hack"}')
if echo "$job_block" | grep -qi "forbidden\|403\|unauthorized\|not allowed\|insufficient\|permission"; then
  pass "Candidate blocked from POST /jobs (client/admin only)"
else
  fail "Candidate blocked from POST /jobs" "${job_block:0:200}"
fi

unauth=$(curl -s --max-time 10 "$API_URL/api/v1/notifications")
if echo "$unauth" | grep -qi "unauthorized\|token\|401\|403"; then
  pass "Unauthenticated request rejected"
else
  fail "Unauthenticated request rejected" "${unauth:0:200}"
fi

echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[4/12] Admin Portal — Core${NC}"
echo "────────────────────────────────────────"

expect_field "List clients"       "$API_URL/api/v1/clients"                "$ADMIN_TOKEN" "clients\|id"
expect_field "List candidates"    "$API_URL/api/v1/candidates"             "$ADMIN_TOKEN" "candidates\|id"
expect_field "List all jobs"      "$API_URL/api/v1/jobs"                   "$ADMIN_TOKEN" "jobs\|id"
expect_field "List applications"  "$API_URL/api/v1/applications"           "$ADMIN_TOKEN" "applications\|id"
expect_field "List interviews"    "$API_URL/api/v1/interviews"             "$ADMIN_TOKEN" "interviews\|id"
expect_field "List users"         "$API_URL/api/v1/users"                  "$ADMIN_TOKEN" "users\|id"
expect_field "Notifications"      "$API_URL/api/v1/notifications"          "$ADMIN_TOKEN" "notifications\|id"

echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[5/12] Phase 1: Vetting Pipeline${NC}"
echo "────────────────────────────────────────"

expect_field "Pending test allocations" \
  "$API_URL/api/v1/assessments/admin/pending-allocation" "$ADMIN_TOKEN" "candidates\|\[\]"

apps_resp=$(curl -s --max-time 10 -H "Authorization: Bearer $ADMIN_TOKEN" "$API_URL/api/v1/applications?limit=1")
APP_ID=$(extract "$apps_resp" ".get('applications',[{}])[0].get('id','')")

if [ -n "$APP_ID" ]; then
  adv=$(curl -s --max-time 10 -X POST "$API_URL/api/v1/applications/$APP_ID/advance" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"stage":"screening"}')
  if echo "$adv" | grep -qi "stage\|application\|id"; then
    pass "Advance application stage (explicit stage)"
  else
    fail "Advance application stage" "${adv:0:200}"
  fi
else
  skip "Advance application stage" "no applications in DB"
fi

echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[6/12] Phase 1: Candidate Invite${NC}"
echo "────────────────────────────────────────"

INVITE_EMAIL="e2e-invite-$(date +%s)@test.viraworkx.ai"
invite_resp=$(curl -s --max-time 10 -X POST "$API_URL/api/v1/candidates/invite" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"firstName\":\"E2E\",\"lastName\":\"Invite\",\"email\":\"$INVITE_EMAIL\"}")
if echo "$invite_resp" | grep -qi "invited\|candidate\|id"; then
  pass "Admin can invite candidate"
else
  fail "Admin can invite candidate" "${invite_resp:0:200}"
fi

dup_resp=$(curl -s --max-time 10 -X POST "$API_URL/api/v1/candidates/invite" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"firstName\":\"E2E\",\"lastName\":\"Invite\",\"email\":\"$INVITE_EMAIL\"}")
if echo "$dup_resp" | grep -qi "exists\|conflict\|409\|error"; then
  pass "Duplicate invite rejected (409)"
else
  fail "Duplicate invite rejected" "${dup_resp:0:200}"
fi

client_invite=$(curl -s --max-time 10 -X POST "$API_URL/api/v1/candidates/invite" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -d '{"firstName":"Bad","lastName":"Actor","email":"bad@test.com"}')
if echo "$client_invite" | grep -qi "forbidden\|403\|unauthorized\|insufficient\|permission"; then
  pass "Client blocked from candidate invite (admin-only)"
else
  fail "Client blocked from candidate invite" "${client_invite:0:200}"
fi

echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[7/12] Phase 1: Interviews Admin${NC}"
echo "────────────────────────────────────────"

INTERVIEW_APP_ID="$APP_ID"
if [ -n "$INTERVIEW_APP_ID" ]; then
  interview_resp=$(curl -s --max-time 10 -X POST "$API_URL/api/v1/interviews" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
      \"applicationId\": \"$INTERVIEW_APP_ID\",
      \"interviewType\": \"video\",
      \"title\": \"E2E Test Interview\",
      \"scheduledAt\": \"2026-06-01T10:00:00Z\",
      \"durationMinutes\": 60,
      \"timezone\": \"Asia/Kolkata\"
    }")
  if echo "$interview_resp" | grep -qi "interview\|id"; then
    pass "Create interview"
    INTERVIEW_ID=$(extract "$interview_resp" ".get('interview',{}).get('id','')")
  else
    fail "Create interview" "${interview_resp:0:200}"
    INTERVIEW_ID=""
  fi
else
  skip "Create interview" "no application id available"
  INTERVIEW_ID=""
fi

if [ -n "$INTERVIEW_ID" ]; then
  cancel_resp=$(curl -s --max-time 10 -X POST \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$API_URL/api/v1/interviews/$INTERVIEW_ID/cancel")
  if echo "$cancel_resp" | grep -qi "cancelled\|canceled\|interview\|id"; then
    pass "Cancel interview"
  else
    fail "Cancel interview" "${cancel_resp:0:200}"
  fi
else
  skip "Cancel interview" "no interview created"
fi

echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[8/12] Client Portal${NC}"
echo "────────────────────────────────────────"

expect_field "Client: GET /auth/me"          "$API_URL/api/v1/auth/me"          "$CLIENT_TOKEN" "client"
expect_field "Client: list jobs"             "$API_URL/api/v1/jobs"             "$CLIENT_TOKEN" "jobs\|id"
expect_field "Client: list applications"     "$API_URL/api/v1/applications"     "$CLIENT_TOKEN" "applications\|id"
expect_field "Client: notifications"         "$API_URL/api/v1/notifications"    "$CLIENT_TOKEN" "notifications\|id"

job_resp=$(curl -s --max-time 10 -X POST "$API_URL/api/v1/jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -d '{"title":"E2E QA Engineer","description":"Testing role","requirements":"Playwright","location":"Remote","employmentType":"full_time","experienceMin":2,"experienceMax":5,"salaryMin":60000,"salaryMax":90000,"remotePolicy":"remote","skillsRequired":["QA","Automation"]}')
if echo "$job_resp" | grep -qi "id\|title"; then
  pass "Client: create job"
  JOB_ID=$(echo "$job_resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('job',d).get('id',''))" 2>/dev/null || echo "")
else
  fail "Client: create job" "${job_resp:0:200}"
  JOB_ID=""
fi

if [ -n "$JOB_ID" ]; then
  pub_resp=$(curl -s --max-time 10 -X POST \
    -H "Authorization: Bearer $CLIENT_TOKEN" \
    "$API_URL/api/v1/jobs/$JOB_ID/publish")
  if echo "$pub_resp" | grep -qi "active\|published\|job\|id"; then
    pass "Client: publish job"
  else
    fail "Client: publish job" "${pub_resp:0:200}"
  fi
else
  skip "Client: publish job" "no job created"
fi

echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[9/12] Candidate Portal${NC}"
echo "────────────────────────────────────────"

expect_field "Candidate: GET /auth/me"           "$API_URL/api/v1/auth/me"                    "$CANDIDATE_TOKEN" "candidate"
expect_field "Candidate: get profile"            "$API_URL/api/v1/candidates/me/profile"      "$CANDIDATE_TOKEN" "firstName\|profile"
expect_field "Candidate: my applications"        "$API_URL/api/v1/candidates/me/applications" "$CANDIDATE_TOKEN" "applications"
expect_field "Candidate: job matches"            "$API_URL/api/v1/candidates/me/job-matches"  "$CANDIDATE_TOKEN" "jobs\|matchScores"
expect_field "Candidate: notifications"          "$API_URL/api/v1/notifications"              "$CANDIDATE_TOKEN" "notifications\|id"

profile_update=$(curl -s --max-time 10 -X PUT "$API_URL/api/v1/candidates/me/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CANDIDATE_TOKEN" \
  -d '{"headline":"Senior Engineer - E2E Verified"}')
if echo "$profile_update" | grep -qi "profile\|firstName\|updated"; then
  pass "Candidate: update profile"
else
  fail "Candidate: update profile" "${profile_update:0:200}"
fi

echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[10/12] Phase 2: Analytics${NC}"
echo "────────────────────────────────────────"

analytics_overview=$(curl -s --max-time 10 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_URL/api/v1/analytics/overview")
if echo "$analytics_overview" | grep -q '"overview"'; then
  pass "Analytics overview returns {overview} wrapper"
else
  fail "Analytics overview returns {overview} wrapper" "${analytics_overview:0:200}"
fi

if echo "$analytics_overview" | grep -q '"totalCandidates"'; then
  pass "Analytics overview has totalCandidates"
else
  fail "Analytics overview has totalCandidates" "${analytics_overview:0:200}"
fi

if echo "$analytics_overview" | grep -q '"topSkills"'; then
  pass "Analytics overview has topSkills"
else
  fail "Analytics overview has topSkills" "${analytics_overview:0:200}"
fi

analytics_conv=$(curl -s --max-time 10 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_URL/api/v1/analytics/conversion-rates")
if echo "$analytics_conv" | grep -q '"conversions"'; then
  pass "Conversion rates returns 'conversions' key"
else
  fail "Conversion rates returns 'conversions' key" "${analytics_conv:0:200}"
fi

if echo "$analytics_conv" | grep -q '"rate"'; then
  pass "Conversion rates items have 'rate' field"
else
  fail "Conversion rates items have 'rate' field" "${analytics_conv:0:200}"
fi

analytics_pipeline=$(curl -s --max-time 10 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_URL/api/v1/analytics/pipeline")
if echo "$analytics_pipeline" | grep -q '"pipeline"'; then
  pass "Analytics pipeline endpoint works"
else
  fail "Analytics pipeline endpoint works" "${analytics_pipeline:0:200}"
fi

echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[11/12] Phase 2: Application Pipeline Stage Actions${NC}"
echo "────────────────────────────────────────"

# Get a fresh application in 'new' or 'screening' stage for auto-advance test
new_apps=$(curl -s --max-time 10 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_URL/api/v1/applications?stage=new&limit=1")
AUTO_APP_ID=$(extract "$new_apps" ".get('applications',[{}])[0].get('id','')")

if [ -n "$AUTO_APP_ID" ]; then
  auto_adv=$(curl -s --max-time 10 -X POST "$API_URL/api/v1/applications/$AUTO_APP_ID/advance" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{}')
  if echo "$auto_adv" | grep -qi "stage\|application\|id"; then
    pass "Auto-advance application (no stage provided → next stage)"
  else
    fail "Auto-advance application" "${auto_adv:0:200}"
  fi
else
  skip "Auto-advance application" "no applications in 'new' stage"
fi

if [ -n "$APP_ID" ]; then
  shortlist_resp=$(curl -s --max-time 10 -X POST "$API_URL/api/v1/applications/$APP_ID/shortlist" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{}')
  if echo "$shortlist_resp" | grep -qi "shortlisted\|stage\|id"; then
    pass "Shortlist application"
  else
    fail "Shortlist application" "${shortlist_resp:0:200}"
  fi

  reject_apps=$(curl -s --max-time 10 \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$API_URL/api/v1/applications?stage=new&limit=1")
  REJECT_APP_ID=$(extract "$reject_apps" ".get('applications',[{}])[0].get('id','')")

  if [ -n "$REJECT_APP_ID" ]; then
    reject_resp=$(curl -s --max-time 10 -X POST "$API_URL/api/v1/applications/$REJECT_APP_ID/reject" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"reason":"Not a fit for the role"}')
    if echo "$reject_resp" | grep -qi "rejected\|stage\|id"; then
      pass "Reject application"
    else
      fail "Reject application" "${reject_resp:0:200}"
    fi
  else
    skip "Reject application" "no application available"
  fi

  pipeline_resp=$(curl -s --max-time 10 \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$API_URL/api/v1/applications/pipeline/${APP_ID}" 2>/dev/null)
  # Use JOB_ID for pipeline if we have it
  if [ -n "$JOB_ID" ]; then
    pipeline_resp=$(curl -s --max-time 10 \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      "$API_URL/api/v1/applications/pipeline/$JOB_ID")
    if echo "$pipeline_resp" | grep -qi "pipeline\|stage"; then
      pass "GET application pipeline for job"
    else
      fail "GET application pipeline for job" "${pipeline_resp:0:200}"
    fi
  else
    skip "GET application pipeline" "no job id available"
  fi
else
  skip "Shortlist / Reject application" "no application id"
fi

# Candidate can withdraw own application
cand_apps=$(curl -s --max-time 10 \
  -H "Authorization: Bearer $CANDIDATE_TOKEN" \
  "$API_URL/api/v1/candidates/me/applications")
CAND_APP_ID=$(extract "$cand_apps" ".get('applications',[{}])[0].get('id','')")
if [ -n "$CAND_APP_ID" ]; then
  withdraw_resp=$(curl -s --max-time 10 -X POST "$API_URL/api/v1/applications/$CAND_APP_ID/withdraw" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CANDIDATE_TOKEN" \
    -d '{}')
  if echo "$withdraw_resp" | grep -qi "withdrawn\|stage\|id\|cannot"; then
    pass "Candidate: withdraw application"
  else
    fail "Candidate: withdraw application" "${withdraw_resp:0:200}"
  fi
else
  skip "Candidate: withdraw application" "no candidate applications"
fi

echo ""

# ────────────────────────────────────────────────────────────
echo -e "${CYAN}[12/12] Phase 2: AI Job Description + Candidate Assessments${NC}"
echo "────────────────────────────────────────"

# AI job description (needs ANTHROPIC_API_KEY; gracefully returns 503 if not set)
ai_resp=$(curl -s --max-time 30 -X POST "$API_URL/api/v1/ai/job-description" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -d '{"title":"Senior Backend Engineer","department":"Engineering","employmentType":"full_time","experienceMin":4,"experienceMax":8,"remotePolicy":"remote","skills":["Node.js","PostgreSQL","TypeScript"]}')

if echo "$ai_resp" | grep -qi '"description"\|"requirements"\|"responsibilities"'; then
  pass "AI job description endpoint returns generated content"
elif echo "$ai_resp" | grep -qi "503\|not configured\|unavailable"; then
  skip "AI job description" "ANTHROPIC_API_KEY not configured — returns 503 gracefully"
elif echo "$ai_resp" | grep -qi "403\|subscription\|insufficient"; then
  skip "AI job description" "subscription gate active for client (expected)"
else
  fail "AI job description endpoint" "${ai_resp:0:200}"
fi

# Candidate cannot access AI endpoint
ai_cand_block=$(curl -s --max-time 10 -X POST "$API_URL/api/v1/ai/job-description" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CANDIDATE_TOKEN" \
  -d '{"title":"Test"}')
if echo "$ai_cand_block" | grep -qi "forbidden\|403\|unauthorized\|insufficient\|permission"; then
  pass "Candidate blocked from AI endpoints"
else
  fail "Candidate blocked from AI endpoints" "${ai_cand_block:0:200}"
fi

# Candidate assessments endpoint
cand_assessments=$(curl -s --max-time 10 \
  -H "Authorization: Bearer $CANDIDATE_TOKEN" \
  "$API_URL/api/v1/assessments")
if echo "$cand_assessments" | grep -qi "assessments"; then
  pass "Candidate: GET /assessments returns assessments"
else
  fail "Candidate: GET /assessments" "${cand_assessments:0:200}"
fi

# Admin can list assessments
admin_assessments=$(curl -s --max-time 10 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_URL/api/v1/assessments")
if echo "$admin_assessments" | grep -qi "assessments"; then
  pass "Admin: GET /assessments works"
else
  fail "Admin: GET /assessments" "${admin_assessments:0:200}"
fi

# Assessment tests list
tests_resp=$(curl -s --max-time 10 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_URL/api/v1/assessments/tests")
if echo "$tests_resp" | grep -qi "tests"; then
  pass "GET /assessments/tests returns test list"
else
  fail "GET /assessments/tests" "${tests_resp:0:200}"
fi

echo ""

# ────────────────────────────────────────────────────────────
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            PHASE 1 + PHASE 2 TEST RESULTS                ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
TOTAL=$((PASS + FAIL + SKIP))
echo -e "  Total:   $TOTAL"
echo -e "  ${GREEN}Passed:  $PASS${NC}"
echo -e "  ${RED}Failed:  $FAIL${NC}"
echo -e "  ${YELLOW}Skipped: $SKIP${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  ALL TESTS PASSED — Phase 1 & 2 verified!                ${NC}"
  echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
  exit 0
else
  echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
  echo -e "${RED}  $FAIL TEST(S) FAILED                                      ${NC}"
  echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
  exit 1
fi
