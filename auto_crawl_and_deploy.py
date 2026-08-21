#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Auto Crawl & Deploy Script
Automatically crawl new movies and push to GitHub for instant deployment
"""

import subprocess
import sys
import os
import json
from datetime import datetime

def run_command(cmd, cwd="."):
    """Run shell command and return output"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def main():
    print("=" * 60)
    print("🎬 RoPhim Auto Crawl & Deploy System")
    print("=" * 60)
    
    # Step 1: Run crawler
    print("\n[1/5] 🕷️  Running movie crawler...")
    success, stdout, stderr = run_command("python auto_daily_crawler.py")
    
    if not success:
        print("❌ Crawler failed!")
        print(stderr)
        return False
    
    print("✅ Crawler completed!")
    
    # Step 2: Check movies.json
    print("\n[2/5] 📊 Checking movies.json...")
    try:
        with open("movies.json", "r", encoding="utf-8") as f:
            movies = json.load(f)
            total_movies = len(movies)
            print(f"✅ Found {total_movies} movies in database")
    except Exception as e:
        print(f"❌ Failed to read movies.json: {e}")
        return False
    
    # Step 3: Update cache version in app.js
    print("\n[3/5] 🔄 Updating cache version in app.js...")
    cache_version = datetime.now().strftime("%Y%m%d%H%M")
    
    try:
        with open("app.js", "r", encoding="utf-8") as f:
            content = f.read()
        
        # Replace cache version
        import re
        new_content = re.sub(
            r"const cacheVersion = '[^']+';",
            f"const cacheVersion = '{cache_version}';",
            content
        )
        
        with open("app.js", "w", encoding="utf-8") as f:
            f.write(new_content)
        
        print(f"✅ Cache version updated to: {cache_version}")
    except Exception as e:
        print(f"⚠️  Warning: Could not update cache version: {e}")
    
    # Step 4: Git add, commit, push
    print("\n[4/5] 📤 Pushing to GitHub...")
    
    # Add files
    success, stdout, stderr = run_command("git add movies.json app.js movie_changes_report.xlsx")
    if not success:
        print(f"❌ Git add failed: {stderr}")
        return False
    
    # Commit
    commit_msg = f"🎬 Auto update: {total_movies} movies | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    success, stdout, stderr = run_command(f'git commit -m "{commit_msg}"')
    
    if "nothing to commit" in stdout.lower() or "nothing to commit" in stderr.lower():
        print("ℹ️  No changes to commit - database is already up to date")
        return True
    
    if not success and "nothing to commit" not in stderr.lower():
        print(f"❌ Git commit failed: {stderr}")
        return False
    
    # Push
    success, stdout, stderr = run_command("git push origin main")
    if not success:
        print(f"❌ Git push failed: {stderr}")
        return False
    
    print("✅ Successfully pushed to GitHub!")
    
    # Step 5: Summary
    print("\n[5/5] ✨ Deployment Summary")
    print("=" * 60)
    print(f"📊 Total Movies: {total_movies}")
    print(f"🔄 Cache Version: {cache_version}")
    print(f"⏰ Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🚀 Status: DEPLOYED TO PRODUCTION")
    print("=" * 60)
    print("\n✅ All Done! Website will auto-update in ~1-2 minutes.")
    print("💡 Tip: Press Ctrl+F5 in browser to force refresh cache")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
