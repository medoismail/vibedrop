#!/bin/bash
# Open VibeDrop in Chrome — reuses existing tab if found, otherwise opens new one.
# Used by Claude Code hooks on macOS.
osascript -e '
tell application "Google Chrome"
    activate
    set found to false
    repeat with w in windows
        set tabIndex to 0
        repeat with t in tabs of w
            set tabIndex to tabIndex + 1
            if URL of t contains "vibedrop.pro" then
                set active tab index of w to tabIndex
                set found to true
                exit repeat
            end if
        end repeat
        if found then exit repeat
    end repeat
    if not found then
        open location "https://www.vibedrop.pro/app"
    end if
end tell' 2>/dev/null
