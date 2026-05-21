#!/usr/bin/env python3
"""
Auth Callback Fix Verification Tests
Tests the MASTER EXECUTION auth callback fix that ensures redirects stay on the same origin
where session cookies were written (preventing double-login bug).

CONTEXT:
- Root cause: callback was using getBaseUrl(request) which prefers NEXT_PUBLIC_BASE_URL
- When preview proxy host differs from NEXT_PUBLIC_BASE_URL, redirect crosses origins
- Cookies set during exchangeCodeForSession are dropped → user appears logged out
- FIX: callback now derives base from x-forwarded-proto/host headers (same-origin rule)

TESTS:
1. GET /auth/callback (no code) → 307 redirect to /login?error=missing_code on same origin
2. GET /auth/callback?code=invalid → 307 redirect to /login?error=oauth_failed on same origin
3. GET /auth/callback?code=...&next=//evil.com → open-redirect protection (no evil.com)
4. GET /auth/callback?code=...&next=/dashboard → redirect to /login on same origin
5. x-forwarded-host header honored (KEY TEST: Location uses request host, not env URL)
6. Smoke check: /api/profile + /login still work
"""

import requests
import sys
from urllib.parse import urlparse, parse_qs

# Base URL from environment
BASE_URL = "https://crew-dashboard-17.preview.emergentagent.com"

def test_callback_missing_code():
    """Test 1: GET /auth/callback (no code param) → 307 to /login?error=missing_code"""
    print("\n" + "="*80)
    print("TEST 1: GET /auth/callback (no code param)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/auth/callback"
        print(f"Request: GET {url}")
        
        response = requests.get(url, allow_redirects=False, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 307:
            print(f"❌ FAILED: Expected 307, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        location = response.headers.get("location") or response.headers.get("Location")
        if not location:
            print("❌ FAILED: No 'location' header in 307 response")
            return False
        
        print(f"Location: {location}")
        
        # Parse location
        parsed = urlparse(location)
        
        # Verify it starts with the request's origin (BASE_URL)
        expected_origin = urlparse(BASE_URL).netloc
        if parsed.netloc != expected_origin:
            print(f"❌ FAILED: Location origin {parsed.netloc} != request origin {expected_origin}")
            return False
        
        # Verify path is /login
        if parsed.path != "/login":
            print(f"❌ FAILED: Location path {parsed.path} != /login")
            return False
        
        # Verify error=missing_code query param
        query_params = parse_qs(parsed.query)
        if "error" not in query_params or query_params["error"][0] != "missing_code":
            print(f"❌ FAILED: Expected error=missing_code, got {query_params}")
            return False
        
        print("✅ PASSED: 307 redirect to /login?error=missing_code on same origin")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def test_callback_invalid_code():
    """Test 2: GET /auth/callback?code=invalid_code_xyz → 307 to /login?error=oauth_failed"""
    print("\n" + "="*80)
    print("TEST 2: GET /auth/callback?code=invalid_code_xyz")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/auth/callback?code=invalid_code_xyz"
        print(f"Request: GET {url}")
        
        response = requests.get(url, allow_redirects=False, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 307:
            print(f"❌ FAILED: Expected 307, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        location = response.headers.get("location") or response.headers.get("Location")
        if not location:
            print("❌ FAILED: No 'location' header in 307 response")
            return False
        
        print(f"Location: {location}")
        
        # Parse location
        parsed = urlparse(location)
        
        # Verify it starts with the request's origin
        expected_origin = urlparse(BASE_URL).netloc
        if parsed.netloc != expected_origin:
            print(f"❌ FAILED: Location origin {parsed.netloc} != request origin {expected_origin}")
            return False
        
        # Verify path is /login
        if parsed.path != "/login":
            print(f"❌ FAILED: Location path {parsed.path} != /login")
            return False
        
        # Verify error=oauth_failed query param
        query_params = parse_qs(parsed.query)
        if "error" not in query_params or query_params["error"][0] != "oauth_failed":
            print(f"❌ FAILED: Expected error=oauth_failed, got {query_params}")
            return False
        
        print("✅ PASSED: 307 redirect to /login?error=oauth_failed on same origin")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def test_callback_open_redirect_protection():
    """Test 3: GET /auth/callback?code=...&next=//evil.com → no evil.com in redirect"""
    print("\n" + "="*80)
    print("TEST 3: GET /auth/callback?code=invalid&next=//evil.com (open-redirect protection)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/auth/callback?code=invalid_code&next=//evil.com"
        print(f"Request: GET {url}")
        
        response = requests.get(url, allow_redirects=False, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 307:
            print(f"❌ FAILED: Expected 307, got {response.status_code}")
            return False
        
        location = response.headers.get("location") or response.headers.get("Location")
        if not location:
            print("❌ FAILED: No 'location' header in 307 response")
            return False
        
        print(f"Location: {location}")
        
        # Verify evil.com is NOT in the location
        if "evil.com" in location:
            print(f"❌ FAILED: Location contains 'evil.com' - open redirect vulnerability!")
            return False
        
        # Verify it redirects to same origin
        parsed = urlparse(location)
        expected_origin = urlparse(BASE_URL).netloc
        if parsed.netloc != expected_origin:
            print(f"❌ FAILED: Location origin {parsed.netloc} != request origin {expected_origin}")
            return False
        
        print("✅ PASSED: Open-redirect protection working, no evil.com in redirect")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def test_callback_next_dashboard():
    """Test 4: GET /auth/callback?code=invalid&next=/dashboard → redirect to /login on same origin"""
    print("\n" + "="*80)
    print("TEST 4: GET /auth/callback?code=invalid&next=/dashboard")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/auth/callback?code=invalid_code&next=/dashboard"
        print(f"Request: GET {url}")
        
        response = requests.get(url, allow_redirects=False, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 307:
            print(f"❌ FAILED: Expected 307, got {response.status_code}")
            return False
        
        location = response.headers.get("location") or response.headers.get("Location")
        if not location:
            print("❌ FAILED: No 'location' header in 307 response")
            return False
        
        print(f"Location: {location}")
        
        # Parse location
        parsed = urlparse(location)
        
        # Verify it redirects to same origin
        expected_origin = urlparse(BASE_URL).netloc
        if parsed.netloc != expected_origin:
            print(f"❌ FAILED: Location origin {parsed.netloc} != request origin {expected_origin}")
            return False
        
        # Since code is invalid, should redirect to /login with error
        if parsed.path != "/login":
            print(f"❌ FAILED: Location path {parsed.path} != /login")
            return False
        
        print("✅ PASSED: Redirect to /login on same origin (invalid code)")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def test_callback_forwarded_host_honored():
    """Test 5: x-forwarded-host header honored (KEY TEST for bug fix)"""
    print("\n" + "="*80)
    print("TEST 5: x-forwarded-host header honored (KEY BUG FIX TEST)")
    print("="*80)
    
    try:
        # Send request to localhost:3000 with x-forwarded-host header
        # This simulates the proxy scenario where the bug occurred
        url = "http://localhost:3000/auth/callback"
        custom_host = "some-other-host.example.com"
        headers = {
            "x-forwarded-host": custom_host,
            "x-forwarded-proto": "https"
        }
        
        print(f"Request: GET {url}")
        print(f"Headers: x-forwarded-host={custom_host}, x-forwarded-proto=https")
        
        response = requests.get(url, headers=headers, allow_redirects=False, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 307:
            print(f"❌ FAILED: Expected 307, got {response.status_code}")
            return False
        
        location = response.headers.get("location") or response.headers.get("Location")
        if not location:
            print("❌ FAILED: No 'location' header in 307 response")
            return False
        
        print(f"Location: {location}")
        
        # KEY TEST: Verify Location header uses the x-forwarded-host, NOT NEXT_PUBLIC_BASE_URL
        if custom_host not in location:
            print(f"❌ FAILED: Location does not contain x-forwarded-host '{custom_host}'")
            print(f"This means the callback is still using NEXT_PUBLIC_BASE_URL instead of request headers!")
            return False
        
        # Verify it starts with https:// (from x-forwarded-proto)
        if not location.startswith("https://"):
            print(f"❌ FAILED: Location does not start with https:// (x-forwarded-proto not honored)")
            return False
        
        # Verify the full origin matches
        expected_origin = f"https://{custom_host}"
        if not location.startswith(expected_origin):
            print(f"❌ FAILED: Location does not start with {expected_origin}")
            return False
        
        print(f"✅ PASSED: x-forwarded-host header honored! Location uses {custom_host}")
        print("This confirms the bug fix is working correctly.")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        print("Note: This test requires localhost:3000 to be accessible")
        return False


def test_smoke_profile():
    """Test 6a: Smoke check - GET /api/profile still works"""
    print("\n" + "="*80)
    print("TEST 6a: Smoke check - GET /api/profile")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/api/profile"
        print(f"Request: GET {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        if "signed_in" not in data or data["signed_in"] != False:
            print(f"❌ FAILED: Expected signed_in=false, got {data}")
            return False
        
        print("✅ PASSED: /api/profile returns 200 with signed_in=false")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def test_smoke_login():
    """Test 6b: Smoke check - GET /login still works"""
    print("\n" + "="*80)
    print("TEST 6b: Smoke check - GET /login")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/login"
        print(f"Request: GET {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        print("✅ PASSED: /login returns 200")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def main():
    """Run all auth callback tests"""
    print("="*80)
    print("AUTH CALLBACK FIX VERIFICATION TESTS")
    print("Testing MASTER EXECUTION auth callback same-origin redirect fix")
    print("="*80)
    
    results = []
    
    # Run all tests
    results.append(("Callback missing code", test_callback_missing_code()))
    results.append(("Callback invalid code", test_callback_invalid_code()))
    results.append(("Open-redirect protection", test_callback_open_redirect_protection()))
    results.append(("Callback next=/dashboard", test_callback_next_dashboard()))
    results.append(("x-forwarded-host honored (KEY TEST)", test_callback_forwarded_host_honored()))
    results.append(("Smoke: /api/profile", test_smoke_profile()))
    results.append(("Smoke: /login", test_smoke_login()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL AUTH CALLBACK TESTS PASSED!")
        print("\nKEY FINDING: The auth callback fix is working correctly.")
        print("- Redirects stay on the same origin where session cookies were written")
        print("- x-forwarded-host header is honored (prevents double-login bug)")
        print("- Open-redirect protection working")
        print("- Smoke tests confirm no regression")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
