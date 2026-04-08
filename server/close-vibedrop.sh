#!/bin/bash
# Close the VibeDrop tab in Chrome and return to calling app
rm -f /tmp/vibedrop-open
osascript -e '
tell application "Google Chrome"
    repeat with w in windows
        set tabCount to count of tabs of w
        repeat with i from tabCount to 1 by -1
            if URL of tab i of w contains "vibedrop.pro" then
                delete tab i of w
            end if
        end repeat
    end repeat
end tell' 2>/dev/null
