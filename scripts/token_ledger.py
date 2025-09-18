#!/usr/bin/env python3
"""
WMACS Token Ledger - Track AI token usage per deployment phase
Adapted from SDD Foundation for WMACS integration
"""
import json
import os
import sys
from datetime import datetime

LEDGER_DIR = ".agent"
LEDGER_FILE = f"{LEDGER_DIR}/wmacs_token_ledger.json"

def ensure_ledger_dir():
    """Create .agent directory if it doesn't exist"""
    os.makedirs(LEDGER_DIR, exist_ok=True)

def get_current_branch():
    """Get current git branch"""
    try:
        return os.popen("git branch --show-current").read().strip()
    except:
        return "unknown"

def get_commit_sha():
    """Get current git commit SHA"""
    try:
        return os.popen("git rev-parse HEAD").read().strip()[:8]
    except:
        return "unknown"

def log_token_usage(phase, prompt_tokens=0, completion_tokens=0, operation=""):
    """Log token usage for a specific WMACS phase"""
    ensure_ledger_dir()
    
    total_tokens = int(prompt_tokens) + int(completion_tokens)
    estimated_credits = total_tokens / 1000.0  # Rough conversion: 1000 tokens = 1 credit
    
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "phase": phase,  # build, deploy, test, rollback
        "operation": operation,  # specific operation within phase
        "branch": get_current_branch(),
        "commit_sha": get_commit_sha(),
        "prompt_tokens": int(prompt_tokens),
        "completion_tokens": int(completion_tokens),
        "total_tokens": total_tokens,
        "estimated_credits": round(estimated_credits, 3)
    }
    
    # Load existing data
    data = []
    if os.path.isfile(LEDGER_FILE):
        try:
            with open(LEDGER_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"Warning: Could not load existing ledger: {e}")
            data = []
    
    # Append new entry
    data.append(entry)
    
    # Write back to file
    try:
        with open(LEDGER_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"✅ WMACS Usage Logged: {phase} - {entry['total_tokens']} tokens (~{entry['estimated_credits']} credits)")
    except Exception as e:
        print(f"❌ Failed to log token usage: {e}")

def get_phase_usage(phase, branch=None):
    """Get token usage summary for a specific phase"""
    if not os.path.isfile(LEDGER_FILE):
        return {"total_tokens": 0, "operations": 0}
    
    try:
        with open(LEDGER_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except:
        return {"total_tokens": 0, "operations": 0}
    
    filtered_data = [
        entry for entry in data 
        if entry.get("phase") == phase and 
        (branch is None or entry.get("branch") == branch)
    ]
    
    total_tokens = sum(entry.get("total_tokens", 0) for entry in filtered_data)
    total_credits = sum(entry.get("estimated_credits", 0) for entry in filtered_data)
    operations = len(filtered_data)
    
    return {
        "total_tokens": total_tokens,
        "total_credits": round(total_credits, 3),
        "operations": operations,
        "entries": filtered_data
    }

def check_phase_budget(phase, budget_limit):
    """Check if current phase is within token budget"""
    current_branch = get_current_branch()
    usage = get_phase_usage(phase, current_branch)
    
    if usage["total_tokens"] > budget_limit:
        print(f"⚠️  WMACS Token Budget Exceeded:")
        print(f"   Phase: {phase}")
        print(f"   Used: {usage['total_tokens']} tokens")
        print(f"   Budget: {budget_limit} tokens")
        print(f"   Overage: {usage['total_tokens'] - budget_limit} tokens")
        return False
    
    remaining = budget_limit - usage["total_tokens"]
    print(f"✅ WMACS Token Budget OK: {remaining} tokens remaining for {phase}")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python token_ledger.py <command> [args]")
        print("Commands:")
        print("  log <phase> <prompt_tokens> <completion_tokens> [operation]")
        print("  check <phase> <budget_limit>")
        print("  summary [phase] [branch]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "log":
        if len(sys.argv) < 5:
            print("Usage: python token_ledger.py log <phase> <prompt_tokens> <completion_tokens> [operation]")
            sys.exit(1)
        
        phase = sys.argv[2]
        prompt_tokens = int(sys.argv[3])
        completion_tokens = int(sys.argv[4])
        operation = sys.argv[5] if len(sys.argv) > 5 else ""
        
        log_token_usage(phase, prompt_tokens, completion_tokens, operation)
    
    elif command == "check":
        if len(sys.argv) < 4:
            print("Usage: python token_ledger.py check <phase> <budget_limit>")
            sys.exit(1)
        
        phase = sys.argv[2]
        budget_limit = int(sys.argv[3])
        
        if not check_phase_budget(phase, budget_limit):
            sys.exit(1)
    
    elif command == "summary":
        phase = sys.argv[2] if len(sys.argv) > 2 else None
        branch = sys.argv[3] if len(sys.argv) > 3 else None
        
        if phase:
            usage = get_phase_usage(phase, branch)
            print(f"📊 WMACS Token Usage Summary - {phase}")
            print(f"   Total Tokens: {usage['total_tokens']}")
            print(f"   Operations: {usage['operations']}")
        else:
            # Show all phases
            phases = ["build", "deploy", "test", "rollback"]
            for p in phases:
                usage = get_phase_usage(p, branch)
                if usage["operations"] > 0:
                    print(f"📊 {p.upper()}: {usage['total_tokens']} tokens (~{usage['total_credits']} credits, {usage['operations']} ops)")
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
