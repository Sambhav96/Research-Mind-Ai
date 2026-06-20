"""Auth flow verification test."""
from __future__ import annotations

import os
import sys
import traceback
import uuid
import httpx
from dotenv import load_dotenv

load_dotenv(".env")

BASE = os.getenv("BACKEND_URL", "http://localhost:8001")
NONCE = uuid.uuid4().hex[:8]
EMAIL = f"audit.{NONCE}@example.com"
PASSWORD = "audittest123"

results = []

def check(name, passed, detail=""):
    status = "PASS" if passed else "FAIL"
    msg = f"[{status}] {name}"
    if detail:
        msg += f" -> {detail}"
    print(msg)
    results.append((name, passed, detail))


def main():
    client = httpx.Client(base_url=BASE, timeout=15)

    # Step 1: register
    try:
        r = client.post("/auth/register", json={"email": EMAIL, "password": PASSWORD})
        check("POST /auth/register status 201", r.status_code == 201, str(r.status_code))
        reg = r.json()
        check("register has access_token", "access_token" in reg)
        check("register has refresh_token", "refresh_token" in reg)
        access = reg.get("access_token", "")
        refresh = reg.get("refresh_token", "")
    except Exception as exc:
        traceback.print_exc()
        check("register request failed", False, str(exc))
        return

    if not access or not refresh:
        return

    headers = {"Authorization": f"Bearer {access}"}

    # Step 2: login
    try:
        r = client.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})
        check("POST /auth/login status 200", r.status_code == 200)
        login = r.json()
        check("login returns tokens", "access_token" in login and "refresh_token" in login)
        access2 = login.get("access_token", "")
        refresh2 = login.get("refresh_token", "")
    except Exception as exc:
        traceback.print_exc()
        check("login request failed", False, str(exc))
        return

    headers2 = {"Authorization": f"Bearer {access2}"}

    # Step 3: current user
    try:
        r = client.get("/auth/me", headers=headers2)
        check("GET /auth/me status 200", r.status_code == 200)
        me = r.json()
        check("current user email matches", me.get("email", "").lower() == EMAIL.lower())
    except Exception as exc:
        traceback.print_exc()
        check("current user request failed", False, str(exc))
        return

    refresh_headers = {"Authorization": f"Bearer {refresh2}"}

    # Step 4: refresh (token goes in Authorization header, not body)
    try:
        r = client.post("/auth/refresh", headers=refresh_headers)
        check("POST /auth/refresh status 200", r.status_code == 200, str(r.status_code))
        ref = r.json()
        check("refresh returns new tokens", "access_token" in ref and "refresh_token" in ref, str(ref))
    except Exception as exc:
        traceback.print_exc()
        check("refresh request failed", False, str(exc))
        return

    new_refresh = ref.get("refresh_token", "")
    new_access = ref.get("access_token", "")
    headers3 = {"Authorization": f"Bearer {new_access or access2}"}

    # Step 5: logout (new refresh token from refresh response)
    try:
        r = client.post("/auth/logout",
                        headers=headers3,
                        params={"refresh_token": new_refresh or refresh2})
        check("POST /auth/logout status 200", r.status_code == 200, str(r.status_code))
    except Exception as exc:
        traceback.print_exc()
        check("logout request failed", False, str(exc))

    # Summary
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"\nAuth flow result: {passed}/{total} checks passed")
    if passed < total:
        print("FAILED CHECKS:")
        for name, ok, detail in results:
            if not ok:
                print(f"  - {name}: {detail}")
    else:
        print("ALL AUTH CHECKS PASSED")


if __name__ == "__main__":
    main()
