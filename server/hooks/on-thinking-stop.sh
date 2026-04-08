#!/bin/bash
# Called by Claude Code hook when Claude finishes thinking
curl -s -X POST http://localhost:3009/stop > /dev/null 2>&1 &
