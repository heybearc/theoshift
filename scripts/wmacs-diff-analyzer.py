#!/usr/bin/env python3
"""
WMACS Diff-Scoped Analyzer - Only analyze changed files for token efficiency
"""
import json
import os
import sys
import subprocess
from pathlib import Path

def get_git_diff_files(base_branch="main"):
    """Get list of files changed compared to base branch"""
    try:
        cmd = f"git diff --name-only {base_branch}..HEAD"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            files = [f.strip() for f in result.stdout.split('\n') if f.strip()]
            return files
        else:
            print(f"Warning: Could not get git diff: {result.stderr}")
            return []
    except Exception as e:
        print(f"Error getting git diff: {e}")
        return []

def get_staged_files():
    """Get list of staged files"""
    try:
        cmd = "git diff --cached --name-only"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            files = [f.strip() for f in result.stdout.split('\n') if f.strip()]
            return files
        else:
            return []
    except Exception as e:
        print(f"Error getting staged files: {e}")
        return []

def filter_relevant_files(files, extensions=None):
    """Filter files by relevant extensions for AI analysis"""
    if extensions is None:
        extensions = ['.js', '.ts', '.tsx', '.jsx', '.py', '.json', '.yml', '.yaml', '.md']
    
    relevant_files = []
    for file in files:
        if any(file.endswith(ext) for ext in extensions):
            if os.path.exists(file):
                relevant_files.append(file)
    
    return relevant_files

def generate_diff_context(files, max_files=10):
    """Generate focused context for AI analysis"""
    if len(files) > max_files:
        print(f"⚠️  Too many changed files ({len(files)}), limiting to {max_files} most important")
        # Prioritize certain file types
        priority_files = [f for f in files if any(f.endswith(ext) for ext in ['.ts', '.tsx', '.js', '.jsx'])]
        files = priority_files[:max_files] if priority_files else files[:max_files]
    
    context = {
        "changed_files": files,
        "file_count": len(files),
        "analysis_scope": "diff-only",
        "timestamp": subprocess.run("date -u +%Y-%m-%dT%H:%M:%SZ", shell=True, capture_output=True, text=True).stdout.strip()
    }
    
    return context

def save_diff_context(context, output_file=".agent/wmacs_diff_context.json"):
    """Save diff context for AI consumption"""
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    try:
        with open(output_file, 'w') as f:
            json.dump(context, f, indent=2)
        print(f"✅ Diff context saved: {output_file}")
        print(f"📁 Files to analyze: {context['file_count']}")
        for file in context['changed_files']:
            print(f"   - {file}")
    except Exception as e:
        print(f"❌ Failed to save diff context: {e}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python wmacs-diff-analyzer.py <command> [args]")
        print("Commands:")
        print("  analyze [base_branch] - Analyze changed files vs base branch")
        print("  staged - Analyze staged files only")
        print("  auth-fix - Focus on authentication-related files")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "analyze":
        base_branch = sys.argv[2] if len(sys.argv) > 2 else "main"
        files = get_git_diff_files(base_branch)
        relevant_files = filter_relevant_files(files)
        context = generate_diff_context(relevant_files)
        save_diff_context(context)
    
    elif command == "staged":
        files = get_staged_files()
        relevant_files = filter_relevant_files(files)
        context = generate_diff_context(relevant_files)
        save_diff_context(context)
    
    elif command == "auth-fix":
        # Focus specifically on authentication-related files
        auth_patterns = [
            "app/api/auth/",
            "app/utils/auth",
            "middleware",
            "components/auth",
            "pages/login",
            "pages/dashboard"
        ]
        
        all_files = get_git_diff_files("main")
        auth_files = [f for f in all_files if any(pattern in f for pattern in auth_patterns)]
        
        if not auth_files:
            print("No authentication-related files found in diff")
            # Fallback to known auth files that might need fixing
            potential_auth_files = [
                "app/api/auth/login/route.ts",
                "app/api/auth/logout/route.ts", 
                "app/api/auth/verify/route.ts",
                "app/utils/auth.ts",
                "middleware.ts"
            ]
            auth_files = [f for f in potential_auth_files if os.path.exists(f)]
        
        context = generate_diff_context(auth_files, max_files=15)
        context["analysis_focus"] = "authentication_imports"
        save_diff_context(context, ".agent/wmacs_auth_context.json")
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()
