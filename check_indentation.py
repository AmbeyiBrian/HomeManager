import sys

def check_indentation(file_path):
    """Check a Python file for indentation issues."""
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines):
        line_num = i + 1
        # Check for mixed tabs and spaces
        if '\t' in line and ' ' in line.lstrip(' \t'):
            print(f"Line {line_num}: Mixed tabs and spaces")
        
        # Check for tabs (which can cause issues)
        if '\t' in line:
            print(f"Line {line_num}: Contains tabs")
        
        # Print the line with indentation visible
        indent = len(line) - len(line.lstrip())
        if indent > 0:
            print(f"Line {line_num}: Indentation: {indent} spaces")
            print(f"  {line.rstrip()}")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python check_indentation.py <file_path>")
        sys.exit(1)
    
    check_indentation(sys.argv[1])
