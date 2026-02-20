"""
ViraWorkx Portal - Full E2E Checklist
Runs against live production Cloud Run deployment.
Includes delays between auth calls to respect rate limiting.
"""
import httpx
import json
import time
import sys
from datetime import datetime

WEB_URL  = "https://viraworkx-web-668077541916.us-central1.run.app"
API_URL  = "https://viraworkx-api-668077541916.us-central1.run.app"
AI_URL   = f"{WEB_URL}/api/ats/v1"

ADMIN_EMAIL     = "admin@viraworkx.ai"
CLIENT_EMAIL    = "client@acmestartup.com"
CANDIDATE_EMAIL = "candidate@viraworkx.ai"
PASSWORD        = "Viraworkx2025%$%"

TS = int(time.time())
NEW_CANDIDATE_EMAIL = f"test_cand_{TS}@example.com"
NEW_CLIENT_EMAIL    = f"test_client_{TS}@example.com"

results  = []
failures = []
bugs     = []

# Minimum interval between any two HTTP calls (avoids urllib3 keep-alive
# reuse on connections Cloud Run closes after 4xx responses).
MIN_CALL_INTERVAL = 1.5
_last_call_time   = 0.0

def test(name, passed, detail="", is_bug=False):
    passed = bool(passed)
    icon   = "✅" if passed else "❌"
    status = "PASS" if passed else "FAIL"
    line   = f"  {icon} {status} | {name}"
    if detail:
        line += f"  [{detail}]"
    if not passed and is_bug:
        line += "  ⚠️  BUG"
    print(line)
    sys.stdout.flush()
    results.append(passed)
    if not passed:
        tag = " [BUG]" if is_bug else ""
        failures.append(f"{name}{tag} — {detail}")
        if is_bug:
            bugs.append(f"{name} — {detail}")

def section(title):
    print(f"\n{'='*65}")
    print(f"  {title}")
    print(f"{'='*65}")
    sys.stdout.flush()

def _req(method, url, payload=None, headers=None, timeout=20, pause=0):
    """Make HTTP request using httpx with HTTP/2.

    Cloud Run's load balancer uses HTTP/2. Python's `requests` library only
    speaks HTTP/1.1, which causes connection errors on 4xx responses because
    urllib3 tries to reuse a connection that Cloud Run has already closed.
    httpx with HTTP/2 support avoids this entirely — each stream is independent
    and the connection is properly multiplexed.

    MIN_CALL_INTERVAL still enforces a minimum gap to avoid hitting any
    server-side per-IP rate limits.
    """
    global _last_call_time
    now  = time.time()
    wait = max(pause, MIN_CALL_INTERVAL - (now - _last_call_time))
    if wait > 0:
        time.sleep(wait)
    _last_call_time = time.time()

    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)

    t0 = time.time()
    try:
        with httpx.Client(http2=True, timeout=timeout) as client:
            r = client.request(method, url, json=payload, headers=h)
        return r, round(time.time() - t0, 2)
    except Exception:
        return None, round(time.time() - t0, 2)

def post(url, payload=None, headers=None, pause=0):
    return _req("POST", url, payload, headers, pause=pause)

def get(url, headers=None, pause=0):
    return _req("GET", url, headers=headers, pause=pause)

def put(url, payload=None, headers=None, pause=0):
    return _req("PUT", url, payload, headers, pause=pause)

def auth_header(token):
    return {"Authorization": f"Bearer {token}"}

def status_of(r):
    return r.status_code if r else "ERR(connection)"

# ─────────────────────────────────────────────────────────────
print(f"\n🚀 ViraWorkx Portal — Full E2E Checklist")
print(f"   Started:  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"   API:      {API_URL}")
print(f"   AI:       {AI_URL}")
print(f"   Note:     ≥{MIN_CALL_INTERVAL}s between every call + Connection:close to avoid keep-alive reuse")

# ─────────────────────────────────────────────────────────────
# SECTION 1: Authentication & Registration
# ─────────────────────────────────────────────────────────────
section("SECTION 1: Authentication & Registration")

# 1.1 — Three valid logins (space them out)
r, t = post(f"{API_URL}/api/v1/auth/login", {"email": CANDIDATE_EMAIL, "password": PASSWORD})
candidate_token = refresh_token = None
candidate_user_id = candidate_profile_id = None
if r and r.status_code == 200:
    d = r.json()
    candidate_token  = d.get("accessToken")
    refresh_token    = d.get("refreshToken")
    candidate_user_id = d.get("user", {}).get("id")
    test("Login as candidate", True, f"200 token={'ok' if candidate_token else 'missing'} {t}s")
else:
    test("Login as candidate", False, f"status={status_of(r)} {t}s")

r, t = post(f"{API_URL}/api/v1/auth/login", {"email": CLIENT_EMAIL, "password": PASSWORD}, pause=1.5)
client_token = None
if r and r.status_code == 200:
    d = r.json()
    client_token = d.get("accessToken")
    test("Login as client", True, f"200 token={'ok' if client_token else 'missing'} {t}s")
else:
    test("Login as client", False, f"status={status_of(r)} {t}s")

r, t = post(f"{API_URL}/api/v1/auth/login", {"email": ADMIN_EMAIL, "password": PASSWORD}, pause=1.5)
admin_token = None
if r and r.status_code == 200:
    d = r.json()
    admin_token = d.get("accessToken")
    test("Login as admin", True, f"200 token={'ok' if admin_token else 'missing'} {t}s")
else:
    test("Login as admin", False, f"status={status_of(r)} {t}s")

# 1.2 — Wrong credentials (space them out to avoid rate limit)
r, t = post(f"{API_URL}/api/v1/auth/login", {"email": CANDIDATE_EMAIL, "password": "wrongpass"}, pause=2)
test("Wrong password → 401", r and r.status_code == 401, f"status={status_of(r)} {t}s")

r, t = post(f"{API_URL}/api/v1/auth/login", {"email": "ghost@nowhere.com", "password": PASSWORD}, pause=2)
test("Non-existent email → 401", r and r.status_code == 401, f"status={status_of(r)} {t}s")

# 1.3 — Registration validation (use /register, not /login — different rate limit bucket)
r, t = post(f"{API_URL}/api/v1/auth/register", {
    "email": NEW_CANDIDATE_EMAIL, "password": "Pass1234",
    "userType": "candidate", "lastName": "User"  # missing firstName
}, pause=1)
test("Register: missing firstName → 400/422",
     r and r.status_code in (400, 422), f"status={status_of(r)} {t}s")

r, t = post(f"{API_URL}/api/v1/auth/register", {
    "email": NEW_CLIENT_EMAIL, "password": "Pass1234",
    "userType": "client"  # missing companyName
}, pause=1)
test("Register: missing companyName → 400/422",
     r and r.status_code in (400, 422), f"status={status_of(r)} {t}s")

r, t = post(f"{API_URL}/api/v1/auth/register", {
    "email": "bad-email", "password": "Pass1234",
    "userType": "candidate", "firstName": "T", "lastName": "U"
}, pause=1)
test("Register: invalid email → 400/422",
     r and r.status_code in (400, 422), f"status={status_of(r)} {t}s")

r, t = post(f"{API_URL}/api/v1/auth/register", {
    "email": NEW_CANDIDATE_EMAIL, "password": "short",
    "userType": "candidate", "firstName": "T", "lastName": "U"
}, pause=1)
test("Register: short password → 400/422",
     r and r.status_code in (400, 422), f"status={status_of(r)} {t}s")

# 1.4 — Valid registration
r, t = post(f"{API_URL}/api/v1/auth/register", {
    "email": NEW_CANDIDATE_EMAIL, "password": "TestPass123!",
    "userType": "candidate", "firstName": "Test", "lastName": "User"
}, pause=1)
new_cand_token = None
if r and r.status_code == 201:
    new_cand_token = r.json().get("accessToken")
    test("Register new candidate → 201", True, f"{NEW_CANDIDATE_EMAIL} {t}s")
else:
    body = r.json() if r else {}
    test("Register new candidate → 201", False, f"status={status_of(r)} {body} {t}s")

# 1.5 — Duplicate registration
r, t = post(f"{API_URL}/api/v1/auth/register", {
    "email": NEW_CANDIDATE_EMAIL, "password": "TestPass123!",
    "userType": "candidate", "firstName": "Test", "lastName": "User"
}, pause=1)
test("Duplicate email → 400/409",
     r and r.status_code in (400, 409), f"status={status_of(r)} {t}s")

# 1.6 — /auth/me variations
r, t = get(f"{API_URL}/api/v1/auth/me",
           headers=auth_header(candidate_token) if candidate_token else {})
if r and r.status_code == 200:
    me_email = r.json().get("user", {}).get("email", "?")
    test("/auth/me valid token → 200", True, f"email={me_email} {t}s")
else:
    test("/auth/me valid token → 200", False, f"status={status_of(r)} {t}s")

r, t = get(f"{API_URL}/api/v1/auth/me", pause=1)
test("/auth/me no token → 401", r and r.status_code == 401, f"status={status_of(r)} {t}s")

if candidate_token:
    tampered = candidate_token[:-5] + "XXXXX"
    r, t = get(f"{API_URL}/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered}"}, pause=1)
    test("/auth/me tampered token → 401 (not 403)",
         r and r.status_code == 401, f"status={status_of(r)} {t}s")

    r, t = get(f"{API_URL}/api/v1/auth/me", headers={"Authorization": "Bearer garbage.xyz.def"}, pause=1)
    test("/auth/me garbage token → 401 (not 403)",
         r and r.status_code == 401, f"status={status_of(r)} {t}s")

# 1.7 — Token refresh
if refresh_token:
    r, t = post(f"{API_URL}/api/v1/auth/refresh", {"refreshToken": refresh_token}, pause=1)
    ok = r and r.status_code == 200 and r.json().get("accessToken")
    test("POST /auth/refresh → 200 new accessToken", bool(ok), f"status={status_of(r)} {t}s")
else:
    test("POST /auth/refresh → 200 new accessToken", False, "No refresh token")

# ─────────────────────────────────────────────────────────────
# SECTION 2: Candidate Portal
# ─────────────────────────────────────────────────────────────
section("SECTION 2: Candidate Portal")

# Lookup candidate profile ID (admin sees all, profile has 'email' at top level)
if admin_token:
    r, _ = get(f"{API_URL}/api/v1/candidates", headers=auth_header(admin_token))
    if r and r.status_code == 200:
        d = r.json()
        cands_list = d.get("candidates", d if isinstance(d, list) else [])
        for c in (cands_list if isinstance(cands_list, list) else []):
            if c.get("email") == CANDIDATE_EMAIL:
                candidate_profile_id = c.get("id")
                break
        print(f"         Resolved candidate profile ID: {candidate_profile_id}")

# 2.1 Own profile
if candidate_token and candidate_profile_id:
    r, t = get(f"{API_URL}/api/v1/candidates/{candidate_profile_id}",
               headers=auth_header(candidate_token))
    test("GET own candidate profile → 200",
         r and r.status_code == 200, f"status={status_of(r)} {t}s")
else:
    test("GET own candidate profile → 200", False,
         f"profile_id={'not found' if admin_token else 'no admin token'}")

# 2.2 Own applications
if candidate_token:
    r, t = get(f"{API_URL}/api/v1/candidates/me/applications",
               headers=auth_header(candidate_token))
    test("GET /candidates/me/applications → 200",
         r and r.status_code == 200, f"status={status_of(r)} {t}s")
else:
    test("GET /candidates/me/applications → 200", False, "No candidate token")

# 2.3 Public jobs listing
r, t = get(f"{API_URL}/api/v1/jobs")
job_id = None
if r and r.status_code == 200:
    d = r.json()
    jobs = d.get("jobs", d if isinstance(d, list) else [])
    active = [j for j in jobs if j.get("status") == "active"]
    job_id = (active[0] if active else jobs[0]).get("id") if jobs else None
    test("GET /jobs (public listing) → 200", True, f"total={len(jobs)} active={len(active)} {t}s")
else:
    test("GET /jobs (public listing) → 200", False, f"status={status_of(r)} {t}s")

# 2.4 Job detail
if job_id:
    r, t = get(f"{API_URL}/api/v1/jobs/{job_id}")
    test("GET /jobs/:id (detail) → 200",
         r and r.status_code == 200, f"status={status_of(r)} {t}s")
else:
    test("GET /jobs/:id (detail) → 200", False, "No job_id")

# 2.5 Apply to job
if candidate_token and job_id:
    r, t = post(f"{API_URL}/api/v1/jobs/{job_id}/apply",
                payload={"coverLetter": "I am very interested in this role."},
                headers=auth_header(candidate_token))
    test("POST /jobs/:id/apply → 201 or 409",
         r and r.status_code in (201, 409), f"status={status_of(r)} {t}s")
    if r:
        print(f"         {'(new application)' if r.status_code == 201 else '(already applied — correct)'}")
else:
    test("POST /jobs/:id/apply → 201 or 409", False, "No token or job_id")

# 2.6 Applications list (candidate view)
if candidate_token:
    r, t = get(f"{API_URL}/api/v1/applications", headers=auth_header(candidate_token))
    test("GET /applications (candidate view) → 200",
         r and r.status_code == 200, f"status={status_of(r)} {t}s")
    if r and r.status_code == 200:
        d = r.json()
        apps = d.get("applications", d if isinstance(d, list) else [])
        print(f"         Candidate's applications: {len(apps) if isinstance(apps, list) else '?'}")
else:
    test("GET /applications (candidate view) → 200", False, "No candidate token")

# 2.7 AI job matches (route is /me/job-matches, not /:id/job-matches)
if candidate_token:
    r, t = get(f"{API_URL}/api/v1/candidates/me/job-matches",
               headers=auth_header(candidate_token))
    test("GET /candidates/me/job-matches → 200",
         r and r.status_code == 200, f"status={status_of(r)} {t}s")
else:
    test("GET /candidates/me/job-matches → 200", False, "No candidate token")

# ─────────────────────────────────────────────────────────────
# SECTION 3: Client Portal
# ─────────────────────────────────────────────────────────────
section("SECTION 3: Client Portal")

# 3.1 Client jobs list
if client_token:
    r, t = get(f"{API_URL}/api/v1/jobs", headers=auth_header(client_token))
    test("GET /jobs (client view) → 200",
         r and r.status_code == 200, f"status={status_of(r)} {t}s")
else:
    test("GET /jobs (client view) → 200", False, "No client token")

# 3.2 Create job
created_job_id = client_profile_id = None
if client_token:
    r, t = post(f"{API_URL}/api/v1/jobs", payload={
        "title": f"Senior Backend Engineer {TS}",
        "description": "Looking for a backend engineer with strong Python/Go skills.",
        "requirements": "5+ years backend, Python or Go, REST APIs",
        "department": "Engineering",
        "employmentType": "contractor",
        "experienceMin": 3,
        "experienceMax": 8,
        "salaryMin": 80000,
        "salaryMax": 120000,
        "salaryCurrency": "USD",
        "location": "Remote, India",
        "remotePolicy": "remote",
        "skillsRequired": ["Python", "PostgreSQL", "REST APIs"],
        "skillsPreferred": ["Go", "Redis", "Docker"],
    }, headers=auth_header(client_token))
    if r and r.status_code == 201:
        d = r.json()
        job_obj = d.get("job", d)
        if isinstance(job_obj, dict):
            created_job_id  = job_obj.get("id")
            client_profile_id = job_obj.get("clientId")
        test("POST /jobs (create) → 201", True, f"id={created_job_id} {t}s")
    else:
        body = r.json() if r else {}
        test("POST /jobs (create) → 201", False, f"status={status_of(r)} {body} {t}s")
else:
    test("POST /jobs (create) → 201", False, "No client token")

# 3.3 Get job by ID
if client_token and created_job_id:
    r, t = get(f"{API_URL}/api/v1/jobs/{created_job_id}", headers=auth_header(client_token))
    test("GET /jobs/:id (created) → 200",
         r and r.status_code == 200, f"status={status_of(r)} {t}s")
else:
    test("GET /jobs/:id (created) → 200", False, "No created_job_id")

# 3.4 Edit job
if client_token and created_job_id:
    r, t = put(f"{API_URL}/api/v1/jobs/{created_job_id}", payload={
        "title": f"Senior Backend Engineer (Updated) {TS}",
        "description": "Updated: expanded scope to include Go and Python."
    }, headers=auth_header(client_token))
    test("PUT /jobs/:id (edit) → 200",
         r and r.status_code == 200, f"status={status_of(r)} {t}s")
else:
    test("PUT /jobs/:id (edit) → 200", False, "No created_job_id")

# 3.5 Publish job
if client_token and created_job_id:
    r, t = post(f"{API_URL}/api/v1/jobs/{created_job_id}/publish",
                headers=auth_header(client_token))
    pub_ok = r and r.status_code == 200
    test("POST /jobs/:id/publish → 200", pub_ok, f"status={status_of(r)} {t}s")
    if pub_ok:
        d = r.json()
        job_obj = d.get("job", d)
        job_status = job_obj.get("status", "?") if isinstance(job_obj, dict) else "?"
        test("Published job status = active", job_status == "active", f"status={job_status}")
    else:
        test("Published job status = active", False, "Publish failed")
else:
    test("POST /jobs/:id/publish → 200", False, "No created_job_id")
    test("Published job status = active", False, "No created_job_id")

# 3.6 Job pipeline (applications list)
target_job = created_job_id or job_id
if client_token and target_job:
    r, t = get(f"{API_URL}/api/v1/jobs/{target_job}/applications",
               headers=auth_header(client_token))
    test("GET /jobs/:id/applications (pipeline) → 200",
         r and r.status_code == 200, f"status={status_of(r)} {t}s")
    if r and r.status_code == 200:
        apps_d = r.json()
        apps_list = apps_d.get("applications", apps_d if isinstance(apps_d, list) else [])
        print(f"         Applications in pipeline: {len(apps_list) if isinstance(apps_list, list) else '?'}")
else:
    test("GET /jobs/:id/applications (pipeline) → 200", False, "No token or job_id")

# 3.7 Client profile
# Try to get client_profile_id from jobs list if not already set
if not client_profile_id and client_token:
    r2, _ = get(f"{API_URL}/api/v1/jobs", headers=auth_header(client_token))
    if r2 and r2.status_code == 200:
        d = r2.json()
        jobs_list = d.get("jobs", d if isinstance(d, list) else [])
        for j in jobs_list:
            if j.get("clientId"):
                client_profile_id = j.get("clientId")
                break

if client_token and client_profile_id:
    r, t = get(f"{API_URL}/api/v1/clients/{client_profile_id}",
               headers=auth_header(client_token))
    test("GET /clients/:id → 200 (not 'Client not found')",
         r and r.status_code == 200, f"status={status_of(r)} {t}s")

    r, t = get(f"{API_URL}/api/v1/clients/{client_profile_id}/users",
               headers=auth_header(client_token))
    test("GET /clients/:id/users → 200",
         r and r.status_code == 200, f"status={status_of(r)} {t}s")
else:
    test("GET /clients/:id → 200", False,
         "client_id not found in any job (clientId field missing?)" if client_token else "No client token")
    test("GET /clients/:id/users → 200", False, "No client_profile_id")

# 3.8 iMocha test list
if client_token:
    r, t = get(f"{API_URL}/api/v1/assessments/tests", headers=auth_header(client_token))
    test("GET /assessments/tests (iMocha list) → 200",
         r and r.status_code == 200, f"status={status_of(r)} {t}s")
else:
    test("GET /assessments/tests → 200", False, "No client token")

# 3.9 Interviews
if client_token:
    r, t = get(f"{API_URL}/api/v1/interviews", headers=auth_header(client_token))
    test("GET /interviews (client) → 200",
         r and r.status_code == 200, f"status={status_of(r)} {t}s")
else:
    test("GET /interviews → 200", False, "No client token")

# ─────────────────────────────────────────────────────────────
# SECTION 4: Admin Portal
# ─────────────────────────────────────────────────────────────
section("SECTION 4: Admin Portal")

if admin_token:
    r, t = get(f"{API_URL}/api/v1/candidates", headers=auth_header(admin_token))
    test("GET /candidates (admin) → 200", r and r.status_code == 200, f"status={status_of(r)} {t}s")
    if r and r.status_code == 200:
        d = r.json()
        c = d.get("candidates", d if isinstance(d, list) else [])
        print(f"         Total candidates in system: {len(c) if isinstance(c, list) else '?'}")

    r, t = get(f"{API_URL}/api/v1/applications", headers=auth_header(admin_token))
    test("GET /applications (admin) → 200", r and r.status_code == 200, f"status={status_of(r)} {t}s")
    if r and r.status_code == 200:
        d = r.json()
        a = d.get("applications", d if isinstance(d, list) else [])
        print(f"         Total applications in system: {len(a) if isinstance(a, list) else '?'}")

    r, t = get(f"{API_URL}/api/v1/jobs", headers=auth_header(admin_token))
    test("GET /jobs (admin, all) → 200", r and r.status_code == 200, f"status={status_of(r)} {t}s")
    if r and r.status_code == 200:
        d = r.json()
        j = d.get("jobs", d if isinstance(d, list) else [])
        print(f"         Total jobs in system: {len(j) if isinstance(j, list) else '?'}")

    r, t = get(f"{API_URL}/api/v1/analytics/overview", headers=auth_header(admin_token))
    test("GET /analytics/overview → 200", r and r.status_code == 200, f"status={status_of(r)} {t}s")
else:
    for n in ["GET /candidates (admin)", "GET /applications (admin)",
              "GET /jobs (admin)", "GET /analytics/overview"]:
        test(n, False, "No admin token")

# ─────────────────────────────────────────────────────────────
# SECTION 5: AI Engine
# ─────────────────────────────────────────────────────────────
section("SECTION 5: AI Engine (via /api/ats/v1)")

r, t = get(f"{AI_URL}/health")
if not r or r.status_code == 404:
    r, t = get(f"{WEB_URL}/api/ats/health")
test("GET AI Engine /health → 200", r and r.status_code == 200, f"status={status_of(r)} {t}s")

r, t = get(f"{AI_URL}/actions")
test("GET /actions (audit log) → 200", r and r.status_code == 200, f"status={status_of(r)} {t}s")
if r and r.status_code == 200:
    d = r.json()
    total = d.get("total", len(d.get("actions", [])))
    print(f"         AI actions logged: {total}")

r, t = get(f"{AI_URL}/actions/stats")
test("GET /actions/stats → 200", r and r.status_code == 200, f"status={status_of(r)} {t}s")
if r and r.status_code == 200:
    s = r.json().get("stats", r.json())
    print(f"         total={s.get('total_actions','?')} pending={s.get('pending_approvals','?')} avg_score={s.get('average_match_score','?')}")

r, t = get(f"{AI_URL}/actions/pending-approval")
test("GET /actions/pending-approval → 200", r and r.status_code == 200, f"status={status_of(r)} {t}s")
if r and r.status_code == 200:
    print(f"         Pending approvals: {len(r.json().get('actions', []))}")

# ─────────────────────────────────────────────────────────────
# SECTION 6: Security & Role Isolation
# ─────────────────────────────────────────────────────────────
section("SECTION 6: Security & Role Isolation")

# 6.1 Candidate should NOT see all candidates
if candidate_token:
    r, t = get(f"{API_URL}/api/v1/candidates", headers=auth_header(candidate_token))
    if r and r.status_code == 200:
        d = r.json()
        cands = d.get("candidates", d if isinstance(d, list) else [])
        count = len(cands) if isinstance(cands, list) else 0
        # Expected: 403 (forbidden) or returns only own profile (count ≤ 1)
        is_secure = count <= 1
        test("Candidate: /candidates → own-only or 403 (not all users)",
             is_secure, f"visible={count} candidates (expected ≤1)", is_bug=(not is_secure))
    else:
        test("Candidate: /candidates → 403 (admin-only route)",
             r and r.status_code == 403, f"status={status_of(r)} {t}s")
else:
    test("Candidate: /candidates → blocked", False, "No candidate token")

# 6.2 Client CAN source candidates (should get 200 with list, not 403)
if client_token:
    r, t = get(f"{API_URL}/api/v1/candidates", headers=auth_header(client_token))
    if r and r.status_code == 200:
        d = r.json()
        cands = d.get("candidates", d if isinstance(d, list) else [])
        count = len(cands) if isinstance(cands, list) else 0
        test("Client: /candidates → 200 (sourcing allowed)",
             True, f"visible={count} candidates {t}s")
    else:
        # 403 would be a bug — clients need to source candidates
        test("Client: /candidates → 200 (sourcing allowed)",
             False, f"status={status_of(r)} {t}s", is_bug=True)
else:
    test("Client: /candidates → sourcing allowed", False, "No client token")

# 6.3 No token on protected routes
r, t = get(f"{API_URL}/api/v1/applications", pause=1)
test("No token → 401 on /applications",
     r and r.status_code == 401, f"status={status_of(r)} {t}s")

r, t = get(f"{API_URL}/api/v1/candidates", pause=1)
test("No token → 401 on /candidates",
     r and r.status_code == 401, f"status={status_of(r)} {t}s")

# 6.4 Tampered token → 401 (not 403)
if candidate_token:
    tampered = candidate_token[:-5] + "ZZZZZ"
    r, t = get(f"{API_URL}/api/v1/applications",
               headers={"Authorization": f"Bearer {tampered}"}, pause=1)
    test("Tampered token → 401 (not 403)",
         r and r.status_code == 401, f"status={status_of(r)} {t}s")

# 6.5 Malformed header
r, t = get(f"{API_URL}/api/v1/auth/me",
           headers={"Authorization": "NotBearer sometoken"}, pause=1)
test("Malformed Auth header → 401",
     r and r.status_code == 401, f"status={status_of(r)} {t}s")

# 6.6 SQL injection
r, t = post(f"{API_URL}/api/v1/auth/login",
            {"email": "' OR '1'='1' --", "password": "x"}, pause=2)
test("SQL injection in login → 400/401/422 (not 500)",
     r and r.status_code in (400, 401, 422), f"status={status_of(r)} {t}s")

# 6.7 Candidate accessing client endpoints
if candidate_token and client_profile_id:
    r, t = get(f"{API_URL}/api/v1/clients/{client_profile_id}",
               headers=auth_header(candidate_token))
    test("Candidate cannot access /clients/:id → 401/403",
         r and r.status_code in (401, 403), f"status={status_of(r)} {t}s",
         is_bug=(r and r.status_code == 200))
elif candidate_token:
    test("Candidate cannot access /clients/:id", False, "No client_profile_id to test against")

# ─────────────────────────────────────────────────────────────
# SECTION 7: Cross-Cutting Concerns
# ─────────────────────────────────────────────────────────────
section("SECTION 7: Cross-Cutting Concerns")

# 7.1 Web frontend
r, t = get(WEB_URL)
is_html = r and r.status_code == 200 and "text/html" in r.headers.get("content-type", "")
test("Web frontend GET / → 200 HTML", is_html,
     f"status={status_of(r)} type={r.headers.get('content-type','?') if r else '?'} {t}s")

# 7.2 CORS headers (must include Origin header for CORS to respond)
ORIGIN = "https://viraworkx-web-668077541916.us-central1.run.app"
r, t = _req("GET", f"{API_URL}/api/v1/jobs", headers={"Origin": ORIGIN})
cors = r.headers.get("access-control-allow-origin", "") if r else ""
test("CORS: Access-Control-Allow-Origin header present (with Origin header)",
     bool(cors), f"value='{cors}'", is_bug=not bool(cors))

# 7.3 Response times
timing_checks = [
    (f"{API_URL}/api/v1/jobs",         None,                                              "/api/v1/jobs"),
    (f"{API_URL}/api/v1/auth/me",      auth_header(candidate_token) if candidate_token else None, "/api/v1/auth/me"),
    (f"{AI_URL}/actions/stats",        None,                                              "/api/ats/v1/actions/stats"),
    (WEB_URL,                          None,                                              "Web /"),
]
for ep, hdrs, label in timing_checks:
    r, t = get(ep, headers=hdrs)
    test(f"Response time < 5s: {label}", t < 5.0, f"{t}s")

# 7.4 404 for unknown routes
r, t = get(f"{API_URL}/api/v1/nonexistent-route", pause=1)
test("Unknown route → 404", r and r.status_code == 404, f"status={status_of(r)} {t}s")

# ─────────────────────────────────────────────────────────────
# FINAL SUMMARY
# ─────────────────────────────────────────────────────────────
total  = len(results)
passed = sum(results)
failed = total - passed
pct    = int(100 * passed / total) if total else 0

print(f"\n{'='*65}")
print(f"  RESULTS: {passed}/{total} PASSED ({pct}%)  |  {failed} FAILED")
print(f"{'='*65}")

if bugs:
    print(f"\n⚠️  BUGS REQUIRING FIXES ({len(bugs)}):")
    for i, b in enumerate(bugs, 1):
        print(f"   {i}. {b}")

other_failures = [f for f in failures if "[BUG]" not in f]
if other_failures:
    print(f"\n❌ OTHER FAILURES ({len(other_failures)}):")
    for i, f in enumerate(other_failures, 1):
        print(f"   {i}. {f}")

if not failures:
    print("\n🎉 ALL TESTS PASSED!")

print(f"\n   Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
