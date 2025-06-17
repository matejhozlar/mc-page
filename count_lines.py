import os

EXTENSIONS = {'.js', '.jsx', '.json', '.py', '.css', '.md', '.txt'}

EXCLUDE_DIRS = {'node_modules', '__pycache__'}

def count_lines_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            return sum(1 for _ in f)
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return 0

def walk_and_count(root_dir):
    total_lines = 0
    total_files = 0
    stats = {ext: {'lines': 0, 'files': 0} for ext in EXTENSIONS}

    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]

        for filename in filenames:
            _, ext = os.path.splitext(filename)
            if ext in EXTENSIONS:
                full_path = os.path.join(dirpath, filename)
                line_count = count_lines_in_file(full_path)
                stats[ext]['lines'] += line_count
                stats[ext]['files'] += 1
                total_lines += line_count
                total_files += 1

    return total_lines, total_files, stats

if __name__ == '__main__':
    project_root = os.path.dirname(os.path.abspath(__file__))
    total_lines, total_files, breakdown = walk_and_count(project_root)

    print(f"\nTotal lines of code: {total_lines}")
    print(f"Total files counted: {total_files}")
    print("\nBreakdown by extension:")
    for ext, data in sorted(breakdown.items()):
        print(f"  {ext}: {data['files']} files, {data['lines']} lines")
