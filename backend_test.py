#!/usr/bin/env python3
"""
Backend API Tests for Mugtee V1.1
Tests sponsor endpoints and profile endpoint after migrations 0009 + 0010
"""

import requests
import json
import sys

# Base URL from environment
BASE_URL = "https://crew-dashboard-17.preview.emergentagent.com"

# All sponsor slugs from lib/sponsors.ts
SPONSOR_SLUGS = ["elevenlabs", "capcut", "descript", "notion", "adobe_express"]

def test_profile_unauthenticated():
    """Test 1: GET /api/profile (unauthenticated)"""
    print("\n" + "="*80)
    print("TEST 1: GET /api/profile (unauthenticated)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/api/profile"
        print(f"Request: GET {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Verify required fields
        required_fields = {
            "signed_in": False,
            "plan_type": "FREE",
            "is_unlimited": False,
            "is_trial_active": False,
            "trial_days_left": 0
        }
        
        for field, expected_value in required_fields.items():
            if field not in data:
                print(f"❌ FAILED: Missing field '{field}' in response")
                return False
            if data[field] != expected_value:
                print(f"❌ FAILED: Field '{field}' = {data[field]}, expected {expected_value}")
                return False
        
        print("✅ PASSED: All fields present and correct")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def test_sponsor_unknown():
    """Test 2: GET /api/sponsor/unknownsponsor (expect 404)"""
    print("\n" + "="*80)
    print("TEST 2: GET /api/sponsor/unknownsponsor (expect 404)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/api/sponsor/unknownsponsor"
        print(f"Request: GET {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 404:
            print(f"❌ FAILED: Expected 404, got {response.status_code}")
            return False
        
        data = response.json()
        if "error" not in data or data["error"] != "Unknown sponsor":
            print(f"❌ FAILED: Expected error message 'Unknown sponsor', got {data}")
            return False
        
        print("✅ PASSED: Correct 404 response with error message")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def test_sponsor_check_elevenlabs():
    """Test 3: GET /api/sponsor/elevenlabs?check=1 (unauthenticated, no DB insert)"""
    print("\n" + "="*80)
    print("TEST 3: GET /api/sponsor/elevenlabs?check=1 (unauthenticated)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/api/sponsor/elevenlabs?check=1"
        print(f"Request: GET {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Verify required fields
        required_checks = [
            ("ok", True),
            ("authenticated", False),
            ("eligible", False),
            ("already_claimed_today", False),
        ]
        
        for field, expected_value in required_checks:
            if field not in data:
                print(f"❌ FAILED: Missing field '{field}' in response")
                return False
            if data[field] != expected_value:
                print(f"❌ FAILED: Field '{field}' = {data[field]}, expected {expected_value}")
                return False
        
        # Verify sponsor object
        if "sponsor" not in data:
            print("❌ FAILED: Missing 'sponsor' object in response")
            return False
        
        sponsor = data["sponsor"]
        if sponsor.get("slug") != "elevenlabs":
            print(f"❌ FAILED: sponsor.slug = {sponsor.get('slug')}, expected 'elevenlabs'")
            return False
        
        if "name" not in sponsor or "reward" not in sponsor:
            print(f"❌ FAILED: sponsor object missing 'name' or 'reward' field")
            return False
        
        if not isinstance(sponsor["reward"], (int, float)):
            print(f"❌ FAILED: sponsor.reward is not a number: {sponsor['reward']}")
            return False
        
        print("✅ PASSED: All fields present and correct, no DB insert expected")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def test_sponsor_redirect_elevenlabs():
    """Test 4: GET /api/sponsor/elevenlabs (no ?check, expect 302 redirect)"""
    print("\n" + "="*80)
    print("TEST 4: GET /api/sponsor/elevenlabs (expect 302 redirect)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/api/sponsor/elevenlabs"
        print(f"Request: GET {url} (allow_redirects=False)")
        
        response = requests.get(url, allow_redirects=False, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code != 302:
            print(f"❌ FAILED: Expected 302, got {response.status_code}")
            return False
        
        location = response.headers.get("location") or response.headers.get("Location")
        if not location:
            print("❌ FAILED: No 'location' header in 302 response")
            return False
        
        # Expected URL from lib/sponsors.ts: https://elevenlabs.io/?from=mugtee
        expected_url = "https://elevenlabs.io/?from=mugtee"
        if location != expected_url:
            print(f"❌ FAILED: location = {location}, expected {expected_url}")
            return False
        
        print(f"✅ PASSED: 302 redirect to {location}")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        return False


def test_all_sponsors_check():
    """Test 5: GET /api/sponsor/<slug>?check=1 for all sponsors"""
    print("\n" + "="*80)
    print("TEST 5: GET /api/sponsor/<slug>?check=1 for all sponsors")
    print("="*80)
    
    all_passed = True
    
    for slug in SPONSOR_SLUGS:
        print(f"\n--- Testing sponsor: {slug} ---")
        try:
            url = f"{BASE_URL}/api/sponsor/{slug}?check=1"
            print(f"Request: GET {url}")
            
            response = requests.get(url, timeout=10)
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ FAILED: Expected 200, got {response.status_code}")
                print(f"Response: {response.text}")
                all_passed = False
                continue
            
            data = response.json()
            
            # Verify basic structure
            if not data.get("ok"):
                print(f"❌ FAILED: ok field is not true")
                all_passed = False
                continue
            
            if "sponsor" not in data:
                print(f"❌ FAILED: Missing 'sponsor' object")
                all_passed = False
                continue
            
            sponsor = data["sponsor"]
            if sponsor.get("slug") != slug:
                print(f"❌ FAILED: sponsor.slug = {sponsor.get('slug')}, expected '{slug}'")
                all_passed = False
                continue
            
            print(f"✅ PASSED: {slug} - {sponsor.get('name')} (reward: {sponsor.get('reward')})")
            
        except Exception as e:
            print(f"❌ FAILED: Exception - {str(e)}")
            all_passed = False
    
    if all_passed:
        print("\n✅ ALL SPONSORS PASSED")
    else:
        print("\n❌ SOME SPONSORS FAILED")
    
    return all_passed


def main():
    """Run all tests"""
    print("="*80)
    print("MUGTEE V1.1 BACKEND API TESTS")
    print("Testing after migrations 0009 (sponsor_clicks) + 0010 (profiles)")
    print("="*80)
    
    results = []
    
    # Run all tests
    results.append(("Profile unauthenticated", test_profile_unauthenticated()))
    results.append(("Sponsor unknown (404)", test_sponsor_unknown()))
    results.append(("Sponsor check elevenlabs", test_sponsor_check_elevenlabs()))
    results.append(("Sponsor redirect elevenlabs", test_sponsor_redirect_elevenlabs()))
    results.append(("All sponsors check", test_all_sponsors_check()))
    
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
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
