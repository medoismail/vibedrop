#!/bin/bash
# Called by Claude Code hook when Claude starts thinking
curl -s -X POST http://localhost:3009/start > /dev/null 2>&1 &
