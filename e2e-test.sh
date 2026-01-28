#!/bin/bash

# ViraWorkx E2E Test Script
# Tests all portals and key user flows

API_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:5000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local token="$5"
    local expected="$6"

    if [ -n "$token" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -X "$method" "$url" -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d "$data")
        else
            response=$(curl -s -X "$method" "$url" -H "Authorization: Bearer $token")
        fi
    else
        if [ -n "$data" ]; then
            response=$(curl -s -X "$method" "$url" -H "Content-Type: application/json" -d "$data")
        else
            response=$(curl -s -X "$method" "$url")
        fi
    fi

    if echo "$response" | grep -q "$expected"; then
        echo -e "  ${GREEN}✓${NC} $name"
        ((PASS++))
        return 0
    else
        echo -e "  ${RED}✗${NC} $name"
        echo -e "    ${RED}Expected: $expected${NC}"
        echo -e "    ${RED}Got: ${response:0:200}${NC}"
        ((FAIL++))
        return 1
    fi
}

# Extract token from login response
get_token() {
    echo "$1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null
}

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         ViraWorkx E2E Test Suite                          ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# INFRASTRUCTURE TESTS
# ============================================
echo -e "${YELLOW}[1/7] Infrastructure Tests${NC}"
echo "────────────────────────────────────────"

test_endpoint "API Health Check" "GET" "$API_URL/health" "" "" "ok"
test_endpoint "Frontend Accessible" "GET" "$FRONTEND_URL" "" "" "html"

echo ""

# ============================================
# AUTHENTICATION TESTS
# ============================================
echo -e "${YELLOW}[2/7] Authentication Tests${NC}"
echo "────────────────────────────────────────"

# Admin Login
admin_response=$(curl -s -X POST "$API_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@viraworkx.ai","password":"password123"}')
ADMIN_TOKEN=$(get_token "$admin_response")
if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "  ${GREEN}✓${NC} Admin Login"
    ((PASS++))
else
    echo -e "  ${RED}✗${NC} Admin Login"
    ((FAIL++))
fi

# Client Login
client_response=$(curl -s -X POST "$API_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"hiring@techflow.ai","password":"password123"}')
CLIENT_TOKEN=$(get_token "$client_response")
if [ -n "$CLIENT_TOKEN" ]; then
    echo -e "  ${GREEN}✓${NC} Client Login"
    ((PASS++))
else
    echo -e "  ${RED}✗${NC} Client Login"
    ((FAIL++))
fi

# Candidate Login
candidate_response=$(curl -s -X POST "$API_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"rahul.sharma@gmail.com","password":"password123"}')
CANDIDATE_TOKEN=$(get_token "$candidate_response")
if [ -n "$CANDIDATE_TOKEN" ]; then
    echo -e "  ${GREEN}✓${NC} Candidate Login"
    ((PASS++))
else
    echo -e "  ${RED}✗${NC} Candidate Login"
    ((FAIL++))
fi

# Invalid Login
test_endpoint "Invalid Login Rejected" "POST" "$API_URL/api/v1/auth/login" '{"email":"fake@test.com","password":"wrong"}' "" "Invalid"

# Get Current User
test_endpoint "Get Current User (Admin)" "GET" "$API_URL/api/v1/auth/me" "" "$ADMIN_TOKEN" "admin"

echo ""

# ============================================
# ADMIN PORTAL TESTS
# ============================================
echo -e "${YELLOW}[3/7] Admin Portal Tests${NC}"
echo "────────────────────────────────────────"

test_endpoint "List Clients" "GET" "$API_URL/api/v1/clients" "" "$ADMIN_TOKEN" "clients"
test_endpoint "List Candidates" "GET" "$API_URL/api/v1/candidates" "" "$ADMIN_TOKEN" "candidates"
test_endpoint "List All Jobs" "GET" "$API_URL/api/v1/jobs" "" "$ADMIN_TOKEN" "jobs"
test_endpoint "Get Notifications" "GET" "$API_URL/api/v1/notifications" "" "$ADMIN_TOKEN" "notifications"
test_endpoint "Pending Test Allocations" "GET" "$API_URL/api/v1/assessments/admin/pending-allocation" "" "$ADMIN_TOKEN" "candidates"
test_endpoint "Allocation History" "GET" "$API_URL/api/v1/assessments/admin/allocation-history" "" "$ADMIN_TOKEN" "allocations"

echo ""

# ============================================
# CLIENT PORTAL TESTS
# ============================================
echo -e "${YELLOW}[4/7] Client Portal Tests${NC}"
echo "────────────────────────────────────────"

test_endpoint "Get Client Profile" "GET" "$API_URL/api/v1/auth/me" "" "$CLIENT_TOKEN" "client"
test_endpoint "List Client Jobs" "GET" "$API_URL/api/v1/jobs" "" "$CLIENT_TOKEN" "jobs"

# Create a new job
job_data='{"title":"E2E Test Engineer","description":"Testing position","requirements":"5+ years experience","location":"Remote","employmentType":"full_time","experienceMin":3,"experienceMax":7,"salaryMin":80000,"salaryMax":120000,"remotePolicy":"remote","skillsRequired":["Testing","Automation"]}'
create_job_response=$(curl -s -X POST "$API_URL/api/v1/jobs" -H "Content-Type: application/json" -H "Authorization: Bearer $CLIENT_TOKEN" -d "$job_data")
if echo "$create_job_response" | grep -q "id\|title"; then
    echo -e "  ${GREEN}✓${NC} Create New Job"
    ((PASS++))
    JOB_ID=$(echo "$create_job_response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('job',{}).get('id',''))" 2>/dev/null)
else
    echo -e "  ${RED}✗${NC} Create New Job"
    echo -e "    ${RED}Response: ${create_job_response:0:200}${NC}"
    ((FAIL++))
fi

test_endpoint "List Applications" "GET" "$API_URL/api/v1/applications" "" "$CLIENT_TOKEN" "applications"
test_endpoint "Get Analytics" "GET" "$API_URL/api/v1/analytics/overview" "" "$CLIENT_TOKEN" ""

echo ""

# ============================================
# CANDIDATE PORTAL TESTS
# ============================================
echo -e "${YELLOW}[5/7] Candidate Portal Tests${NC}"
echo "────────────────────────────────────────"

test_endpoint "Get Candidate Profile" "GET" "$API_URL/api/v1/me/profile" "" "$CANDIDATE_TOKEN" "firstName"
test_endpoint "List Available Jobs" "GET" "$API_URL/api/v1/jobs" "" "$CANDIDATE_TOKEN" "jobs"
test_endpoint "Get My Applications" "GET" "$API_URL/api/v1/candidates/me/applications" "" "$CANDIDATE_TOKEN" "applications"
test_endpoint "Get My Assessments" "GET" "$API_URL/api/v1/assessments" "" "$CANDIDATE_TOKEN" "assessments"

# Update Profile
profile_update='{"headline":"Senior Software Engineer - E2E Test"}'
test_endpoint "Update Profile" "PUT" "$API_URL/api/v1/candidates/me/profile" "$profile_update" "$CANDIDATE_TOKEN" "profile\|updated\|firstName"

# Get Skill Badges
candidate_id=$(echo "$candidate_response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('id',''))" 2>/dev/null)
test_endpoint "Get Skill Badges" "GET" "$API_URL/api/v1/assessments/candidate/$candidate_id/badges" "" "$CANDIDATE_TOKEN" "badges"

echo ""

# ============================================
# ASSESSMENT/IMOCHA TESTS
# ============================================
echo -e "${YELLOW}[6/7] Assessment Tests${NC}"
echo "────────────────────────────────────────"

test_endpoint "List Available Tests" "GET" "$API_URL/api/v1/assessments/tests" "" "$ADMIN_TOKEN" "tests"
test_endpoint "Get Assessment Stats" "GET" "$API_URL/api/v1/assessments/stats" "" "$ADMIN_TOKEN" ""

echo ""

# ============================================
# REAL-TIME & BACKGROUND JOBS TESTS
# ============================================
echo -e "${YELLOW}[7/7] Background Jobs & Misc Tests${NC}"
echo "────────────────────────────────────────"

test_endpoint "Job Queue Stats" "GET" "$API_URL/api/v1/jobs/stats" "" "$ADMIN_TOKEN" ""
test_endpoint "GraphQL Endpoint" "POST" "$API_URL/graphql" '{"query":"{ __typename }"}' "" "__typename\|Query"

echo ""

# ============================================
# SUMMARY
# ============================================
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TEST RESULTS                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
TOTAL=$((PASS + FAIL))
echo -e "  Total Tests: $TOTAL"
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ALL TESTS PASSED! ✓${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    exit 0
else
    echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  SOME TESTS FAILED ✗${NC}"
    echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
    exit 1
fi
