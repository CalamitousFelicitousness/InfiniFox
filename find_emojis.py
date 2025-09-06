#!/usr/bin/env python3
import os
import re
from pathlib import Path


def is_emoji(char):
    """Check if a character is an emoji"""
    code = ord(char)
    return (
        # Emoticons
        (0x1F600 <= code <= 0x1F64F)
        or
        # Miscellaneous Symbols and Pictographs
        (0x1F300 <= code <= 0x1F5FF)
        or
        # Transport and Map Symbols
        (0x1F680 <= code <= 0x1F6FF)
        or
        # Miscellaneous Symbols
        (0x2600 <= code <= 0x26FF)
        or
        # Dingbats
        (0x2700 <= code <= 0x27BF)
        or
        # Supplemental Symbols and Pictographs
        (0x1F900 <= code <= 0x1F9FF)
        or
        # Symbols and Pictographs Extended-A
        (0x1FA70 <= code <= 0x1FAFF)
        or
        # Additional emoticons
        (0x1F000 <= code <= 0x1F02F)
        or
        # Various symbols that are commonly used as emoji
        (
            code
            in [
                0x2764,
                0x2665,
                0x2666,
                0x2660,
                0x2663,
                0x2668,
                0x267F,
                0x2693,
                0x26A0,
                0x26A1,
                0x26AA,
                0x26AB,
                0x26BD,
                0x26BE,
                0x26C4,
                0x26C5,
                0x26CE,
                0x26D4,
                0x26EA,
                0x26F2,
                0x26F3,
                0x26F5,
                0x26FA,
                0x26FD,
                0x2705,
                0x270A,
                0x270B,
                0x2728,
                0x274C,
                0x274E,
                0x2753,
                0x2754,
                0x2755,
                0x2757,
                0x2795,
                0x2796,
                0x2797,
                0x27B0,
                0x27BF,
            ]
        )
        or
        # Arrows that might be used as emoji
        (0x2190 <= code <= 0x21FF)
        or
        # Mathematical operators that might be emoji
        (code in [0x2716, 0x2714, 0x2611, 0x2B50])
    )


def is_in_console_log(line, col_position):
    """Check if the emoji at col_position is within a console.log statement"""
    # Look for console.log/warn/error/info/debug patterns
    console_pattern = r"console\s*\.\s*(log|warn|error|info|debug)\s*\("

    # Find all console.log positions in the line
    for match in re.finditer(console_pattern, line):
        start = match.end()

        # Simple bracket counting to find the end of console.log
        paren_count = 1
        pos = start
        in_string = False
        string_char = None
        escaped = False

        while pos < len(line) and paren_count > 0:
            char = line[pos]

            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif not in_string and char in ['"', "'", "`"]:
                in_string = True
                string_char = char
            elif in_string and char == string_char:
                in_string = False
                string_char = None
            elif not in_string:
                if char == "(":
                    paren_count += 1
                elif char == ")":
                    paren_count -= 1

            pos += 1

        # Check if emoji position is within this console.log range
        if match.start() <= col_position <= pos:
            return True

    return False


def find_emojis_in_file(filepath):
    """Find all emojis in a file and return their locations"""
    emojis_found = []

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            lines = content.split("\n")

            for line_num, line in enumerate(lines, 1):
                # Skip comments
                if line.strip().startswith("//") or line.strip().startswith("#"):
                    continue

                for col_num, char in enumerate(line, 1):
                    if is_emoji(char):
                        # Check if emoji is in console.log
                        if is_in_console_log(line, col_num - 1):  # col_num is 1-indexed
                            continue

                        # Get context (surrounding 30 chars)
                        start = max(0, col_num - 20)
                        end = min(len(line), col_num + 20)
                        context = line[start:end].strip()

                        emojis_found.append(
                            {"line": line_num, "column": col_num, "emoji": char, "context": context}
                        )
    except Exception as e:
        pass  # Skip files that can't be read

    return emojis_found


def scan_directory(root_dir):
    """Scan directory for files containing emojis"""
    root_path = Path(root_dir)

    # File extensions to check
    extensions = [".js", ".jsx", ".ts", ".tsx", ".css", ".scss", ".json"]

    # Directories to skip
    skip_dirs = {"node_modules", ".git", "dist", "build", ".next", "coverage", "__pycache__"}

    results = {}
    total_emojis = 0

    for file_path in root_path.rglob("*"):
        # Skip directories
        if file_path.is_dir():
            continue

        # Skip if in excluded directory
        if any(skip_dir in file_path.parts for skip_dir in skip_dirs):
            continue

        # Check if file has relevant extension
        if file_path.suffix not in extensions:
            continue

        emojis = find_emojis_in_file(file_path)

        if emojis:
            relative_path = file_path.relative_to(root_path)
            results[str(relative_path)] = emojis
            total_emojis += len(emojis)

    return results, total_emojis


def main():
    # Get current directory
    current_dir = os.getcwd()

    print(f"Scanning for emojis in: {current_dir}")
    print("(Excluding emojis in console.log statements)")
    print("=" * 60)

    results, total = scan_directory(current_dir)

    if not results:
        print("No emojis found in the project files (outside of console.log)!")
    else:
        print(f"Found {total} emoji(s) in {len(results)} file(s):\n")

        for filepath, emojis in sorted(results.items()):
            print(f"\n📁 {filepath}")
            print("-" * 40)

            for emoji_info in emojis:
                print(
                    f"  Line {emoji_info['line']}, Col {emoji_info['column']}: {repr(emoji_info['emoji'])}"
                )
                print(f"    Context: ...{emoji_info['context']}...")

    print("\n" + "=" * 60)
    print(f"Summary: {total} emoji(s) found in {len(results)} file(s)")
    print("(Emojis in console.log statements were filtered out)")


if __name__ == "__main__":
    main()
